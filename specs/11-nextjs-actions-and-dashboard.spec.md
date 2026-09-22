Integración Web: Server Actions, Contratos de UI y Tableros en Next.jsMetadatoDetalleIdentificador de SpecSPEC-WEB-NEXT-011Versión1.0.0Requerimientos AsociadosRF-04, RF-05, RF-06, RF-07, RF-08, RNF-01, RNF-04Módulos Targetsrc/actions/*.ts, src/app/dashboard/**/*.{tsx,ts}, src/types.tsDependencias Externasnext (App Router), react, zod, tailwind-merge, clsx1. Alcance y PropósitoDefinir los contratos fuertemente tipados, las Server Actions y la arquitectura de componentes para la capa de presentación web en Next.js (App Router).Esta especificación cubre:Las Server Actions que actúan como adaptadores entre las peticiones HTTP del navegador y los servicios de dominio del sistema (CatalogIngestionService, CatalogReconciliationWorker, PostgresProductRepository, PostgresStockReconciliationService).Los contratos de transferencia de datos de vista (View DTOs) y esquemas Zod para la interacción del usuario.El diseño de las tres vistas operativas principales:Centro de Ingesta: Carga asíncrona de archivos PDF en memoria y reporte de métricas.Bandeja de Auditoría (Human-in-the-Loop): Resolución manual de productos en estado REQUIRES_REVIEW.Tablero de Stock y Quiebres: Visualización, filtrado relacional y exportación de inventario.Criterios de aceptación expresados en formato BDD (Given-When-Then).2. Contratos de Dominio y View DTOs (src/types.ts)Los siguientes tipos deben residir de forma centralizada en src/types.ts para mantener la regla de Única Fuente de Verdad (SSOT):TypeScriptimport { z } from "zod";
import { CatalogTargetSchema, IngestionSummary, MappingStatus, StockStatus } from "./types";

// 1. Contrato genérico de respuesta para Server Actions
export type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; fieldErrors?: Record<string, string[]>; data?: never };

// 2. Validación de subida de archivos
export const UploadCatalogSchema = z.object({
  target: CatalogTargetSchema,
  file: z
    .custom<File>((val) => val instanceof File, "Se requiere un archivo válido.")
    .refine((file) => file.size > 0, "El archivo no puede estar vacío.")
    .refine(
      (file) => file.size <= 25 * 1024 * 1024,
      "El tamaño del archivo no puede exceder 25 MB."
    )
    .refine(
      (file) => file.type === "application/pdf" || file.name.endsWith(".pdf"),
      "Solo se admiten documentos en formato PDF."
    )
});
export type UploadCatalogInput = z.infer<typeof UploadCatalogSchema>;

// 3. DTO para la bandeja de auditoría Human-in-the-Loop
export interface AuditItemViewDTO {
  id: string;
  clientSku: string;
  clientProductName: string;
  supplierSku: string | null;
  supplierProductName: string | null;
  confidenceScore: number;
  status: MappingStatus;
  discrepancyReason: string;
  createdAt: Date;
}

export const ResolveReviewActionSchema = z.object({
  clientSku: z.string().min(1, "El SKU de cliente es obligatorio."),
  supplierSku: z.string().nullable(),
  resolution: z.enum(["CONFIRMED", "REJECTED"]),
  reviewer: z.string().min(1, "El identificador del revisor es obligatorio.")
});
export type ResolveReviewActionInput = z.infer<typeof ResolveReviewActionSchema>;

// 4. DTO y Filtros para el Tablero de Stock
export const StockReportFilterSchema = z.object({
  status: z.enum(["TODOS", "DISPONIBLE", "AGOTADO", "DESCATALOGADO_PROVEEDOR", "NO_CATALOGADO"]).default("TODOS"),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50)
});
export type StockReportFilterInput = z.infer<typeof StockReportFilterSchema>;

