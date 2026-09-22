import { Pool } from "pg";
import {
  IStockReconciliationService,
  StockReconciliationItem,
  StockReportFilterInput,
  StockReportPaginatedResult,
  StockStatus
} from "./types";

/**
 * Servicio de cruce determinista relacional de inventario en tiempo real (Fase 2).
 */
export class PostgresStockReconciliationService implements IStockReconciliationService {
  constructor(private readonly pool: Pool) {}

  public async getReconciledStock(): Promise<StockReconciliationItem[]> {
    const query = `
      SELECT 
        c.sku AS "clientSku",
        c.name AS "clientProductName",
        s.sku AS "supplierSku",
        COALESCE(s.current_stock, 0) AS "supplierStock",
        CASE 
          WHEN m.supplier_sku IS NULL THEN 'NO_CATALOGADO'
          WHEN s.sku IS NULL THEN 'DESCATALOGADO_PROVEEDOR'
          WHEN s.current_stock = 0 THEN 'AGOTADO'
          ELSE 'DISPONIBLE'
        END AS "stockStatus"
      FROM client_products c
      LEFT JOIN product_mappings m 
        ON m.client_sku = c.sku AND m.status = 'CONFIRMED'
      LEFT JOIN supplier_products s 
        ON s.sku = m.supplier_sku;
    `;
    const result = await this.pool.query<StockReconciliationItem>(query);
    return result.rows;
  }

  public async getPaginatedReconciliationReport(
    filters: StockReportFilterInput
  ): Promise<StockReportPaginatedResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
    const offset = (page - 1) * pageSize;

    const baseCte = `
      WITH base_stock AS (
        SELECT 
          c.sku AS "clientSku",
          c.name AS "clientProductName",
          s.sku AS "supplierSku",
          COALESCE(s.current_stock, 0)::int AS "supplierStock",
          CASE 
            WHEN m.supplier_sku IS NULL THEN 'NO_CATALOGADO'
            WHEN s.sku IS NULL THEN 'DESCATALOGADO_PROVEEDOR'
            WHEN s.current_stock = 0 THEN 'AGOTADO'
            ELSE 'DISPONIBLE'
          END AS "stockStatus"
        FROM client_products c
        LEFT JOIN product_mappings m 
          ON m.client_sku = c.sku AND m.status = 'CONFIRMED'
        LEFT JOIN supplier_products s 
          ON s.sku = m.supplier_sku
      )
    `;

    const metricsResult = await this.pool.query<{
      totalProducts: number;
      availableCount: number;
      outOfStockCount: number;
      discontinuedCount: number;
      unmappedCount: number;
    }>(`
      ${baseCte}
      SELECT 
        COUNT(*)::int AS "totalProducts",
        COUNT(*) FILTER (WHERE "stockStatus" = 'DISPONIBLE')::int AS "availableCount",
        COUNT(*) FILTER (WHERE "stockStatus" = 'AGOTADO')::int AS "outOfStockCount",
        COUNT(*) FILTER (WHERE "stockStatus" = 'DESCATALOGADO_PROVEEDOR')::int AS "discontinuedCount",
        COUNT(*) FILTER (WHERE "stockStatus" = 'NO_CATALOGADO')::int AS "unmappedCount"
      FROM base_stock;
    `);

    const metricsRow = metricsResult.rows[0] ?? {
      totalProducts: 0,
      availableCount: 0,
      outOfStockCount: 0,
      discontinuedCount: 0,
      unmappedCount: 0
    };

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters.status && filters.status !== "TODOS") {
      conditions.push(`"stockStatus" = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.search && filters.search.trim().length > 0) {
      conditions.push(`("clientSku" ILIKE $${paramIndex} OR "clientProductName" ILIKE $${paramIndex})`);
      values.push(`%${filters.search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await this.pool.query<{ total: number }>(
      `
        ${baseCte}
        SELECT COUNT(*)::int AS total
        FROM base_stock
        ${whereClause};
      `,
      values
    );
    const totalItems = countResult.rows[0]?.total ?? 0;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    const itemsValues = [...values, pageSize, offset];
    const itemsResult = await this.pool.query<{
      clientSku: string;
      clientProductName: string;
      supplierSku: string | null;
      supplierStock: number;
      stockStatus: StockStatus;
    }>(
      `
        ${baseCte}
        SELECT 
          "clientSku",
          "clientProductName",
          "supplierSku",
          "supplierStock",
          "stockStatus"
        FROM base_stock
        ${whereClause}
        ORDER BY "clientSku" ASC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++};
      `,
      itemsValues
    );

    return {
      items: itemsResult.rows,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems,
        totalPages
      },
      metrics: {
        totalProducts: Number(metricsRow.totalProducts),
        availableCount: Number(metricsRow.availableCount),
        outOfStockCount: Number(metricsRow.outOfStockCount),
        discontinuedCount: Number(metricsRow.discontinuedCount),
        unmappedCount: Number(metricsRow.unmappedCount)
      }
    };
  }
}
