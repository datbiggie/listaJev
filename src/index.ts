import { Pool } from "pg";
import { loadConfig } from "./config";
import { PostgresProductRepository } from "./product.repository";
import { JevSystemOneMatcher } from "./jev-matcher.service";
import { CatalogReconciliationWorker } from "./reconciliation.worker";
import { PostgresStockReconciliationService } from "./stock-reconciliation.service";

/**
 * Punto de entrada principal y Composition Root de la aplicación.
 */
async function main(): Promise<void> {
  const config = loadConfig();

  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: config.MAX_CONCURRENCY + 2
  });

  const repository = new PostgresProductRepository(pool);
  const aiMatcher = new JevSystemOneMatcher(config.JEV_MODEL_ID);
  const worker = new CatalogReconciliationWorker(repository, aiMatcher, config);
  const stockService = new PostgresStockReconciliationService(pool);

  try {
    process.stdout.write("Iniciando procesamiento de conciliacion por lotes (Fase 1)...\n");
    let totalProcessed = 0;
    let totalResolved = 0;

    while (true) {
      const { processed, resolved } = await worker.runBatch();
      if (processed === 0) break;
      totalProcessed += processed;
      totalResolved += resolved;
      process.stdout.write(
        `Lote completado: ${processed} procesados, ${resolved} mapeados (Total acumulado: ${totalProcessed})...\n`
      );
    }

    process.stdout.write(
      `Fase 1 completada. Registros procesados: ${totalProcessed}, Mapeados con exito: ${totalResolved}\n`
    );

    process.stdout.write("Verificando estado consolidado de inventario (Fase 2)...\n");
    const stockReport = await stockService.getReconciledStock();
    process.stdout.write(
      `Fase 2 completada. Total de productos evaluados en stock: ${stockReport.length}\n`
    );
  } finally {
    await pool.end();
  }
}

// Ejecución con captura controlada de errores globales
if (process.env["NODE_ENV"] !== "test") {
  main().catch((err: unknown) => {
    process.stderr.write(`Fallo de ejecucion en bootstrap: ${(err as Error).stack ?? String(err)}\n`);
    process.exit(1);
  });
}
