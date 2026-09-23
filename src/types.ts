import { z } from "zod";

/**
 * Esquema de validación y contrato para el resultado de inferencia de Sistema 1 con Jev.
 */
export const ProductMatchResultSchema = z.object({
  isMatch: z
    .boolean()
    .describe("Indica si ambos registros corresponden al mismo producto comercial."),
  confidenceScore: z
    .number()
    .min(0.0)
    .max(1.0)
    .describe("Nivel de certeza de la inferencia, normalizado de 0.0 a 1.0."),
  matchType: z
    .enum(["EXACT_CODE", "EQUIVALENT_VARIANT", "DIFFERENT_PRODUCT"])
    .describe("Clasificación de equivalencia entre ambos productos."),
  discrepancyReason: z
    .enum([
      "NONE",
      "PACKAGING_DIFFERENCE",
      "SPECIFICATION_MISMATCH",
      "BRAND_MISMATCH",
      "VARIANT_MISMATCH",
      "NO_CANDIDATES_FOUND"
    ])
    .describe("Causal formal de la discrepancia identificada.")
});

export type ProductMatchResult = z.infer<typeof ProductMatchResultSchema>;

/**
 * Estados del ciclo de vida de un mapeo de catálogo.
 */
export type MappingStatus = "CONFIRMED" | "REQUIRES_REVIEW" | "REJECTED";

/**
 * Estados calculados del inventario consolidado en Fase 2.
 */
export type StockStatus =
  | "NO_CATALOGADO"
  | "DESCATALOGADO_PROVEEDOR"
  | "AGOTADO"
  | "DISPONIBLE";

/**
 * Entidad del producto perteneciente a la organización cliente.
 */
export interface ClientProduct {
  id: string;
  sku: string;
  normalizedSku: string;
  name: string;
  brand?: string | null;
  createdAt?: Date;
}

/**
 * Entidad del producto provisto por el proveedor externo.
 */
export interface SupplierProduct {
  id: string;
  sku: string;
  normalizedSku: string;
  name: string;
  brand?: string | null;
  currentStock: number;
  updatedAt?: Date;
}

/**
 * Candidato del catálogo de proveedores obtenido mediante búsqueda léxica trigrama.
 */
export interface SupplierCandidate {
  sku: string;
  normalizedSku: string;
  name: string;
  brand?: string | null;
  similarityScore: number;
}

export type BrandAliasMap = Record<string, string[]>;

export interface SkuDecomposition {
  rootSku: string;
  brandToken: string | null;
  baseCode: string;
}

/**
 * Registro de persistencia para una resolución semántica entre cliente y proveedor.
 */
