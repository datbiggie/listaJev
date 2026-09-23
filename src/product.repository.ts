import { Pool } from "pg";
import {
  AuditItemViewDTO,
  AuditPaginatedResult,
  AuditReportFilterInput,
  ClientProduct,
  IProductRepository,
  MappingRecord,
  MappingStatus,
  SupplierCandidate
} from "./types";

/**
 * Implementación de la capa de persistencia sobre PostgreSQL.
 */
export class PostgresProductRepository implements IProductRepository {
  constructor(private readonly pool: Pool) {}

  public async getUnmappedClientProducts(limit: number): Promise<ClientProduct[]> {
    const query = `
      SELECT 
        c.id, 
        c.sku, 
        c.normalized_sku AS "normalizedSku", 
        c.name,
        c.brand,
        c.created_at AS "createdAt"
      FROM client_products c
      WHERE NOT EXISTS (
        SELECT 1 FROM product_mappings m 
        WHERE m.client_sku = c.sku
          AND (m.status IN ('CONFIRMED', 'REQUIRES_REVIEW') OR m.supplier_sku IS NULL)
      )
      LIMIT $1;
    `;
    const result = await this.pool.query<ClientProduct>(query, [limit]);
    return result.rows;
  }

  public async getRejectedSupplierSkus(clientSku: string): Promise<string[]> {
    const query = `
      SELECT supplier_sku AS "supplierSku"
      FROM product_mappings
      WHERE client_sku = $1 AND status = 'REJECTED' AND supplier_sku IS NOT NULL;
    `;
    const result = await this.pool.query<{ supplierSku: string }>(query, [clientSku]);
    return result.rows.map((row) => row.supplierSku);
  }