export interface StockReportPaginatedResult {
  items: Array<{
    clientSku: string;
    clientProductName: string;
    supplierSku: string | null;
    supplierStock: number;
    stockStatus: StockStatus;
  }>;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  metrics: {
    totalProducts: number;
    availableCount: number;
    outOfStockCount: number;
    discontinuedCount: number;
    unmappedCount: number;
  };
}
3. Especificación de Server Actions (src/actions/)Todas las acciones deben implementarse con directiva "use server" en módulos desacoplados dentro de src/actions/. Deben validar entradas con Zod, manejar excepciones de red/persistencia sin exponer stack traces al cliente y ejecutar invalidación de caché vía revalidatePath.3.1 Ingesta de Catálogo (src/actions/ingest-catalog.action.ts)TypeScript"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, IngestionSummary, UploadCatalogSchema } from "../types";
import { getCatalogIngestionService } from "../lib/service-container";

export async function ingestCatalogAction(
  prevState: ActionResult<IngestionSummary> | null,
  formData: FormData
): Promise<ActionResult<IngestionSummary>> {
  const rawInput = {
    target: formData.get("target"),
    file: formData.get("file")
  };

  const validation = UploadCatalogSchema.safeParse(rawInput);
  if (!validation.success) {
    return {
      success: false,
      error: "Datos de formulario inválidos.",
      fieldErrors: validation.error.flatten().fieldErrors
    };
  }

  const { target, file } = validation.data;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const ingestionService = getCatalogIngestionService();
    const summary = await ingestionService.processCatalogPdf(arrayBuffer, target);

    revalidatePath("/dashboard/ingest");
    revalidatePath("/dashboard/stock");
    revalidatePath("/dashboard/audit");

    return {
      success: true,
      data: summary
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Fallo crítico durante el procesamiento del archivo PDF."
    };
  }
}
3.2 Ejecución del Worker de Reconciliación (src/actions/run-reconciliation.action.ts)TypeScript"use server";

import { revalidatePath } from "next/cache";
import { ActionResult } from "../types";
import { getReconciliationWorker } from "../lib/service-container";

export interface ReconciliationBatchResult {
  processed: number;
  resolved: number;
}

export async function runReconciliationAction(): Promise<ActionResult<ReconciliationBatchResult>> {
  try {
    const worker = getReconciliationWorker();
    const result = await worker.runBatch();

    revalidatePath("/dashboard/audit");
    revalidatePath("/dashboard/stock");

    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Fallo crítico al ejecutar el ciclo de conciliación de catálogos."
    };
  }
}
3.3 Resolución Manual Human-in-the-Loop (src/actions/resolve-review.action.ts)TypeScript"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, ResolveReviewActionInput, ResolveReviewActionSchema } from "../types";
import { getProductRepository } from "../lib/service-container";

export async function resolveReviewAction(
  payload: ResolveReviewActionInput
): Promise<ActionResult<{ clientSku: string; status: string }>> {
  const validation = ResolveReviewActionSchema.safeParse(payload);
  if (!validation.success) {
    return {
      success: false,
      error: "Payload de resolución inválido.",
      fieldErrors: validation.error.flatten().fieldErrors
    };
  }

  const { clientSku, supplierSku, resolution, reviewer } = validation.data;

  try {
    const repository = getProductRepository();
    await repository.resolveAuditReview(clientSku, supplierSku, resolution, reviewer);

    revalidatePath("/dashboard/audit");
    revalidatePath("/dashboard/stock");

    return {
      success: true,
      data: { clientSku, status: resolution }
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Fallo al persistir la decisión de auditoría."
    };
  }
}
3.4 Consulta de Inventario Consolidado (src/actions/get-stock-report.action.ts)TypeScript"use server";

import { ActionResult, StockReportFilterInput, StockReportFilterSchema, StockReportPaginatedResult } from "../types";
import { getStockReconciliationService } from "../lib/service-container";

