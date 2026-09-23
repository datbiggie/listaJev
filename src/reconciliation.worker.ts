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
import {
  brandsAreCompatible,
  extractSkuRoot,
  getCompatibleBrandTokens
} from "./sku-normalizer";

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
    const { rootSku } = extractSkuRoot(product.sku);
    const compatibleBrands = getCompatibleBrandTokens(product.brand);
    const rejectedSkus = this.repository.getRejectedSupplierSkus
      ? await this.repository.getRejectedSupplierSkus(product.sku)
      : [];

    const candidates = await this.repository.findSupplierCandidates(
      product.name,
      this.config.PG_TRGM_THRESHOLD,
      5,
      product.normalizedSku,
      product.brand,
      rootSku,
      rejectedSkus,
      compatibleBrands
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

    let bestConfirmedMapping: MappingRecord | null = null;
    let bestReviewMapping: MappingRecord | null = null;

    for (const candidate of candidates) {
      try {
        let evaluation: ProductMatchResult;

        const isExactSku =
          product.sku.trim().toUpperCase() === candidate.sku.trim().toUpperCase() ||
          (Boolean(product.normalizedSku) && product.normalizedSku === candidate.normalizedSku);

        const candidateDecomp = extractSkuRoot(candidate.sku);
        const isRootSkuMatch =
          !isExactSku &&
          rootSku.length >= 3 &&
          (rootSku === candidateDecomp.rootSku ||
            candidate.normalizedSku.startsWith(rootSku) ||
            product.normalizedSku.startsWith(candidateDecomp.rootSku) ||
            (candidateDecomp.baseCode.length >= 3 && candidateDecomp.baseCode === rootSku));

        const brandsConflict =
          Boolean(product.brand) &&
          Boolean(candidate.brand) &&
          !brandsAreCompatible(product.brand, candidate.brand);

        if (isExactSku) {
          if (brandsConflict) {
            evaluation = {
              isMatch: true,
              confidenceScore: 0.75,
              matchType: "EQUIVALENT_VARIANT",
              discrepancyReason: "BRAND_MISMATCH"
            };
          } else {
            evaluation = {
              isMatch: true,
              confidenceScore: 1.0,
              matchType: "EXACT_CODE",
              discrepancyReason: "NONE"
            };
          }
        } else if (isRootSkuMatch) {
          if (brandsConflict) {
            evaluation = {
              isMatch: false,
              confidenceScore: 0.30,
              matchType: "DIFFERENT_PRODUCT",
              discrepancyReason: "BRAND_MISMATCH"
            };
          } else {
            evaluation = {
              isMatch: true,
              confidenceScore: 0.95,
              matchType: "EQUIVALENT_VARIANT",
              discrepancyReason: "NONE"
            };
          }
        } else {
          try {
            evaluation = await this.aiMatcher.evaluateMatch(product, candidate);
          } catch (aiError) {
            if (candidate.similarityScore >= this.config.REVIEW_MATCH_THRESHOLD) {
              evaluation = {
                isMatch: !brandsConflict,
                confidenceScore: candidate.similarityScore,
                matchType: "EQUIVALENT_VARIANT",
                discrepancyReason: brandsConflict ? "BRAND_MISMATCH" : "SPECIFICATION_MISMATCH"
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

        if (status === "CONFIRMED") {
          bestConfirmedMapping = {
            clientSku: product.sku,
            supplierSku: candidate.sku,
            confidenceScore: evaluation.confidenceScore,
            status: "CONFIRMED",
            discrepancyReason: evaluation.discrepancyReason
          };
          break;
        }

        if (status === "REQUIRES_REVIEW") {
          if (
            !bestReviewMapping ||
            evaluation.confidenceScore > bestReviewMapping.confidenceScore
          ) {
            bestReviewMapping = {
              clientSku: product.sku,
              supplierSku: candidate.sku,
              confidenceScore: evaluation.confidenceScore,
              status: "REQUIRES_REVIEW",
              discrepancyReason: evaluation.discrepancyReason
            };
          }
        }
      } catch (error) {
        process.stderr.write(
          `Error en inferencia para ${product.sku} vs ${candidate.sku}: ${(error as Error).message}\n`
        );
      }
    }

    const winningMapping = bestConfirmedMapping ?? bestReviewMapping;

    if (winningMapping) {
      await this.repository.saveMapping(winningMapping);
      return true;
    }

    // Si ningún candidato fue confirmado o puesto en revisión, se persiste como REJECTED
    const rejectedMapping: MappingRecord = {
      clientSku: product.sku,
      supplierSku: null,
      confidenceScore: 0.0,
      status: "REJECTED",
      discrepancyReason: "NO_CANDIDATES_FOUND"
    };
    await this.repository.saveMapping(rejectedMapping);
    return false;
  }
}
