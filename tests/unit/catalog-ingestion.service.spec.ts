import { describe, it, expect, vi, beforeEach } from "vitest";
import { CatalogIngestionService } from "../../src/ingestion/catalog-ingestion.service.js";
import { IPdfExtractor, IProductRepository, ExtractedCatalogItem } from "../../src/types.js";

describe("SPEC-INGEST-PDF-010: CatalogIngestionService", () => {
  let mockExtractor: IPdfExtractor;
  let mockRepo: IProductRepository;
  let service: CatalogIngestionService;

  beforeEach(() => {
    mockExtractor = {
      extractItems: vi.fn()
    };

    mockRepo = {
      getUnmappedClientProducts: vi.fn(),
      findSupplierCandidates: vi.fn(),
      saveMapping: vi.fn(),
      getPendingReviews: vi.fn(),
      resolveAuditReview: vi.fn(),
      bulkUpsertClientProducts: vi.fn(),
      bulkUpsertSupplierProducts: vi.fn()
    };

    service = new CatalogIngestionService(mockExtractor, mockRepo);
  });

  it("procesa catálogo CLIENT sanitizando y persistiendo mediante bulkUpsertClientProducts", async () => {
    const rawItems: ExtractedCatalogItem[] = [
      { rawSku: "prod-100", rawName: "  Tornillo   Hexagonal 1/2  ", stock: 0 },
      { rawSku: "prod_200", rawName: "Tuerca M10", stock: 5 },
      { rawSku: "   ", rawName: "Item inválido", stock: 0 } // Descarte por SKU no normalizable
    ];

    vi.mocked(mockExtractor.extractItems).mockResolvedValueOnce({
      items: rawItems,
      totalPages: 3
    });

    vi.mocked(mockRepo.bulkUpsertClientProducts).mockResolvedValueOnce(2);

    const dummyBuffer = new ArrayBuffer(10);
    const summary = await service.processCatalogPdf(dummyBuffer, "CLIENT");

    expect(summary.target).toBe("CLIENT");
    expect(summary.totalPages).toBe(3);
    expect(summary.extractedCount).toBe(3);
    expect(summary.persistedCount).toBe(2);
    expect(summary.discardedCount).toBe(1);
    expect(summary.executionTimeMs).toBeGreaterThanOrEqual(0);

    expect(mockRepo.bulkUpsertClientProducts).toHaveBeenCalledWith([
      { sku: "prod-100", normalizedSku: "PROD100", name: "Tornillo Hexagonal 1/2" },
      { sku: "prod_200", normalizedSku: "PROD200", name: "Tuerca M10" }
    ]);
  });

  it("procesa catálogo SUPPLIER y preserva el stock persistiendo en bulkUpsertSupplierProducts", async () => {
    const rawItems: ExtractedCatalogItem[] = [
      { rawSku: "SUP-001", rawName: "Filtro de Aceite", stock: 42 }
    ];

    vi.mocked(mockExtractor.extractItems).mockResolvedValueOnce({
      items: rawItems,
      totalPages: 1
    });

    vi.mocked(mockRepo.bulkUpsertSupplierProducts).mockResolvedValueOnce(1);

    const dummyBuffer = new ArrayBuffer(10);
    const summary = await service.processCatalogPdf(dummyBuffer, "SUPPLIER");

    expect(summary.target).toBe("SUPPLIER");
    expect(summary.persistedCount).toBe(1);
    expect(summary.discardedCount).toBe(0);

    expect(mockRepo.bulkUpsertSupplierProducts).toHaveBeenCalledWith([
      { sku: "SUP-001", normalizedSku: "SUP001", name: "Filtro de Aceite", currentStock: 42 }
    ]);
  });

  it("deduplica ítems con el mismo SKU dentro del mismo lote para evitar errores en PostgreSQL", async () => {
    const rawItems: ExtractedCatalogItem[] = [
      { rawSku: "SUP-001", rawName: "Filtro Versión Vieja", stock: 10 },
      { rawSku: "SUP-001", rawName: "Filtro Versión Actualizada", stock: 25 }
    ];

    vi.mocked(mockExtractor.extractItems).mockResolvedValueOnce({
      items: rawItems,
      totalPages: 1
    });

    vi.mocked(mockRepo.bulkUpsertSupplierProducts).mockResolvedValueOnce(1);

    const dummyBuffer = new ArrayBuffer(10);
    const summary = await service.processCatalogPdf(dummyBuffer, "SUPPLIER");

    expect(summary.extractedCount).toBe(2);
    expect(mockRepo.bulkUpsertSupplierProducts).toHaveBeenCalledWith([
      { sku: "SUP-001", normalizedSku: "SUP001", name: "Filtro Versión Actualizada", currentStock: 25 }
    ]);
  });
});
