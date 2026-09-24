import { Pool } from "pg";
import { loadConfig } from "@/config";
import { PostgresProductRepository } from "@/product.repository";
import { JevSystemOneMatcher } from "@/jev-matcher.service";
import { CatalogReconciliationWorker } from "@/reconciliation.worker";
import { PostgresStockReconciliationService } from "@/stock-reconciliation.service";
import { UnpdfExtractor } from "@/ingestion/unpdf-extractor";
import { CatalogIngestionService } from "@/ingestion/catalog-ingestion.service";

let poolInstance: Pool | null = null;

/**
 * Normaliza la URI de conexión a PostgreSQL.
 * Mitiga la advertencia de seguridad de libpq/pg-connection-string v3/pg v9
 * sustituyendo 'sslmode=require' por 'sslmode=verify-full' para proveedores con certificados válidos (como Neon).
 */
export function normalizeDatabaseUrl(connectionString: string): string {
  try {
    const parsed = new URL(connectionString);
    const sslmode = parsed.searchParams.get("sslmode");
    if (sslmode === "require" && !parsed.searchParams.has("uselibpqcompat")) {
      parsed.searchParams.set("sslmode", "verify-full");
      return parsed.toString();
    }
    return connectionString;
  } catch {
    return connectionString;
  }
}

export function getDbPool(): Pool {
  if (!poolInstance) {
    const config = loadConfig();
    poolInstance = new Pool({
      connectionString: normalizeDatabaseUrl(config.DATABASE_URL),
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
