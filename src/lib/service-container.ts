import { Pool } from "pg";
import { loadConfig } from "@/config";
import { PostgresProductRepository } from "@/product.repository";
import { JevSystemOneMatcher } from "@/jev-matcher.service";
import { CatalogReconciliationWorker } from "@/reconciliation.worker";
import { PostgresStockReconciliationService } from "@/stock-reconciliation.service";
import { UnpdfExtractor } from "@/ingestion/unpdf-extractor";
import { CatalogIngestionService } from "@/ingestion/catalog-ingestion.service";

let poolInstance: Pool | null = null;

export function getDbPool(): Pool {
  if (!poolInstance) {
    const config = loadConfig();
    poolInstance = new Pool({
      connectionString: config.DATABASE_URL,
      max: config.MAX_CONCURRENCY + 2
    });
  }
  return poolInstance;
}

export function getProductRepository(): PostgresProductRepository {
  return new PostgresProductRepository(getDbPool());
}

export function getCatalogIngestionService(): CatalogIngestionService {
  const repo = getProductRepository();
  const extractor = new UnpdfExtractor();
  return new CatalogIngestionService(extractor, repo);
}

export function getReconciliationWorker(): CatalogReconciliationWorker {
  const config = loadConfig();
  const repo = getProductRepository();
  const matcher = new JevSystemOneMatcher(
    config.JEV_MODEL_ID,
    3,
    400,
    config.AI_GATEWAY_API_KEY
  );
  return new CatalogReconciliationWorker(repo, matcher, config);
}

export function getStockReconciliationService(): PostgresStockReconciliationService {
  return new PostgresStockReconciliationService(getDbPool());
}
