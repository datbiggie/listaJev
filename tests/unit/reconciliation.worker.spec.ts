import { describe, it, expect, vi, beforeEach } from "vitest";
import { CatalogReconciliationWorker } from "../../src/reconciliation.worker.js";
import {
  ClientProduct,
  IAiMatcherService,
  IProductRepository,
  ProductMatchResult,
  SupplierCandidate
} from "../../src/types.js";
import { AppConfig } from "../../src/config.js";

describe("SPEC-WORKER-006: CatalogReconciliationWorker", () => {
  let mockRepo: IProductRepository;
  let mockMatcher: IAiMatcherService;
  let config: AppConfig;
  let worker: CatalogReconciliationWorker;

  const mockProduct: ClientProduct = {
    id: "prod-1",
    sku: "SKU-CLI-100",
    normalizedSku: "SKUCLI100",
    name: "Tornillo Hexagonal 1/2 pulgada"
  };

  const mockCandidate: SupplierCandidate = {
    sku: "SUP-HEX-050",
    normalizedSku: "SUPHEX050",
    name: "Tornillo Hex 1/2 in",
    similarityScore: 0.78
  };

  beforeEach(() => {
    mockRepo = {
      getUnmappedClientProducts: vi.fn(),
      findSupplierCandidates: vi.fn(),
      saveMapping: vi.fn(),
      getPendingReviews: vi.fn(),
      resolveAuditReview: vi.fn()
    };

    mockMatcher = {
      evaluateMatch: vi.fn()
    };

    config = {
      DATABASE_URL: "postgresql://user:pass@localhost:5432/test",
      AI_GATEWAY_API_KEY: "secret-key",
      JEV_MODEL_ID: "typesafe-ai/jev",
      BATCH_SIZE: 10,
      MAX_CONCURRENCY: 2,
      PG_TRGM_THRESHOLD: 0.60,
      CONFIRMED_MATCH_THRESHOLD: 0.90,
      REVIEW_MATCH_THRESHOLD: 0.70
    };

    worker = new CatalogReconciliationWorker(mockRepo, mockMatcher, config);
  });

  it("retorna { processed: 0, resolved: 0 } si no hay productos no mapeados", async () => {
    vi.mocked(mockRepo.getUnmappedClientProducts).mockResolvedValueOnce([]);

    const res = await worker.runBatch();

    expect(res).toEqual({ processed: 0, resolved: 0 });
    expect(mockRepo.findSupplierCandidates).not.toHaveBeenCalled();
  });

  it("TC-U-12: persiste como REJECTED (huérfano) si pg_trgm no halla candidatos para evitar bucles infinitos", async () => {
    vi.mocked(mockRepo.getUnmappedClientProducts).mockResolvedValueOnce([mockProduct]);
    vi.mocked(mockRepo.findSupplierCandidates).mockResolvedValueOnce([]);

    const res = await worker.runBatch();

    expect(res.processed).toBe(1);
    expect(res.resolved).toBe(0);
    expect(mockRepo.saveMapping).toHaveBeenCalledWith({
      clientSku: "SKU-CLI-100",
      supplierSku: null,
      confidenceScore: 0,
      status: "REJECTED",
      discrepancyReason: "NO_CANDIDATES_FOUND"
    });
  });

  it("TC-U-13: asigna CONFIRMED cuando Jev valida equivalencia con confianza >= 0.90", async () => {
    vi.mocked(mockRepo.getUnmappedClientProducts).mockResolvedValueOnce([mockProduct]);
    vi.mocked(mockRepo.findSupplierCandidates).mockResolvedValueOnce([mockCandidate]);

    const jevResponse: ProductMatchResult = {
      isMatch: true,
      confidenceScore: 0.94,
      matchType: "EQUIVALENT_VARIANT",
      discrepancyReason: "NONE"
    };

    vi.mocked(mockMatcher.evaluateMatch).mockResolvedValueOnce(jevResponse);

    const res = await worker.runBatch();

    expect(res.processed).toBe(1);
    expect(res.resolved).toBe(1);
    expect(mockRepo.saveMapping).toHaveBeenCalledWith({
      clientSku: "SKU-CLI-100",
      supplierSku: "SUP-HEX-050",
      confidenceScore: 0.94,
      status: "CONFIRMED",
      discrepancyReason: "NONE"
    });
  });

  it("TC-U-14: asigna REQUIRES_REVIEW si Jev arroja confianza entre 0.70 y 0.89", async () => {
    vi.mocked(mockRepo.getUnmappedClientProducts).mockResolvedValueOnce([mockProduct]);
    vi.mocked(mockRepo.findSupplierCandidates).mockResolvedValueOnce([mockCandidate]);

    const jevResponse: ProductMatchResult = {
      isMatch: true,
      confidenceScore: 0.82,
      matchType: "EQUIVALENT_VARIANT",
      discrepancyReason: "PACKAGING_DIFFERENCE"
    };

    vi.mocked(mockMatcher.evaluateMatch).mockResolvedValueOnce(jevResponse);

    const res = await worker.runBatch();

    expect(res.processed).toBe(1);
    expect(res.resolved).toBe(1);
    expect(mockRepo.saveMapping).toHaveBeenCalledWith({
      clientSku: "SKU-CLI-100",
      supplierSku: "SUP-HEX-050",
      confidenceScore: 0.82,
      status: "REQUIRES_REVIEW",
      discrepancyReason: "PACKAGING_DIFFERENCE"
    });
  });

  it("TC-U-15: persiste como REJECTED si los candidatos son descartados por Jev", async () => {
    vi.mocked(mockRepo.getUnmappedClientProducts).mockResolvedValueOnce([mockProduct]);
    vi.mocked(mockRepo.findSupplierCandidates).mockResolvedValueOnce([mockCandidate]);

    const jevResponse: ProductMatchResult = {
      isMatch: false,
      confidenceScore: 0.40,
      matchType: "DIFFERENT_PRODUCT",
      discrepancyReason: "SPECIFICATION_MISMATCH"
    };

    vi.mocked(mockMatcher.evaluateMatch).mockResolvedValueOnce(jevResponse);

    const res = await worker.runBatch();

    expect(res.processed).toBe(1);
    expect(res.resolved).toBe(0);
    expect(mockRepo.saveMapping).toHaveBeenCalledWith({
      clientSku: "SKU-CLI-100",
      supplierSku: null,
      confidenceScore: 0,
      status: "REJECTED",
      discrepancyReason: "NO_CANDIDATES_FOUND"
    });
  });

  it("tolera excepciones de inferencia en un candidato y prueba el siguiente candidato", async () => {
    const candidateLowSim: SupplierCandidate = {
      sku: "SUP-HEX-040",
      normalizedSku: "SUPHEX040",
      name: "Tornillo Algo Parecido",
      similarityScore: 0.62 // menor a REVIEW_MATCH_THRESHOLD (0.70)
    };

    const candidate2: SupplierCandidate = {
      sku: "SUP-HEX-099",
      normalizedSku: "SUPHEX099",
      name: "Tornillo Hex 1/2 in Premium",
      similarityScore: 0.75
    };

    vi.mocked(mockRepo.getUnmappedClientProducts).mockResolvedValueOnce([mockProduct]);
    vi.mocked(mockRepo.findSupplierCandidates).mockResolvedValueOnce([candidateLowSim, candidate2]);

    vi.mocked(mockMatcher.evaluateMatch)
      .mockRejectedValueOnce(new Error("Timeout inesperado"))
      .mockResolvedValueOnce({
        isMatch: true,
        confidenceScore: 0.92,
        matchType: "EQUIVALENT_VARIANT",
        discrepancyReason: "NONE"
      });

    const res = await worker.runBatch();

    expect(res.processed).toBe(1);
    expect(res.resolved).toBe(1);
    expect(mockRepo.saveMapping).toHaveBeenCalledWith({
      clientSku: "SKU-CLI-100",
      supplierSku: "SUP-HEX-099",
      confidenceScore: 0.92,
      status: "CONFIRMED",
      discrepancyReason: "NONE"
    });
  });

  it("aplica degradacion agraciada a REQUIRES_REVIEW si la IA falla pero el candidato tiene similitud >= 0.70", async () => {
    vi.mocked(mockRepo.getUnmappedClientProducts).mockResolvedValueOnce([mockProduct]);
    vi.mocked(mockRepo.findSupplierCandidates).mockResolvedValueOnce([mockCandidate]); // similarityScore = 0.78

    vi.mocked(mockMatcher.evaluateMatch).mockRejectedValueOnce(
      new Error("Fallo de autenticacion o saldo en AI Gateway (HTTP 403)")
    );

    const res = await worker.runBatch();

    expect(res.processed).toBe(1);
    expect(res.resolved).toBe(1);
    expect(mockRepo.saveMapping).toHaveBeenCalledWith({
      clientSku: "SKU-CLI-100",
      supplierSku: "SUP-HEX-050",
      confidenceScore: 0.78,
      status: "REQUIRES_REVIEW",
      discrepancyReason: "SPECIFICATION_MISMATCH"
    });
  });

  it("continúa al siguiente candidato si isMatch es true pero la confianza es menor a REVIEW_MATCH_THRESHOLD", async () => {
    vi.mocked(mockRepo.getUnmappedClientProducts).mockResolvedValueOnce([mockProduct]);
    vi.mocked(mockRepo.findSupplierCandidates).mockResolvedValueOnce([mockCandidate]);

    vi.mocked(mockMatcher.evaluateMatch).mockResolvedValueOnce({
      isMatch: true,
      confidenceScore: 0.55, // menor que 0.70
      matchType: "EQUIVALENT_VARIANT",
      discrepancyReason: "SPECIFICATION_MISMATCH"
    });

    const res = await worker.runBatch();

    expect(res.processed).toBe(1);
    expect(res.resolved).toBe(0);
    expect(mockRepo.saveMapping).toHaveBeenCalledWith({
      clientSku: "SKU-CLI-100",
      supplierSku: null,
      confidenceScore: 0,
      status: "REJECTED",
      discrepancyReason: "NO_CANDIDATES_FOUND"
    });
  });

  it("deriva a REQUIRES_REVIEW con BRAND_MISMATCH cuando el SKU coincide pero las marcas son distintas", async () => {
    const productWithBrand: ClientProduct = {
      id: "prod-brand-1",
      sku: "SKU-MATCH-99",
      normalizedSku: "SKUMATCH99",
      name: "Alternador Aveo Bosch",
      brand: "BOSCH"
    };

    const candidateWithDiffBrand: SupplierCandidate = {
      sku: "SKU-MATCH-99",
      normalizedSku: "SKUMATCH99",
      name: "Alternador Aveo Valeo",
      brand: "VALEO",
      similarityScore: 1.0
    };

    vi.mocked(mockRepo.getUnmappedClientProducts).mockResolvedValueOnce([productWithBrand]);
    vi.mocked(mockRepo.findSupplierCandidates).mockResolvedValueOnce([candidateWithDiffBrand]);

    const res = await worker.runBatch();

    expect(res.processed).toBe(1);
    expect(res.resolved).toBe(1);
    expect(mockRepo.saveMapping).toHaveBeenCalledWith({
      clientSku: "SKU-MATCH-99",
      supplierSku: "SKU-MATCH-99",
      confidenceScore: 0.75,
      status: "REQUIRES_REVIEW",
      discrepancyReason: "BRAND_MISMATCH"
    });
  });

  it("prioriza CONFIRMED con C1098-ENELBROCK sobre C1098 de marca incompatible (PORTER)", async () => {
    const clientProduct: ClientProduct = {
      id: "prod-c1098",
      sku: "C1098",
      normalizedSku: "C1098",
      name: "Pastilla de Freno Enelbrock",
      brand: "Enelbrock"
    };

    const wrongCandidatePorter: SupplierCandidate = {
      sku: "C1098",
      normalizedSku: "C1098",
      name: "Pastilla de Freno Porter",
      brand: "PORTER",
      similarityScore: 1.0
    };

    const correctCandidateEnelbrock: SupplierCandidate = {
      sku: "C1098-ENELBROCK",
      normalizedSku: "C1098ENELBROCK",
      name: "Pastilla de Freno Enelbrock",
      brand: "Enelbrock",
      similarityScore: 0.95
    };

    vi.mocked(mockRepo.getUnmappedClientProducts).mockResolvedValueOnce([clientProduct]);
    vi.mocked(mockRepo.findSupplierCandidates).mockResolvedValueOnce([
      wrongCandidatePorter,
      correctCandidateEnelbrock
    ]);

    const res = await worker.runBatch();

    expect(res.processed).toBe(1);
    expect(res.resolved).toBe(1);
    expect(mockRepo.saveMapping).toHaveBeenCalledWith({
      clientSku: "C1098",
      supplierSku: "C1098-ENELBROCK",
      confidenceScore: 0.95,
      status: "CONFIRMED",
      discrepancyReason: "NONE"
    });
  });

  it("empareja M546-ENELB prioritariamente con M546 e ignora candidato con falso positivo léxico (IB239)", async () => {
    const clientProduct: ClientProduct = {
      id: "prod-m546",
      sku: "M546-ENELB",
      normalizedSku: "M546ENELB",
      name: "Bomba de Agua Aveo",
      brand: "Enelbrock"
    };

    const correctRootMatch: SupplierCandidate = {
      sku: "M546",
      normalizedSku: "M546",
      name: "Bomba de Agua 1.6",
      brand: "Enelbrock",
      similarityScore: 0.95
    };

    const lexicalFalsePositive: SupplierCandidate = {
      sku: "IB239",
      normalizedSku: "IB239",
      name: "Bomba de Agua Aveo Original",
      brand: "PORTER",
      similarityScore: 0.76
    };

    vi.mocked(mockRepo.getUnmappedClientProducts).mockResolvedValueOnce([clientProduct]);
    vi.mocked(mockRepo.findSupplierCandidates).mockResolvedValueOnce([
      correctRootMatch,
      lexicalFalsePositive
    ]);

    const res = await worker.runBatch();

    expect(res.processed).toBe(1);
    expect(res.resolved).toBe(1);
    expect(mockRepo.saveMapping).toHaveBeenCalledWith({
      clientSku: "M546-ENELB",
      supplierSku: "M546",
      confidenceScore: 0.95,
      status: "CONFIRMED",
      discrepancyReason: "NONE"
    });
  });

  it("re-evalúa y confirma al siguiente candidato excluyendo el proveedor previamente descartado", async () => {
    const clientProduct: ClientProduct = {
      id: "prod-re-eval",
      sku: "C1098",
      normalizedSku: "C1098",
      name: "Pastilla de Freno Enelbrock",
      brand: "Enelbrock"
    };

    const candidateEnelbrock: SupplierCandidate = {
      sku: "C1098-ENELBROCK",
      normalizedSku: "C1098ENELBROCK",
      name: "Pastilla de Freno Enelbrock",
      brand: "Enelbrock",
      similarityScore: 0.95
    };

    mockRepo.getRejectedSupplierSkus = vi.fn().mockResolvedValueOnce(["C1098"]);
    vi.mocked(mockRepo.getUnmappedClientProducts).mockResolvedValueOnce([clientProduct]);
    vi.mocked(mockRepo.findSupplierCandidates).mockResolvedValueOnce([candidateEnelbrock]);

    const res = await worker.runBatch();

    expect(mockRepo.findSupplierCandidates).toHaveBeenCalledWith(
      "Pastilla de Freno Enelbrock",
      0.60,
      5,
      "C1098",
      "Enelbrock",
      "C1098",
      ["C1098"],
      expect.arrayContaining(["ENELBROCK", "ENELB"])
    );
    expect(res.processed).toBe(1);
    expect(res.resolved).toBe(1);
    expect(mockRepo.saveMapping).toHaveBeenCalledWith({
      clientSku: "C1098",
      supplierSku: "C1098-ENELBROCK",
      confidenceScore: 0.95,
      status: "CONFIRMED",
      discrepancyReason: "NONE"
    });
  });
});