export interface MappingRecord {
  clientSku: string;
  supplierSku: string | null;
  confidenceScore: number;
  status: MappingStatus;
  discrepancyReason: string;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * DTO para la conciliación determinista de existencias en Fase 2.
 */
export interface StockReconciliationItem {
  clientSku: string;
  clientProductName: string;
  clientBrand?: string | null;
  supplierSku: string | null;
  supplierProductName?: string | null;
  supplierBrand?: string | null;
  supplierStock: number;
  stockStatus: StockStatus;
}

/**
 * Parámetros para la resolución manual de auditoría Human-in-the-Loop.
 */
export interface AuditReviewPayload {
  clientSku: string;
  targetStatus: "CONFIRMED" | "REJECTED";
  reviewerEmail: string;
}

/**
 * Esquema y tipo para el destino de ingesta del catálogo.
 */
export const CatalogTargetSchema = z.enum(["CLIENT", "SUPPLIER"]);
export type CatalogTarget = z.infer<typeof CatalogTargetSchema>;

/**
 * Esquema y tipo para cada ítem extraído del catálogo en PDF.
 */
export const ExtractedCatalogItemSchema = z.object({
  rawSku: z.string().min(1).describe("Código o referencia original detectada en el documento."),
  rawName: z.string().min(1).describe("Descripción o denominación del producto."),
  rawBrand: z.string().optional().describe("Marca comercial detectada en el documento."),
  stock: z.number().int().nonnegative().optional().default(0).describe("Cantidad en existencia (aplica prioritariamente a proveedores).")
});
export type ExtractedCatalogItem = z.infer<typeof ExtractedCatalogItemSchema>;

/**
 * Esquema y tipo para el resumen estructurado de ingesta.
 */
export const IngestionSummarySchema = z.object({
  target: CatalogTargetSchema,
  totalPages: z.number().int().nonnegative(),
  extractedCount: z.number().int().nonnegative(),
  persistedCount: z.number().int().nonnegative(),
  discardedCount: z.number().int().nonnegative(),
  executionTimeMs: z.number().nonnegative()
});
export type IngestionSummary = z.infer<typeof IngestionSummarySchema>;

/**
 * Contrato para el extractor de contenido textual de catálogos PDF.
 */
export interface IPdfExtractor {
  extractItems(pdfBuffer: ArrayBuffer): Promise<{ items: ExtractedCatalogItem[]; totalPages: number }>;
}

/**
 * Contrato para el servicio de orquestación de ingesta de catálogos.
 */
export interface ICatalogIngestionService {
  processCatalogPdf(
    buffer: ArrayBuffer,
    target: CatalogTarget
  ): Promise<IngestionSummary>;
}

/**
 * Contrato genérico de respuesta estructurada para Server Actions.
 */
export type ActionResult<T> =
  | { success: true; data: T; error?: never; fieldErrors?: never }
  | { success: false; error: string; fieldErrors?: Record<string, string[] | undefined>; data?: never };

/**
 * Esquema de validación para carga de archivos de catálogo en PDF.
 */
export const UploadCatalogSchema = z.object({
  target: CatalogTargetSchema,
  file: z
    .custom<File>((val) => typeof File !== "undefined" && val instanceof File, "Se requiere un archivo válido.")
    .refine(
      (file) => typeof file === "object" && file !== null && "size" in file && (file as File).size > 0,
      "El archivo no puede estar vacío."
    )
    .refine(
      (file) => typeof file === "object" && file !== null && "size" in file && (file as File).size <= 25 * 1024 * 1024,
      "El tamaño del archivo no puede exceder 25 MB."
    )
    .refine(
      (file) =>
        typeof file === "object" &&
        file !== null &&
        "type" in file &&
        "name" in file &&
        ((file as File).type === "application/pdf" || (file as File).name.endsWith(".pdf")),
      "Solo se admiten documentos en formato PDF."
    )
});
export type UploadCatalogInput = z.infer<typeof UploadCatalogSchema>;

/**
 * DTO enriquecido para la visualización en la bandeja de auditoría Human-in-the-Loop.
 */
export interface AuditItemViewDTO {
  id: string;
  clientSku: string;
  clientProductName: string;
  clientBrand?: string | null;
  supplierSku: string | null;
  supplierProductName: string | null;
  supplierBrand?: string | null;
  confidenceScore: number;
  status: MappingStatus;
  discrepancyReason: string;
  createdAt: Date;
}

/**
 * Esquema de validación para la acción de resolución manual de auditoría.
 */
export const ResolveReviewActionSchema = z.object({
  clientSku: z.string().min(1, "El SKU de cliente es obligatorio."),
  supplierSku: z.string().nullable().optional(),
  resolution: z.enum(["CONFIRMED", "REJECTED"]),
  reviewer: z.string().min(1, "El identificador del revisor es obligatorio.")
});
export type ResolveReviewActionInput = z.infer<typeof ResolveReviewActionSchema>;

/**
 * Esquema de validación para filtros y paginación de la bandeja de auditoría.
 */
export const AuditReportFilterSchema = z.object({
  tab: z.enum(["REVIEW", "REJECTED"]).default("REVIEW"),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50)
});
export type AuditReportFilterInput = z.infer<typeof AuditReportFilterSchema>;

