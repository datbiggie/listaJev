import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostgresProductRepository } from "../../src/product.repository.js";
import { Pool, PoolClient } from "pg";
import { MappingRecord } from "../../src/types.js";

describe("SPEC-REPO-004: PostgresProductRepository", () => {
  let mockPool: Pool;
  let mockClient: PoolClient;
  let repository: PostgresProductRepository;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    } as unknown as PoolClient;

    mockPool = {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(mockClient)
    } as unknown as Pool;

    repository = new PostgresProductRepository(mockPool);
  });

  describe("getUnmappedClientProducts", () => {
    it("ejecuta la consulta con cláusula WHERE NOT EXISTS y respeta el límite", async () => {
      const mockRows = [
        { id: "1", sku: "CLI-1", normalizedSku: "CLI1", name: "Prod 1" }
      ];
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: mockRows } as any);

      const result = await repository.getUnmappedClientProducts(25);

      expect(result).toEqual(mockRows);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE NOT EXISTS"),
        [25]
      );
    });
  });

  describe("findSupplierCandidates (Aislamiento con SET LOCAL)", () => {
    it("adquiere cliente, ejecuta BEGIN, SET LOCAL y COMMIT, y libera el cliente en finally", async () => {
      const mockCandidates = [
        { sku: "SUP-1", normalizedSku: "SUP1", name: "Prod 1", similarityScore: 0.88 }
      ];

      vi.mocked(mockClient.query)
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({} as any) // set_config
        .mockResolvedValueOnce({ rows: mockCandidates } as any) // SELECT
        .mockResolvedValueOnce({} as any); // COMMIT

      const candidates = await repository.findSupplierCandidates("Prod 1", 0.65, 3);

      expect(candidates).toEqual(mockCandidates);
      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN;");
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        "SELECT set_config('pg_trgm.similarity_threshold', $1::text, true);",
        ["0.65"]
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(4, "COMMIT;");
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it("ejecuta ROLLBACK y libera el cliente si la consulta falla", async () => {
      vi.mocked(mockClient.query)
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({} as any) // set_config
        .mockRejectedValueOnce(new Error("Fallo en base de datos")); // SELECT falla

      await expect(
        repository.findSupplierCandidates("Prod 1", 0.65, 3)
      ).rejects.toThrow("Fallo en base de datos");

      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK;");
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe("saveMapping", () => {
    it("ejecuta consulta de par cuando supplierSku no es null", async () => {
      const pairRecord: MappingRecord = {
        clientSku: "CLI-1",
        supplierSku: "SUP-1",
        confidenceScore: 0.95,
        status: "CONFIRMED",
        discrepancyReason: "NONE"
      };

      vi.mocked(mockPool.query).mockResolvedValueOnce({} as any);

      await repository.saveMapping(pairRecord);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE supplier_sku IS NOT NULL"),
        expect.arrayContaining(["CLI-1", "SUP-1", 0.95, "CONFIRMED", "NONE"])
      );
    });

    it("ejecuta consulta de huérfano cuando supplierSku es null", async () => {
      const orphanRecord: MappingRecord = {
        clientSku: "CLI-2",
        supplierSku: null,
        confidenceScore: 0.0,
        status: "REJECTED",
        discrepancyReason: "NO_CANDIDATES_FOUND"
      };

      vi.mocked(mockPool.query).mockResolvedValueOnce({} as any);

      await repository.saveMapping(orphanRecord);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE supplier_sku IS NULL"),
        ["CLI-2", 0.0, "REJECTED", "NO_CANDIDATES_FOUND"]
      );
    });
  });

  describe("getPendingReviews y resolveAuditReview", () => {
    it("obtiene registros en estado REQUIRES_REVIEW", async () => {
      const pendingRows = [
        { clientSku: "CLI-3", status: "REQUIRES_REVIEW", confidenceScore: 0.82 }
      ];
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: pendingRows } as any);

      const res = await repository.getPendingReviews(10);
      expect(res).toEqual(pendingRows);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE status = 'REQUIRES_REVIEW'"),
        [10]
      );
    });

    it("actualiza estado y metadatos de auditoría al resolver revisión", async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({} as any);

      await repository.resolveAuditReview("CLI-3", "CONFIRMED", "admin@org.com");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("reviewed_by = $2"),
        ["CONFIRMED", "admin@org.com", "CLI-3"]
      );
    });

    it("actualiza estado pasando supplierSku como segundo argumento (firma de 4 parámetros)", async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({} as any);

      await repository.resolveAuditReview("CLI-3", "SUP-3", "CONFIRMED", "admin@org.com");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE client_sku = $3 AND (supplier_sku = $4 OR supplier_sku IS NULL)"),
        ["CONFIRMED", "admin@org.com", "CLI-3", "SUP-3"]
      );
    });

    it("obtiene items enriquecidos con getAuditItemsView", async () => {
      const mockAuditView = [
        {
          id: "uuid-1",
          clientSku: "CLI-1",
          clientProductName: "Prod 1",
          supplierSku: "SUP-1",
          supplierProductName: "Supp Prod 1",
          confidenceScore: 0.85,
          status: "REQUIRES_REVIEW",
          discrepancyReason: "VARIANT_MISMATCH",
          createdAt: new Date()
        }
      ];
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: mockAuditView } as any);

      const items = await repository.getAuditItemsView(25);
      expect(items).toEqual(mockAuditView);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE pm.status = 'REQUIRES_REVIEW'"),
        [25]
      );
    });

    it("rechaza resolución si reviewer está vacío", async () => {
      await expect(
        repository.resolveAuditReview("CLI-3", "CONFIRMED", "   ")
      ).rejects.toThrow("El identificador del revisor es obligatorio para la auditoría");
    });
  });

  describe("bulkUpsertClientProducts y bulkUpsertSupplierProducts", () => {
    it("retorna 0 sin conectar al pool si la lista está vacía", async () => {
      expect(await repository.bulkUpsertClientProducts([])).toBe(0);
      expect(await repository.bulkUpsertSupplierProducts([])).toBe(0);
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it("ejecuta bulkUpsertClientProducts en transacción y libera cliente", async () => {
      const items = [
        { sku: "CLI-1", normalizedSku: "CLI1", name: "Prod 1" },
        { sku: "CLI-2", normalizedSku: "CLI2", name: "Prod 2" }
      ];

      vi.mocked(mockClient.query)
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ rowCount: 2 } as any) // INSERT
        .mockResolvedValueOnce({} as any); // COMMIT

      const count = await repository.bulkUpsertClientProducts(items);

      expect(count).toBe(2);
      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN;");
      expect(mockClient.query).toHaveBeenNthCalledWith(3, "COMMIT;");
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it("ejecuta bulkUpsertSupplierProducts en transacción y libera cliente", async () => {
      const items = [
        { sku: "SUP-1", normalizedSku: "SUP1", name: "Prod Sup", currentStock: 15 }
      ];

      vi.mocked(mockClient.query)
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 } as any) // INSERT
        .mockResolvedValueOnce({} as any); // COMMIT

      const count = await repository.bulkUpsertSupplierProducts(items);

      expect(count).toBe(1);
      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it("ejecuta ROLLBACK y libera cliente si ocurre un fallo en bulkUpsert", async () => {
      vi.mocked(mockClient.query)
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockRejectedValueOnce(new Error("Error de inserción masiva"));

      await expect(
        repository.bulkUpsertClientProducts([
          { sku: "CLI-1", normalizedSku: "CLI1", name: "Prod 1" }
        ])
      ).rejects.toThrow("Error de inserción masiva");

      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK;");
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });
});
