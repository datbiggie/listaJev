import {
  ClientProduct,
  IAiMatcherService,
  IProductRepository,
  MappingRecord,
  MappingStatus,
  ProductMatchResult
} from "./types";
import { AppConfig } from "./config";
import { mapConcurrent } from "./concurrency";

/**
 * Orquestador del pipeline de conciliación asíncrona de catálogos (Fase 1).
 */
export class CatalogReconciliationWorker {
  constructor(
    private readonly repository: IProductRepository,
    private readonly aiMatcher: IAiMatcherService,
    private readonly config: AppConfig
  ) {}

  /**
   * Ejecuta un lote de conciliación procesando productos pendientes de forma concurrente acotada.
   */
  public async runBatch(): Promise<{ processed: number; resolved: number }> {
    const unmappedProducts = await this.repository.getUnmappedClientProducts(
      this.config.BATCH_SIZE
    );

    if (unmappedProducts.length === 0) {
      return { processed: 0, resolved: 0 };
    }

    let resolvedCount = 0;

    await mapConcurrent(
      unmappedProducts,
      this.config.MAX_CONCURRENCY,
      async (clientProduct: ClientProduct) => {
        const wasResolved = await this.processProduct(clientProduct);
        if (wasResolved) {
          resolvedCount++;
        }
      }
    );

    return { processed: unmappedProducts.length, resolved: resolvedCount };
  }

  /**
   * Procesa un producto individualmente a través de bloqueo léxico pg_trgm e inferencia con Jev.
   */
  private async processProduct(product: ClientProduct): Promise<boolean> {
    const candidates = await this.repository.findSupplierCandidates(
      product.name,
      this.config.PG_TRGM_THRESHOLD,
      3,
      product.normalizedSku
    );

    // Caso Huérfano: 0 candidatos superaron el umbral léxico
    if (candidates.length === 0) {
      const orphanMapping: MappingRecord = {
        clientSku: product.sku,
        supplierSku: null,
        confidenceScore: 0.0,
        status: "REJECTED",
        discrepancyReason: "NO_CANDIDATES_FOUND"
      };
      await this.repository.saveMapping(orphanMapping);
      return false;
    }

    let matched = false;

    for (const candidate of candidates) {
      try {
        let evaluation: ProductMatchResult;

        if (
          product.sku.trim().toUpperCase() === candidate.sku.trim().toUpperCase() ||
          (Boolean(product.normalizedSku) && product.normalizedSku === candidate.normalizedSku)
        ) {
          evaluation = {
            isMatch: true,
            confidenceScore: 1.0,
            matchType: "EXACT_CODE",
            discrepancyReason: "NONE"
          };
        } else {
          try {
            evaluation = await this.aiMatcher.evaluateMatch(product, candidate);
          } catch (aiError) {
            // Fail-Safe / Degradacion Agraciada:
            // Si la inferencia de IA no esta disponible, pero la similitud lexica del
            // candidato alcanza el umbral de revision, se preserva para auditoria humana.
            if (candidate.similarityScore >= this.config.REVIEW_MATCH_THRESHOLD) {
              evaluation = {
                isMatch: true,
                confidenceScore: candidate.similarityScore,
                matchType: "EQUIVALENT_VARIANT",
                discrepancyReason: "SPECIFICATION_MISMATCH"
              };
            } else {
              throw aiError;
            }
          }
        }

        if (!evaluation.isMatch) {
          continue;
        }

        const status: MappingStatus =
          evaluation.confidenceScore >= this.config.CONFIRMED_MATCH_THRESHOLD
            ? "CONFIRMED"
            : evaluation.confidenceScore >= this.config.REVIEW_MATCH_THRESHOLD
              ? "REQUIRES_REVIEW"
              : "REJECTED";

        if (status === "REJECTED") {
          continue;
        }

        const mapping: MappingRecord = {
          clientSku: product.sku,
          supplierSku: candidate.sku,
          confidenceScore: evaluation.confidenceScore,
          status,
          discrepancyReason: evaluation.discrepancyReason
        };

        await this.repository.saveMapping(mapping);
        matched = true;
        break;
      } catch (error) {
        process.stderr.write(
          `Error en inferencia para ${product.sku} vs ${candidate.sku}: ${(error as Error).message}\n`
        );
      }
    }

    // Si ningún candidato fue confirmado o puesto en revisión, se persiste como REJECTED
    if (!matched) {
      const rejectedMapping: MappingRecord = {
        clientSku: product.sku,
        supplierSku: null,
        confidenceScore: 0.0,
        status: "REJECTED",
        discrepancyReason: "NO_CANDIDATES_FOUND"
      };
      await this.repository.saveMapping(rejectedMapping);
    }

    return matched;
  }
}
