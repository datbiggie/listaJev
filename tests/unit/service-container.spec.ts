import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDbPool,
  getProductRepository,
  getCatalogIngestionService,
  getReconciliationWorker,
  getStockReconciliationService
} from "../../src/lib/service-container.js";
import { PostgresProductRepository } from "../../src/product.repository.js";
import { CatalogIngestionService } from "../../src/ingestion/catalog-ingestion.service.js";
import { CatalogReconciliationWorker } from "../../src/reconciliation.worker.js";
import { PostgresStockReconciliationService } from "../../src/stock-reconciliation.service.js";
import { Pool } from "pg";

vi.mock("pg", () => {
  const MockPool = vi.fn().mockImplementation(() => ({
    query: vi.fn(),
    connect: vi.fn()
  }));
  return { Pool: MockPool };
});

vi.mock("../../src/config.js", () => ({
  loadConfig: vi.fn().mockReturnValue({
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/test_db",
    MAX_CONCURRENCY: 5,
    JEV_MODEL_ID: "meta-llama/Llama-3.3-70B-Instruct",
    MATCH_SCORE_AUTO_CONFIRM: 0.9,
    MATCH_SCORE_DISCARD: 0.6,
    SIMILARITY_CANDIDATE_THRESHOLD: 0.3
  })
}));

describe("SPEC-WEB-NEXT-011: Contenedor de Dependencias (Service Container)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna instancia singleton de Pool", () => {
    const pool1 = getDbPool();
    const pool2 = getDbPool();
    expect(pool1).toBe(pool2);
    expect(Pool).toHaveBeenCalledTimes(1);
  });

  it("crea instancias válidas de repositorios y servicios", () => {
    const productRepo = getProductRepository();
    expect(productRepo).toBeInstanceOf(PostgresProductRepository);

    const ingestionService = getCatalogIngestionService();
    expect(ingestionService).toBeInstanceOf(CatalogIngestionService);

    const worker = getReconciliationWorker();
    expect(worker).toBeInstanceOf(CatalogReconciliationWorker);

    const stockService = getStockReconciliationService();
    expect(stockService).toBeInstanceOf(PostgresStockReconciliationService);
  });
});