export async function getStockReportAction(
  filters: StockReportFilterInput
): Promise<ActionResult<StockReportPaginatedResult>> {
  const validation = StockReportFilterSchema.safeParse(filters);
  if (!validation.success) {
    return {
      success: false,
      error: "Filtros de inventario inválidos.",
      fieldErrors: validation.error.flatten().fieldErrors
    };
  }

  try {
    const stockService = getStockReconciliationService();
    const report = await stockService.getPaginatedReconciliationReport(validation.data);

    return {
      success: true,
      data: report
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Error al obtener el reporte consolidado de stock."
    };
  }
}
4. Contenedor de Dependencias Web (src/lib/service-container.ts)Aplica el principio de Inversión de Dependencias (DIP) para instanciar repositorios y servicios sin regenerar conexiones por petición en runtime de Node.js:TypeScriptimport { Pool } from "pg";
import { loadConfig } from "../config";
import { PostgresProductRepository } from "../product.repository";
import { JevSystemOneMatcher } from "../jev-matcher.service";
import { CatalogReconciliationWorker } from "../reconciliation.worker";
import { PostgresStockReconciliationService } from "../stock-reconciliation.service";
import { UnpdfExtractor } from "../ingestion/unpdf-extractor";
import { CatalogIngestionService } from "../ingestion/catalog-ingestion.service";

let poolInstance: Pool | null = null;

function getDbPool(): Pool {
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
  const matcher = new JevSystemOneMatcher(config.JEV_MODEL_ID);
  return new CatalogReconciliationWorker(repo, matcher, config);
}

export function getStockReconciliationService(): PostgresStockReconciliationService {
  return new PostgresStockReconciliationService(getDbPool());
}
5. Arquitectura de Vistas (Next.js App Router)Plaintextsrc/app/
├── layout.tsx                     # Root Layout (Fuentes, estilos globales)
└── dashboard/
    ├── layout.tsx                 # Dashboard Layout (Sidebar de navegación, encabezado)
    ├── ingest/
    │   └── page.tsx               # Vista 1: Carga de catálogos y resumen de métricas
    ├── audit/
    │   ├── page.tsx               # Vista 2: Servidor (RSC) para carga inicial
    │   └── audit-table.client.tsx # Cliente con transiciones optimistas
    └── stock/
        ├── page.tsx               # Vista 3: Servidor (RSC) con filtros de URL
        └── stock-table.client.tsx # Cliente con paginación y exportación CSV
