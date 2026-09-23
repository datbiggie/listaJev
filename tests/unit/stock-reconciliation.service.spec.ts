import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostgresStockReconciliationService } from "../../src/stock-reconciliation.service.js";
import { Pool } from "pg";
import { StockReconciliationItem } from "../../src/types.js";

describe("SPEC-STOCK-007: PostgresStockReconciliationService", () => {
  let mockPool: Pool;
  let service: PostgresStockReconciliationService;

  beforeEach(() => {
    mockPool = {
      query: vi.fn()
    } as unknown as Pool;

    service = new PostgresStockReconciliationService(mockPool);
  });

  it("ejecuta la consulta determinista LEFT JOIN filtrando exclusivamente por CONFIRMED", async () => {
    const mockStockItems: StockReconciliationItem[] = [
      {
        clientSku: "CLI-100",
        clientProductName: "Tornillo Hex 1/2",
        supplierSku: "SUP-100",
        supplierStock: 45,
        stockStatus: "DISPONIBLE"
      },
      {
        clientSku: "CLI-200",
        clientProductName: "Tuerca M10",
        supplierSku: "SUP-200",
        supplierStock: 0,
        stockStatus: "AGOTADO"
      },
      {
        clientSku: "CLI-300",
        clientProductName: "Arandela 3/8",
        supplierSku: null,
        supplierStock: 0,
        stockStatus: "NO_CATALOGADO"
      }
    ];

    vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: mockStockItems } as any);

    const result = await service.getReconciledStock();

    expect(result).toEqual(mockStockItems);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("m.status = 'CONFIRMED'")
    );
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("CASE")
    );
  });

  describe("getPaginatedReconciliationReport", () => {
    it("obtiene métricas consolidadas e items paginados con filtros por defecto", async () => {
      const mockMetrics = {
        totalProducts: 10,
        availableCount: 5,
        outOfStockCount: 2,
        discontinuedCount: 1,
        unmappedCount: 2
      };

      const mockItems = [
        {
          clientSku: "CLI-100",
          clientProductName: "Tornillo Hex",
          supplierSku: "SUP-100",
          supplierStock: 10,
          stockStatus: "DISPONIBLE"
        }
      ];

      vi.mocked(mockPool.query)
        .mockResolvedValueOnce({ rows: [mockMetrics] } as any) // Metrics
        .mockResolvedValueOnce({ rows: [{ total: 10 }] } as any) // Count
        .mockResolvedValueOnce({ rows: mockItems } as any); // Items

      const result = await service.getPaginatedReconciliationReport({
        status: "TODOS",
        page: 1,
        pageSize: 50
      });

      expect(result.metrics).toEqual(mockMetrics);
      expect(result.pagination).toEqual({
        currentPage: 1,
        pageSize: 50,
        totalItems: 10,
        totalPages: 1
      });
      expect(result.items).toEqual(mockItems);
    });

    it("aplica filtros de estado y búsqueda textual con parámetros seguros", async () => {
      vi.mocked(mockPool.query)
        .mockResolvedValueOnce({ rows: [{ totalProducts: 1, availableCount: 0, outOfStockCount: 1, discontinuedCount: 0, unmappedCount: 0 }] } as any)
        .mockResolvedValueOnce({ rows: [{ total: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await service.getPaginatedReconciliationReport({
        status: "AGOTADO",
        search: "Tornillo",
        page: 2,
        pageSize: 10
      });

      // Count query should have status and search
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('"stockStatus" = $1'),
        expect.arrayContaining(["AGOTADO", "%Tornillo%"])
      );
    });

    it("aplica filtros de rango de existencias minStock y maxStock con parámetros seguros", async () => {
      vi.mocked(mockPool.query)
        .mockResolvedValueOnce({
          rows: [
            {
              totalProducts: 5,
              availableCount: 5,
              outOfStockCount: 0,
              discontinuedCount: 0,
              unmappedCount: 0
            }
          ]
        } as any)
        .mockResolvedValueOnce({ rows: [{ total: 3 }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await service.getPaginatedReconciliationReport({
        status: "TODOS",
        minStock: 10,
        maxStock: 50,
        page: 1,
        pageSize: 20
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('"supplierStock" >= $1 AND "supplierStock" <= $2'),
        [10, 50]
      );
    });

    it("aplica ordenamiento por stock ascendente para priorizar menor stock primero", async () => {
      vi.mocked(mockPool.query)
        .mockResolvedValueOnce({
          rows: [
            {
              totalProducts: 5,
              availableCount: 5,
              outOfStockCount: 0,
              discontinuedCount: 0,
              unmappedCount: 0
            }
          ]
        } as any)
        .mockResolvedValueOnce({ rows: [{ total: 5 }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await service.getPaginatedReconciliationReport({
        status: "TODOS",
        sortBy: "stock",
        sortOrder: "asc",
        page: 1,
        pageSize: 50
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY "supplierStock" ASC, "clientSku" ASC'),
        expect.any(Array)
      );
    });

    it("aplica ordenamiento por SKU descendente", async () => {
      vi.mocked(mockPool.query)
        .mockResolvedValueOnce({
          rows: [
            {
              totalProducts: 5,
              availableCount: 5,
              outOfStockCount: 0,
              discontinuedCount: 0,
              unmappedCount: 0
            }
          ]
        } as any)
        .mockResolvedValueOnce({ rows: [{ total: 5 }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await service.getPaginatedReconciliationReport({
        status: "TODOS",
        sortBy: "sku",
        sortOrder: "desc",
        page: 1,
        pageSize: 50
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY "clientSku" DESC, "supplierStock" ASC'),
        expect.any(Array)
      );
    });
  });

  describe("getExportStockItems", () => {
    it("obtiene la totalidad de registros que coinciden con los filtros sin paginación", async () => {
      const mockExportItems = [
        {
          clientSku: "CLI-1",
          clientProductName: "Prod 1",
          clientBrand: "BRAND-A",
          supplierSku: "SUP-1",
          supplierProductName: "Prod 1 Supplier",
          supplierBrand: "BRAND-A",
          supplierStock: 15,
          stockStatus: "DISPONIBLE" as const
        }
      ];

      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: mockExportItems } as any);

      const items = await service.getExportStockItems({
        status: "DISPONIBLE",
        search: "Prod",
        minStock: 5,
        maxStock: 50,
        sortBy: "stock",
        sortOrder: "asc"
      });

      expect(items).toEqual(mockExportItems);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('"supplierProductName"'),
        expect.arrayContaining(["DISPONIBLE", "%Prod%", 5, 50])
      );
      // No debe contener LIMIT ni OFFSET para exportación completa
      expect(mockPool.query).not.toHaveBeenCalledWith(
        expect.stringContaining("LIMIT")
      );
    });
  });
});

