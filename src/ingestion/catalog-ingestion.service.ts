import {
  CatalogTarget,
  ICatalogIngestionService,
  IngestionSummary,
  IPdfExtractor,
  IProductRepository
} from "../types";
import { normalizeSku, sanitizeProductName } from "../sku-normalizer";

/**
 * Servicio de orquestación para la ingesta y extracción de catálogos en PDF.
 */
export class CatalogIngestionService implements ICatalogIngestionService {
  constructor(
    private readonly extractor: IPdfExtractor,
    private readonly repository: IProductRepository
  ) {}

  public async processCatalogPdf(
    buffer: ArrayBuffer,
    target: CatalogTarget
  ): Promise<IngestionSummary> {
    const startTime = performance.now();

    const { items, totalPages } = await this.extractor.extractItems(buffer);

    let discardedCount = 0;

    if (target === "CLIENT") {
      const clientMap = new Map<string, { sku: string; normalizedSku: string; name: string }>();

      for (const item of items) {
        const normalizedSku = normalizeSku(item.rawSku);
        const sanitizedName = sanitizeProductName(item.rawName);

        if (!normalizedSku || !sanitizedName) {
          discardedCount++;
          continue;
        }

        const rawSku = item.rawSku.trim();
        clientMap.set(rawSku, {
          sku: rawSku,
          normalizedSku,
          name: sanitizedName
        });
      }

      const clientItems = Array.from(clientMap.values());
      const persistedCount = await this.repository.bulkUpsertClientProducts(clientItems);
      const executionTimeMs = Math.round(performance.now() - startTime);

      return {
        target,
        totalPages,
        extractedCount: items.length,
        persistedCount,
        discardedCount,
        executionTimeMs
      };
    } else {
      const supplierMap = new Map<
        string,
        { sku: string; normalizedSku: string; name: string; currentStock: number }
      >();

      for (const item of items) {
        const normalizedSku = normalizeSku(item.rawSku);
        const sanitizedName = sanitizeProductName(item.rawName);

        if (!normalizedSku || !sanitizedName) {
          discardedCount++;
          continue;
        }

        const rawSku = item.rawSku.trim();
        supplierMap.set(rawSku, {
          sku: rawSku,
          normalizedSku,
          name: sanitizedName,
          currentStock: Math.max(0, item.stock ?? 0)
        });
      }

      const supplierItems = Array.from(supplierMap.values());
      const persistedCount = await this.repository.bulkUpsertSupplierProducts(supplierItems);
      const executionTimeMs = Math.round(performance.now() - startTime);

      return {
        target,
        totalPages,
        extractedCount: items.length,
        persistedCount,
        discardedCount,
        executionTimeMs
      };
    }
  }
}