5.1 Vista 1: Centro de Ingesta (/dashboard/ingest)Zona de Arrastre (Dropzone): Acepta archivos mediante arrastre o selección tradicional; valida en el cliente tamaño $\le 25\text{ MB}$ y MIME application/pdf.Selector de Rol: Botones de alternancia para CLIENT (Catálogo Base) y SUPPLIER (Lista Proveedor con Stock).Indicador de Proceso: Renderiza estados pendientes mediante useActionState. Al culminar exitosamente, muestra un panel de métricas estructurado (IngestionSummary):Total de páginas analizadas.Registros extraídos y normalizados.Registros persistidos/actualizados en base de datos.Registros descartados por falta de formato tabular.Tiempo de ejecución en milisegundos.5.2 Vista 2: Bandeja de Auditoría Human-in-the-Loop (/dashboard/audit)Filtro de Estado: Consulta exclusivamente registros con status = 'REQUIRES_REVIEW'.Diseño Comparativo: Presenta tarjetas o filas en tabla con las columnas:Cliente: SKU original y denominación sanitizada.Proveedor: SKU candidato y denominación sanitizada.Diagnóstico Jev: Score de certeza (ej. 0.78) y etiqueta de discrepancia (PACKAGING_DIFFERENCE, VARIANT_MISMATCH).Acciones:Botón "Confirmar Equivalencia" $\rightarrow$ Despacha resolveReviewAction con resolution: 'CONFIRMED'.Botón "Rechazar Candidato" $\rightarrow$ Despacha resolveReviewAction con resolution: 'REJECTED'.Optimismo en UI: Uso de useOptimistic o actualización local tras la confirmación de la Server Action, retirando la fila sin obligar a una recarga completa de la página.5.3 Vista 3: Tablero de Inventario y Quiebres (/dashboard/stock)Sincronización con URL SearchParams: Filtros por estado (TODOS, DISPONIBLE, AGOTADO, DESCATALOGADO_PROVEEDOR, NO_CATALOGADO), búsqueda textual por nombre/SKU y paginación sincronizada en la URL (?status=AGOTADO&page=2).Métricas Superiores:Tarjetas resumen con totales: Total Catálogo, Disponibles, Agotados, Descatalogados, Sin Mapear.Tabla de Resultados: Visualización del stock actual del proveedor con distintivos semánticos:DISPONIBLE: Insignia verde.AGOTADO: Insignia roja.DESCATALOGADO_PROVEEDOR: Insignia gris.NO_CATALOGADO: Insignia ámbar.Exportador a CSV: Generación determinista de un archivo .csv descargable en el navegador a partir del conjunto de datos filtrado.6. Invariantes y Reglas de NegocioAislamiento en Memoria: Los archivos PDF subidos no deben escribirse en el sistema de archivos local (fs.writeFile), sino consumirse directamente como ArrayBuffer en memoria y liberarse tras el parseo.Autoría en Auditoría: Toda invocación a resolveReviewAction debe asociar obligatoriamente un nombre o ID de revisor no nulo (reviewer), asegurando el cumplimiento de RF-07.Consistencia de Rutas tras Mutación: Cada mutación exitosa mediante Server Actions debe invocar revalidatePath sobre las vistas afectadas para invalidar la caché del router de Next.js y reflejar el estado real de PostgreSQL.Respeto a Principios de Diseño: Prohibido el uso de valores quemados para cadenas de conexión o nombres de modelos en componentes; toda configuración operativa debe fluir a través de src/config.ts.7. Criterios de Aceptación (Escenarios BDD)Escenario 1: Subida de catálogo PDF de proveedor con confirmación visualGIVEN un usuario autenticado en la ruta /dashboard/ingest.WHEN selecciona un archivo lista_proveedor.pdf de 4 MB, marca el destino SUPPLIER y envía el formulario.THEN la Server Action ingestCatalogAction valida el esquema Zod sin errores.AND procesa el documento extrayendo los productos y actualizando supplier_products.AND la interfaz muestra el resumen con persistedCount coincidente y estado de éxito.Escenario 2: Rechazo de archivos no soportadosGIVEN un usuario en /dashboard/ingest.WHEN intenta enviar un archivo catalogo.xlsx o un archivo superior a 25 MB.THEN la Server Action aborta la ejecución con success: false.AND devuelve el mensaje: "Solo se admiten documentos en formato PDF" o "El tamaño del archivo no puede exceder 25 MB".AND la interfaz renderiza el mensaje de error en el campo correspondiente sin realizar mutaciones en la base de datos.Escenario 3: Resolución manual de discrepancia en auditoríaGIVEN un producto con SKU CLI-001 y candidato SUP-001 en estado REQUIRES_REVIEW.WHEN el operador pulsa el botón "Confirmar Equivalencia" en /dashboard/audit.THEN se dispara resolveReviewAction con resolution: 'CONFIRMED'.AND el registro en product_mappings se actualiza con status = 'CONFIRMED' y la fecha de revisión.AND la fila desaparece de la vista /dashboard/audit.AND el producto pasa a estar disponible para el cálculo determinista de stock en /dashboard/stock.Escenario 4: Filtrado y exportación de stockGIVEN 1.000 productos mapeados en la base de datos.WHEN el usuario navega a /dashboard/stock?status=AGOTADO.THEN el componente de servidor solicita exclusivamente registros donde supplier_stock = 0 y status = 'CONFIRMED'.AND la tabla renderiza únicamente los productos agotados con latencia sub-200ms.AND al presionar "Exportar CSV", se descarga un archivo con exactamente los mismos registros filtrados.8. Estrategia de Pruebas Unitarias para Server ActionsLas Server Actions deben validarse de forma aislada en Vitest mockeando los servicios del contenedor:TypeScriptimport { describe, it, expect, vi, beforeEach } from "vitest";
import { ingestCatalogAction } from "./ingest-catalog.action";
import * as container from "../lib/service-container";

vi.mock("../lib/service-container", () => ({
  getCatalogIngestionService: vi.fn()
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

describe("ingestCatalogAction", () => {
  it("debe rechazar archivos que no sean PDF", async () => {
    const formData = new FormData();
    const fakeFile = new File(["dummy"], "archivo.txt", { type: "text/plain" });
    formData.append("file", fakeFile);
    formData.append("target", "CLIENT");

    const result = await ingestCatalogAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Datos de formulario inválidos.");
    expect(result.fieldErrors?.file).toBeDefined();
  });
});