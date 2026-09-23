import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UploadCatalogSchema,
  ResolveReviewActionSchema,
  StockReportFilterSchema
} from "../../src/types.js";
import { ingestCatalogAction } from "../../src/actions/ingest-catalog.action.js";
import { runReconciliationAction } from "../../src/actions/run-reconciliation.action.js";
import { resolveReviewAction } from "../../src/actions/resolve-review.action.js";
import { getStockReportAction } from "../../src/actions/get-stock-report.action.js";
import { exportStockCsvAction } from "../../src/actions/export-stock-csv.action.js";
import * as serviceContainer from "../../src/lib/service-container.js";
import { revalidatePath } from "next/cache";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

vi.mock("../../src/lib/service-container.js", () => ({
  getCatalogIngestionService: vi.fn(),
  getReconciliationWorker: vi.fn(),
  getProductRepository: vi.fn(),
  getStockReconciliationService: vi.fn()
}));

describe("SPEC-WEB-NEXT-011: Esquemas Zod y Contratos de UI", () => {
  describe("UploadCatalogSchema", () => {
    it("acepta archivo PDF válido con tamaño adecuado", () => {
      const validFile = new File(["dummy content"], "catalogo.pdf", {
        type: "application/pdf"
      });
      const result = UploadCatalogSchema.safeParse({
        target: "CLIENT",
        file: validFile
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.target).toBe("CLIENT");
        expect(result.data.file).toBe(validFile);
      }
    });

    it("rechaza archivo si no es PDF", () => {
      const textFile = new File(["dummy content"], "archivo.txt", {
        type: "text/plain"
      });
      const result = UploadCatalogSchema.safeParse({
        target: "CLIENT",
        file: textFile
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.file).toContain(
          "Solo se admiten documentos en formato PDF."
        );
      }
    });

    it("rechaza archivo vacío (size === 0)", () => {
      const emptyFile = new File([], "vacio.pdf", {
        type: "application/pdf"
      });
      const result = UploadCatalogSchema.safeParse({
        target: "SUPPLIER",
        file: emptyFile
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.file).toContain(
          "El archivo no puede estar vacío."
        );
      }
    });

    it("rechaza archivo que excede 25 MB", () => {
      const oversizedFile = {
        name: "grande.pdf",
        type: "application/pdf",
        size: 26 * 1024 * 1024
      };
      Object.setPrototypeOf(oversizedFile, File.prototype);

      const result = UploadCatalogSchema.safeParse({
        target: "CLIENT",
        file: oversizedFile
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.file).toContain(
          "El tamaño del archivo no puede exceder 25 MB."
        );
      }
    });

    it("rechaza target desconocido", () => {
      const validFile = new File(["dummy"], "catalogo.pdf", {
        type: "application/pdf"
      });
      const result = UploadCatalogSchema.safeParse({
        target: "INVALID_TARGET",
        file: validFile
      });

      expect(result.success).toBe(false);
    });
  });

  describe("ResolveReviewActionSchema", () => {
    it("valida payload correcto con resolution CONFIRMED y REJECTED", () => {
      const confirmed = ResolveReviewActionSchema.safeParse({
        clientSku: "CLI-100",
        supplierSku: "SUP-200",
        resolution: "CONFIRMED",
        reviewer: "auditor@empresa.com"
      });
      expect(confirmed.success).toBe(true);

      const rejected = ResolveReviewActionSchema.safeParse({
        clientSku: "CLI-100",
        supplierSku: null,
        resolution: "REJECTED",
        reviewer: "auditor@empresa.com"
      });
      expect(rejected.success).toBe(true);
    });

    it("rechaza reviewer vacío o nulo", () => {
      const result = ResolveReviewActionSchema.safeParse({
        clientSku: "CLI-100",
        supplierSku: "SUP-200",
        resolution: "CONFIRMED",
        reviewer: ""
      });
      expect(result.success).toBe(false);
    });

    it("rechaza clientSku vacío", () => {
      const result = ResolveReviewActionSchema.safeParse({
        clientSku: "",
        supplierSku: "SUP-200",
        resolution: "CONFIRMED",
        reviewer: "auditor"
      });
      expect(result.success).toBe(false);
    });
  });

  describe("StockReportFilterSchema", () => {
    it("aplica valores por defecto si no se especifican", () => {
      const result = StockReportFilterSchema.parse({});
      expect(result.status).toBe("TODOS");
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(result.search).toBeUndefined();
    });

    it("coacciona números en cadenas a enteros para page y pageSize", () => {
      const result = StockReportFilterSchema.parse({
        page: "3",
        pageSize: "25",
        status: "AGOTADO",
        search: "Galaxy"
      });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(25);
      expect(result.status).toBe("AGOTADO");
      expect(result.search).toBe("Galaxy");
    });

    it("rechaza pageSize mayor a 100", () => {
      const result = StockReportFilterSchema.safeParse({
        pageSize: 150
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("SPEC-WEB-NEXT-011: Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ingestCatalogAction", () => {
    it("rechaza archivo que no sea PDF sin invocar el servicio de ingesta", async () => {
      const formData = new FormData();
      const fakeFile = new File(["dummy content"], "documento.txt", {
        type: "text/plain"
      });
      formData.append("file", fakeFile);
      formData.append("target", "CLIENT");

      const result = await ingestCatalogAction(null, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Datos de formulario inválidos.");
      expect(result.fieldErrors?.file).toBeDefined();
      expect(serviceContainer.getCatalogIngestionService).not.toHaveBeenCalled();
    });

    it("procesa archivo PDF válido, invalida rutas y retorna métricas de ingesta", async () => {
      const mockSummary = {
        target: "CLIENT" as const,
        totalPages: 2,
        extractedCount: 50,
        persistedCount: 50,
        discardedCount: 0,
        executionTimeMs: 120
      };

      const mockService = {
        processCatalogPdf: vi.fn().mockResolvedValue(mockSummary)
      };
      vi.mocked(serviceContainer.getCatalogIngestionService).mockReturnValue(
        mockService as any
      );

      const formData = new FormData();
      const validPdf = new File(["%PDF-1.4 dummy"], "catalogo.pdf", {
        type: "application/pdf"
      });
      formData.append("file", validPdf);
      formData.append("target", "CLIENT");

      const result = await ingestCatalogAction(null, formData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSummary);
      expect(mockService.processCatalogPdf).toHaveBeenCalledTimes(1);
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/ingest");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/stock");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/audit");
    });

    it("captura excepciones del servicio y retorna mensaje de error controlado", async () => {
      const mockService = {
        processCatalogPdf: vi.fn().mockRejectedValue(new Error("Fallo de parseo de documento"))
      };
      vi.mocked(serviceContainer.getCatalogIngestionService).mockReturnValue(
        mockService as any
      );

      const formData = new FormData();
      const validPdf = new File(["dummy"], "catalogo.pdf", {
        type: "application/pdf"
      });
      formData.append("file", validPdf);
      formData.append("target", "SUPPLIER");

      const result = await ingestCatalogAction(null, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Fallo de parseo de documento");
    });
  });

  describe("runReconciliationAction", () => {
    it("ejecuta lote de reconciliación, invalida caché y retorna métricas", async () => {
      const mockWorkerResult = { processed: 15, resolved: 12 };
      const mockWorker = {
        runBatch: vi.fn().mockResolvedValue(mockWorkerResult)
      };
      vi.mocked(serviceContainer.getReconciliationWorker).mockReturnValue(
        mockWorker as any
      );

      const result = await runReconciliationAction();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWorkerResult);
      expect(mockWorker.runBatch).toHaveBeenCalledTimes(1);
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/audit");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/stock");
    });

    it("maneja errores de ejecución del worker sin exponer excepciones no controladas", async () => {
      const mockWorker = {
        runBatch: vi.fn().mockRejectedValue(new Error("Timeout de concurrencia"))
      };
      vi.mocked(serviceContainer.getReconciliationWorker).mockReturnValue(
        mockWorker as any
      );

      const result = await runReconciliationAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Timeout de concurrencia");
    });
  });

  describe("resolveReviewAction", () => {
    it("rechaza payload con campos incompletos", async () => {
      const result = await resolveReviewAction({
        clientSku: "",
        supplierSku: null,
        resolution: "CONFIRMED",
        reviewer: ""
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Payload de resolución inválido.");
      expect(result.fieldErrors).toBeDefined();
    });

    it("persiste resolución de auditoría e invalida rutas de vistas afectadas", async () => {
      const mockRepository = {
        resolveAuditReview: vi.fn().mockResolvedValue(undefined)
      };
      vi.mocked(serviceContainer.getProductRepository).mockReturnValue(
        mockRepository as any
      );

      const result = await resolveReviewAction({
        clientSku: "CLI-001",
        supplierSku: "SUP-001",
        resolution: "CONFIRMED",
        reviewer: "auditor@org.com"
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ clientSku: "CLI-001", status: "CONFIRMED" });
      expect(mockRepository.resolveAuditReview).toHaveBeenCalledWith(
        "CLI-001",
        "SUP-001",
        "CONFIRMED",
        "auditor@org.com"
      );
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/audit");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/stock");
    });

    it("maneja fallo de persistencia en repositorio", async () => {
      const mockRepository = {
        resolveAuditReview: vi.fn().mockRejectedValue(new Error("Error de base de datos"))
      };
      vi.mocked(serviceContainer.getProductRepository).mockReturnValue(
        mockRepository as any
      );

      const result = await resolveReviewAction({
        clientSku: "CLI-001",
        supplierSku: null,
        resolution: "REJECTED",
        reviewer: "auditor@org.com"
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Error de base de datos");
    });
  });

  describe("getStockReportAction", () => {
    it("rechaza filtros no válidos", async () => {
      const result = await getStockReportAction({
        status: "ESTADO_INVALIDO" as any,
        page: -1
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Filtros de inventario inválidos.");
    });

    it("obtiene reporte consolidado con filtros correctos", async () => {
      const mockReport = {
        items: [
          {
            clientSku: "CLI-10",
            clientProductName: "Tornillo",
            supplierSku: "SUP-10",
            supplierStock: 100,
            stockStatus: "DISPONIBLE" as const
          }
        ],
        pagination: {
          currentPage: 1,
          pageSize: 50,
          totalItems: 1,
          totalPages: 1
        },
        metrics: {
          totalProducts: 1,
          availableCount: 1,
          outOfStockCount: 0,
          discontinuedCount: 0,
          unmappedCount: 0
        }
      };

      const mockStockService = {
        getPaginatedReconciliationReport: vi.fn().mockResolvedValue(mockReport)
      };
      vi.mocked(serviceContainer.getStockReconciliationService).mockReturnValue(
        mockStockService as any
      );

      const result = await getStockReportAction({
        status: "DISPONIBLE",
        page: 1,
        pageSize: 50
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReport);
      expect(mockStockService.getPaginatedReconciliationReport).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "DISPONIBLE",
          page: 1,
          pageSize: 50
        })
      );
    });

    it("maneja fallo del servicio de stock", async () => {
      const mockStockService = {
        getPaginatedReconciliationReport: vi
          .fn()
          .mockRejectedValue(new Error("Conexión perdida"))
      };
      vi.mocked(serviceContainer.getStockReconciliationService).mockReturnValue(
        mockStockService as any
      );

      const result = await getStockReportAction({
        status: "TODOS",
        page: 1,
        pageSize: 50
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Conexión perdida");
    });
  });

  describe("exportStockCsvAction", () => {
    it("genera archivo CSV formateado con BOM UTF-8 y columnas descriptivas", async () => {
      const mockItems = [
        {
          clientSku: "FP-50100",
          clientProductName: "BOMBA GASOLINA TOYOTA",
          clientBrand: "PORTER",
          supplierSku: "FP-50100",
          supplierProductName: "BOMBA GASOLINA PILA 4RUNNER",
          supplierBrand: "PORTER",
          supplierStock: 1,
          stockStatus: "DISPONIBLE" as const
        },
        {
          clientSku: "FP-50100-KIT",
          clientProductName: 'KIT REPARACION 33" ACCEL',
          clientBrand: "PORTER",
          supplierSku: null,
          supplierProductName: null,
          supplierBrand: null,
          supplierStock: 0,
          stockStatus: "NO_CATALOGADO" as const
        }
      ];

      const mockStockService = {
        getExportStockItems: vi.fn().mockResolvedValue(mockItems)
      };
      vi.mocked(serviceContainer.getStockReconciliationService).mockReturnValue(
        mockStockService as any
      );

      const result = await exportStockCsvAction({
        status: "DISPONIBLE",
        page: 1,
        pageSize: 50
      });

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.totalItems).toBe(2);
        // Debe iniciar con el BOM UTF-8
        expect(result.data.csvContent.startsWith("\uFEFF")).toBe(true);
        // Cabeceras esperadas
        expect(result.data.csvContent).toContain("SKU Cliente");
        expect(result.data.csvContent).toContain("Producto Proveedor");
        expect(result.data.csvContent).toContain("Estado Mapeo");
        // Valores formateados
        expect(result.data.csvContent).toContain('"Disponible"');
        expect(result.data.csvContent).toContain('"Conciliado"');
        expect(result.data.csvContent).toContain('"Sin Equivalente"');
        // Escapado de comillas dobles
        expect(result.data.csvContent).toContain('33"" ACCEL');
        expect(result.data.filename).toMatch(/^reporte_stock_disponible_\d{4}-\d{2}-\d{2}_\d{4}\.csv$/);
      }
    });

    it("exporta la totalidad del catálogo cuando scope es ALL", async () => {
      const mockStockService = {
        getExportStockItems: vi.fn().mockResolvedValue([])
      };
      vi.mocked(serviceContainer.getStockReconciliationService).mockReturnValue(
        mockStockService as any
      );

      const result = await exportStockCsvAction(
        {
          status: "AGOTADO",
          page: 2,
          pageSize: 20
        },
        "ALL"
      );

      expect(result.success).toBe(true);
      expect(mockStockService.getExportStockItems).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "TODOS",
          search: undefined,
          minStock: undefined,
          maxStock: undefined
        })
      );
      if (result.success && result.data) {
        expect(result.data.filename).toContain("catalogo_completo");
      }
    });

    it("valida filtros inválidos rechazando la ejecución", async () => {
      const result = await exportStockCsvAction({
        status: "ESTADO_INVALIDO" as any,
        page: -1 as any,
        pageSize: 50
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Parámetros de filtrado no válidos para la exportación.");
    });
  });
});