/**
 * Resultado paginado y métricas consolidadas de la bandeja de auditoría.
 */
export interface AuditPaginatedResult {
  items: AuditItemViewDTO[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  metrics: {
    confirmed: number;
    requiresReview: number;
    rejected: number;
    totalClient: number;
  };
}

/**
 * Esquema de validación para filtros y paginación del tablero de stock.
 */
export const StockReportFilterSchema = z.object({
  status: z
    .enum(["TODOS", "DISPONIBLE", "AGOTADO", "DESCATALOGADO_PROVEEDOR", "NO_CATALOGADO"])
    .default("TODOS"),
  search: z.string().optional(),
  minStock: z.coerce.number().int().nonnegative().optional(),
  maxStock: z.coerce.number().int().nonnegative().optional(),
  sortBy: z.enum(["sku", "stock"]).default("stock"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50)
});
export type StockReportFilterInput = z.infer<typeof StockReportFilterSchema>;

/**
 * Resultado paginado y métricas consolidadas del reporte de inventario.
 */
export interface StockReportPaginatedResult {
  items: Array<{
    clientSku: string;
    clientProductName: string;
    clientBrand?: string | null;
    supplierSku: string | null;
    supplierProductName?: string | null;
    supplierBrand?: string | null;
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

/**
 * Contrato de la capa de persistencia para productos y resoluciones.
 */
export interface IProductRepository {
  getUnmappedClientProducts(limit: number): Promise<ClientProduct[]>;
  findSupplierCandidates(
    clientProductName: string,
    similarityThreshold: number,
    limit: number,
    clientNormalizedSku?: string,
    clientBrand?: string | null,
    clientRootSku?: string,
    excludedSupplierSkus?: string[],
    compatibleBrands?: string[]
  ): Promise<SupplierCandidate[]>;
  getRejectedSupplierSkus?(clientSku: string): Promise<string[]>;
  saveMapping(record: MappingRecord): Promise<void>;
  getPendingReviews(limit: number): Promise<MappingRecord[]>;
  getAuditItemsView(limit: number, status?: MappingStatus): Promise<AuditItemViewDTO[]>;
  getPaginatedAuditItems(filters: AuditReportFilterInput): Promise<AuditPaginatedResult>;
  resetRejectedMappings(): Promise<number>;
  getMappingStatusCounts(): Promise<{
    confirmed: number;
    requiresReview: number;
    rejected: number;
    totalClient: number;
  }>;
  resolveAuditReview(
    clientSku: string,
    statusOrSupplierSku: string | null | "CONFIRMED" | "REJECTED",
    statusOrReviewer: "CONFIRMED" | "REJECTED" | string,
    reviewer?: string
  ): Promise<void>;
  bulkUpsertClientProducts(
    items: Array<{ sku: string; normalizedSku: string; name: string; brand?: string | null }>
  ): Promise<number>;
  bulkUpsertSupplierProducts(
    items: Array<{ sku: string; normalizedSku: string; name: string; brand?: string | null; currentStock: number }>
  ): Promise<number>;
}

/**
 * Contrato del servicio de inferencia determinista con IA.
 */
export interface IAiMatcherService {
  evaluateMatch(
    clientProduct: ClientProduct,
    candidate: SupplierCandidate
  ): Promise<ProductMatchResult>;
}

/**
 * Contrato del servicio de consulta determinista de stock (Fase 2).
 */
export interface IStockReconciliationService {
  getReconciledStock(): Promise<StockReconciliationItem[]>;
  getPaginatedReconciliationReport(
    filters: StockReportFilterInput
  ): Promise<StockReportPaginatedResult>;
  getExportStockItems(
    filters: Omit<StockReportFilterInput, "page" | "pageSize">
  ): Promise<StockReconciliationItem[]>;
}
