import { Pool } from "pg";
import {
  AuditItemViewDTO,
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
        c.created_at AS "createdAt"
      FROM client_products c
      WHERE NOT EXISTS (
        SELECT 1 FROM product_mappings m 
        WHERE m.client_sku = c.sku
      )
      LIMIT $1;
    `;
    const result = await this.pool.query<ClientProduct>(query, [limit]);
    return result.rows;
  }

  public async findSupplierCandidates(
    clientProductName: string,
    similarityThreshold: number,
    limit: number,
    clientNormalizedSku?: string
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

      let query: string;
      let params: unknown[];

      if (clientNormalizedSku && clientNormalizedSku.trim().length > 0) {
        query = `
          SELECT 
            s.sku,
            s.normalized_sku AS "normalizedSku",
            s.name,
            CASE 
              WHEN s.normalized_sku = $3 THEN 1.0
              ELSE similarity(s.name, $1)
            END AS "similarityScore"
          FROM supplier_products s
          WHERE s.normalized_sku = $3 OR s.name % $1
          ORDER BY 
            (s.normalized_sku = $3) DESC,
            "similarityScore" DESC
          LIMIT $2;
        `;
        params = [clientProductName, limit, clientNormalizedSku.trim()];
      } else {
        query = `
          SELECT 
            s.sku,
            s.normalized_sku AS "normalizedSku",
            s.name,
            similarity(s.name, $1) AS "similarityScore"
          FROM supplier_products s
          WHERE s.name % $1
          ORDER BY "similarityScore" DESC
          LIMIT $2;
        `;
        params = [clientProductName, limit];
      }

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
          pm.supplier_sku AS "supplierSku",
          sp.name AS "supplierProductName",
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
        pm.supplier_sku AS "supplierSku",
        sp.name AS "supplierProductName",
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
    items: Array<{ sku: string; normalizedSku: string; name: string }>
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
          const offset = idx * 3;
          rowPlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
          values.push(item.sku, item.normalizedSku, item.name);
        });

        const query = `
          INSERT INTO client_products (sku, normalized_sku, name)
          VALUES ${rowPlaceholders.join(", ")}
          ON CONFLICT (sku) DO UPDATE SET
            normalized_sku = EXCLUDED.normalized_sku,
            name = EXCLUDED.name;
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
    items: Array<{ sku: string; normalizedSku: string; name: string; currentStock: number }>
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
          values.push(item.sku, item.normalizedSku, item.name, item.currentStock);
        });

        const query = `
          INSERT INTO supplier_products (sku, normalized_sku, name, current_stock)
          VALUES ${rowPlaceholders.join(", ")}
          ON CONFLICT (sku) DO UPDATE SET
            normalized_sku = EXCLUDED.normalized_sku,
            name = EXCLUDED.name,
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