  public async findSupplierCandidates(
    clientProductName: string,
    similarityThreshold: number,
    limit: number,
    clientNormalizedSku?: string,
    clientBrand?: string | null,
    clientRootSku?: string,
    excludedSupplierSkus?: string[],
    compatibleBrands?: string[]
  ): Promise<SupplierCandidate[]> {
    // Adquisición de cliente dedicado para encapsulación transaccional estricta
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN;");
      
      // set_config con is_local = true (SET LOCAL) para evitar polución del pool
      await client.query(
        "SELECT set_config('pg_trgm.similarity_threshold', $1::text, true);",
        [similarityThreshold.toString()]
      );

      const normSku = clientNormalizedSku?.trim() || null;
      const brand = clientBrand?.trim() || null;
      const rootSku = clientRootSku?.trim() || null;
      const excluded = excludedSupplierSkus && excludedSupplierSkus.length > 0 ? excludedSupplierSkus : null;
      const compBrands = compatibleBrands && compatibleBrands.length > 0 ? compatibleBrands.map((b) => b.toUpperCase()) : null;

      const query = `
        SELECT 
          s.sku,
          s.normalized_sku AS "normalizedSku",
          s.name,
          s.brand,
          CASE 
            WHEN $3::text IS NOT NULL AND s.normalized_sku = $3 THEN 1.0
            WHEN $5::text IS NOT NULL AND (s.normalized_sku = $5 OR (length($5) >= 3 AND s.normalized_sku LIKE $5 || '%')) THEN 0.95
            ELSE similarity(s.name, $1)
          END AS "similarityScore"
        FROM supplier_products s
        WHERE 
          (
            ($3::text IS NOT NULL AND s.normalized_sku = $3)
            OR ($5::text IS NOT NULL AND (
              s.normalized_sku = $5 
              OR (length($5) >= 3 AND s.normalized_sku LIKE $5 || '%')
            ))
            OR s.name % $1
          )
          AND (
            $6::text[] IS NULL 
            OR s.sku != ALL($6::text[])
          )
        ORDER BY 
          CASE 
            WHEN $4::text IS NOT NULL AND s.brand IS NOT NULL THEN
              CASE
                WHEN $7::text[] IS NOT NULL AND UPPER(s.brand) = ANY($7::text[]) THEN 2
                WHEN UPPER(s.brand) = UPPER($4::text) THEN 2
                ELSE 0
              END
            ELSE 1
          END DESC,
          ($3::text IS NOT NULL AND s.normalized_sku = $3) DESC,
          ($5::text IS NOT NULL AND s.normalized_sku = $5) DESC,
          ($5::text IS NOT NULL AND length($5) >= 3 AND s.normalized_sku LIKE $5 || '%') DESC,
          "similarityScore" DESC
        LIMIT $2;
      `;

      const params = [
        clientProductName,
        limit,
        normSku,
        brand,
        rootSku,
        excluded,
        compBrands
      ];

      const result = await client.query<SupplierCandidate>(query, params);
      await client.query("COMMIT;");
      return result.rows;
    } catch (error) {
      await client.query("ROLLBACK;");
      throw error;
    } finally {
      // Liberación garantizada de la conexión al pool
      client.release();
    }
  }

  public async saveMapping(record: MappingRecord): Promise<void> {
    const queryPair = `
      INSERT INTO product_mappings (
        client_sku, 
        supplier_sku, 
        confidence_score, 
        status, 
        discrepancy_reason,
        reviewed_by,
        reviewed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (client_sku, supplier_sku) WHERE supplier_sku IS NOT NULL
      DO UPDATE SET
        confidence_score = EXCLUDED.confidence_score,
        status = EXCLUDED.status,
        discrepancy_reason = EXCLUDED.discrepancy_reason,
        updated_at = CURRENT_TIMESTAMP;
    `;

    const queryOrphan = `
      INSERT INTO product_mappings (
        client_sku, 
        supplier_sku, 
        confidence_score, 
        status, 
        discrepancy_reason
      ) VALUES ($1, NULL, $2, $3, $4)
      ON CONFLICT (client_sku) WHERE supplier_sku IS NULL
      DO UPDATE SET
        confidence_score = EXCLUDED.confidence_score,
        status = EXCLUDED.status,
        discrepancy_reason = EXCLUDED.discrepancy_reason,
        updated_at = CURRENT_TIMESTAMP;
    `;

    if (record.supplierSku !== null) {
      await this.pool.query(queryPair, [
        record.clientSku,
        record.supplierSku,
        record.confidenceScore,
        record.status,
        record.discrepancyReason,
        record.reviewedBy ?? null,
        record.reviewedAt ?? null
      ]);
    } else {
      await this.pool.query(queryOrphan, [
        record.clientSku,
        record.confidenceScore,
        record.status,
        record.discrepancyReason
      ]);
    }
  }

  public async getPendingReviews(limit: number): Promise<MappingRecord[]> {
    const query = `
      SELECT 
        client_sku AS "clientSku",
        supplier_sku AS "supplierSku",
        confidence_score AS "confidenceScore",
        status,
        discrepancy_reason AS "discrepancyReason",
        reviewed_by AS "reviewedBy",
        reviewed_at AS "reviewedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM product_mappings
      WHERE status = 'REQUIRES_REVIEW'
      ORDER BY created_at ASC
      LIMIT $1;
    `;
    const result = await this.pool.query<MappingRecord>(query, [limit]);
    return result.rows;
  }

  public async getAuditItemsView(
    limit: number,
    status?: MappingStatus
  ): Promise<AuditItemViewDTO[]> {
    if (status && status !== "REQUIRES_REVIEW") {
      const query = `
        SELECT 
          pm.id::text AS id,
          pm.client_sku AS "clientSku",
          cp.name AS "clientProductName",
          cp.brand AS "clientBrand",
          pm.supplier_sku AS "supplierSku",
          sp.name AS "supplierProductName",
          sp.brand AS "supplierBrand",
          CAST(pm.confidence_score AS FLOAT) AS "confidenceScore",
          pm.status AS status,
          pm.discrepancy_reason AS "discrepancyReason",
          pm.created_at AS "createdAt"
        FROM product_mappings pm
        JOIN client_products cp ON cp.sku = pm.client_sku
        LEFT JOIN supplier_products sp ON sp.sku = pm.supplier_sku
        WHERE pm.status = $2
        ORDER BY pm.created_at ASC
        LIMIT $1;
      `;
      const result = await this.pool.query<AuditItemViewDTO>(query, [limit, status]);
      return result.rows;
    }

    const query = `
      SELECT 
        pm.id::text AS id,
        pm.client_sku AS "clientSku",
        cp.name AS "clientProductName",
        cp.brand AS "clientBrand",
        pm.supplier_sku AS "supplierSku",
        sp.name AS "supplierProductName",
        sp.brand AS "supplierBrand",
        CAST(pm.confidence_score AS FLOAT) AS "confidenceScore",
        pm.status AS status,
        pm.discrepancy_reason AS "discrepancyReason",
        pm.created_at AS "createdAt"
      FROM product_mappings pm
      JOIN client_products cp ON cp.sku = pm.client_sku
      LEFT JOIN supplier_products sp ON sp.sku = pm.supplier_sku
      WHERE pm.status = 'REQUIRES_REVIEW'
      ORDER BY pm.created_at ASC
      LIMIT $1;
    `;
    const result = await this.pool.query<AuditItemViewDTO>(query, [limit]);
    return result.rows;
  }

  public async getPaginatedAuditItems(
    filters: AuditReportFilterInput
  ): Promise<AuditPaginatedResult> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 50));
    const offset = (page - 1) * pageSize;
    const targetStatus = filters.tab === "REJECTED" ? "REJECTED" : "REQUIRES_REVIEW";

    const conditions: string[] = ["pm.status = $1"];
    const values: unknown[] = [targetStatus];
    let paramIndex = 2;

    if (filters.search && filters.search.trim().length > 0) {
      conditions.push(
        `(cp.sku ILIKE $${paramIndex} OR cp.name ILIKE $${paramIndex} OR cp.brand ILIKE $${paramIndex} OR pm.supplier_sku ILIKE $${paramIndex} OR sp.name ILIKE $${paramIndex} OR sp.brand ILIKE $${paramIndex})`
      );
      values.push(`%${filters.search.trim()}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM product_mappings pm
      JOIN client_products cp ON cp.sku = pm.client_sku
      LEFT JOIN supplier_products sp ON sp.sku = pm.supplier_sku
      ${whereClause};
    `;

    const itemsQuery = `
      SELECT 
        pm.id::text AS id,
        pm.client_sku AS "clientSku",
        cp.name AS "clientProductName",
        cp.brand AS "clientBrand",
        pm.supplier_sku AS "supplierSku",
        sp.name AS "supplierProductName",
        sp.brand AS "supplierBrand",
        CAST(pm.confidence_score AS FLOAT) AS "confidenceScore",
        pm.status AS status,
        pm.discrepancy_reason AS "discrepancyReason",
        pm.created_at AS "createdAt"
      FROM product_mappings pm
      JOIN client_products cp ON cp.sku = pm.client_sku
      LEFT JOIN supplier_products sp ON sp.sku = pm.supplier_sku
      ${whereClause}
      ORDER BY pm.created_at ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    const [countResult, itemsResult, metrics] = await Promise.all([
      this.pool.query<{ total: number }>(countQuery, values),
      this.pool.query<AuditItemViewDTO>(itemsQuery, [...values, pageSize, offset]),
      this.getMappingStatusCounts()
    ]);

    const totalItems = countResult.rows[0]?.total ?? 0;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    return {
      items: itemsResult.rows,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems,
        totalPages
      },
      metrics
    };
  }

  public async resetRejectedMappings(): Promise<number> {
    const result = await this.pool.query(
      "DELETE FROM product_mappings WHERE status = 'REJECTED';"
    );
    return result.rowCount ?? 0;
  }

  public async getMappingStatusCounts(): Promise<{
    confirmed: number;
    requiresReview: number;
    rejected: number;
    totalClient: number;
  }> {
    const statusResult = await this.pool.query<{ status: string; count: string }>(
      "SELECT status, count(*)::text as count FROM product_mappings GROUP BY status"
    );
    const clientResult = await this.pool.query<{ count: string }>(
      "SELECT count(*)::text as count FROM client_products"
    );

    const counts = {
      confirmed: 0,
      requiresReview: 0,
      rejected: 0,
      totalClient: parseInt(clientResult.rows[0]?.count ?? "0", 10)
    };

    for (const row of statusResult.rows) {
      if (row.status === "CONFIRMED") counts.confirmed = parseInt(row.count, 10);
      if (row.status === "REQUIRES_REVIEW") counts.requiresReview = parseInt(row.count, 10);
      if (row.status === "REJECTED") counts.rejected = parseInt(row.count, 10);
    }

    return counts;
  }

  public async resolveAuditReview(
    clientSku: string,
    statusOrSupplierSku: string | null | "CONFIRMED" | "REJECTED",
    statusOrReviewer: "CONFIRMED" | "REJECTED" | string,
    maybeReviewer?: string
  ): Promise<void> {
    let supplierSku: string | null | undefined;
    let status: "CONFIRMED" | "REJECTED";
    let reviewer: string;

    if (maybeReviewer !== undefined) {
      supplierSku = statusOrSupplierSku as string | null;
      status = statusOrReviewer as "CONFIRMED" | "REJECTED";
      reviewer = maybeReviewer;
    } else {
      status = statusOrSupplierSku as "CONFIRMED" | "REJECTED";
      reviewer = statusOrReviewer as string;
    }

    if (!reviewer || reviewer.trim().length === 0) {
      throw new Error("El identificador del revisor es obligatorio para la auditoría");
    }

    if (supplierSku !== undefined && supplierSku !== null) {
      const query = `
        UPDATE product_mappings
        SET 
          status = $1,
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE client_sku = $3 AND (supplier_sku = $4 OR supplier_sku IS NULL);
      `;
      await this.pool.query(query, [status, reviewer.trim(), clientSku, supplierSku]);
    } else {
      const query = `
        UPDATE product_mappings
        SET 
          status = $1,
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE client_sku = $3;
      `;
      await this.pool.query(query, [status, reviewer.trim(), clientSku]);
    }
  }

  public async bulkUpsertClientProducts(
    items: Array<{ sku: string; normalizedSku: string; name: string; brand?: string | null }>
  ): Promise<number> {
    if (items.length === 0) {
      return 0;
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN;");

      const chunkSize = 200;
      let totalPersisted = 0;

      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const values: unknown[] = [];
        const rowPlaceholders: string[] = [];

        chunk.forEach((item, idx) => {
          const offset = idx * 4;
          rowPlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
          values.push(item.sku, item.normalizedSku, item.name, item.brand ?? null);
        });

        const query = `
          INSERT INTO client_products (sku, normalized_sku, name, brand)
          VALUES ${rowPlaceholders.join(", ")}
          ON CONFLICT (sku) DO UPDATE SET
            normalized_sku = EXCLUDED.normalized_sku,
            name = EXCLUDED.name,
            brand = COALESCE(EXCLUDED.brand, client_products.brand);
        `;

        const result = await client.query(query, values);
        totalPersisted += result.rowCount ?? chunk.length;
      }

      await client.query("COMMIT;");
      return totalPersisted;
    } catch (error) {
      await client.query("ROLLBACK;");
      throw error;
    } finally {
      client.release();
    }
  }

  public async bulkUpsertSupplierProducts(
    items: Array<{ sku: string; normalizedSku: string; name: string; brand?: string | null; currentStock: number }>
  ): Promise<number> {
    if (items.length === 0) {
      return 0;
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN;");

      const chunkSize = 200;
      let totalPersisted = 0;

      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const values: unknown[] = [];
        const rowPlaceholders: string[] = [];

        chunk.forEach((item, idx) => {
          const offset = idx * 5;
          rowPlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
          values.push(item.sku, item.normalizedSku, item.name, item.brand ?? null, item.currentStock);
        });

        const query = `
          INSERT INTO supplier_products (sku, normalized_sku, name, brand, current_stock)
          VALUES ${rowPlaceholders.join(", ")}
          ON CONFLICT (sku) DO UPDATE SET
            normalized_sku = EXCLUDED.normalized_sku,
            name = EXCLUDED.name,
            brand = COALESCE(EXCLUDED.brand, supplier_products.brand),
            current_stock = EXCLUDED.current_stock,
            updated_at = CURRENT_TIMESTAMP;
        `;

        const result = await client.query(query, values);
        totalPersisted += result.rowCount ?? chunk.length;
      }

      await client.query("COMMIT;");
      return totalPersisted;
    } catch (error) {
      await client.query("ROLLBACK;");
      throw error;
    } finally {
      client.release();
    }
  }
}
