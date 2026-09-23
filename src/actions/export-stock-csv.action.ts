"use server";

import { ActionResult, StockReportFilterInput, StockReportFilterSchema, StockStatus } from "@/types";
import { getStockReconciliationService } from "@/lib/service-container";

export interface StockCsvExportResult {
  csvContent: string;
  filename: string;
  totalItems: number;
}

export type ExportScope = "FILTERED" | "ALL";

/**
 * Escapa valores según el estándar RFC 4180 para formato CSV.
 */
function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value).trim().replace(/\r?\n/g, " ").replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Traduce el código de estado técnico a una denominación legible y formal.
 */
function formatStockStatusLabel(status: StockStatus): string {
  switch (status) {
    case "DISPONIBLE":
      return "Disponible";
    case "AGOTADO":
      return "Agotado (0 unidades)";
    case "DESCATALOGADO_PROVEEDOR":
      return "Descatalogado en Proveedor";
    case "NO_CATALOGADO":
      return "No Catalogado (Sin Proveedor)";
    default:
      return status;
  }
}

/**
 * Acción de servidor para generar y exportar el reporte consolidado de existencias en formato CSV.
 * Aplica codificación UTF-8 con Byte Order Mark (BOM) para compatibilidad nativa con Microsoft Excel en Windows.
 */
export async function exportStockCsvAction(
  filters: StockReportFilterInput,
  scope: ExportScope = "FILTERED"
): Promise<ActionResult<StockCsvExportResult>> {
  const validation = StockReportFilterSchema.safeParse(filters);
  if (!validation.success) {
    return {
      success: false,
      error: "Parámetros de filtrado no válidos para la exportación.",
      fieldErrors: validation.error.flatten().fieldErrors
    };
  }

  try {
    const stockService = getStockReconciliationService();

    const effectiveFilters =
      scope === "ALL"
        ? {
            status: "TODOS" as const,
            search: undefined,
            minStock: undefined,
            maxStock: undefined,
            sortBy: validation.data.sortBy,
            sortOrder: validation.data.sortOrder
          }
        : validation.data;

    const items = await stockService.getExportStockItems(effectiveFilters);

    const headers = [
      "SKU Cliente",
      "Producto Cliente",
      "Marca Cliente",
      "Estado Inventario",
      "Stock Disponible",
      "SKU Proveedor",
      "Producto Proveedor",
      "Marca Proveedor",
      "Estado Mapeo"
    ];

    const rows = items.map((item) => [
      escapeCsvValue(item.clientSku),
      escapeCsvValue(item.clientProductName),
      escapeCsvValue(item.clientBrand || "N/A"),
      escapeCsvValue(formatStockStatusLabel(item.stockStatus)),
      escapeCsvValue(item.supplierStock),
      escapeCsvValue(item.supplierSku || "N/A"),
      escapeCsvValue(item.supplierProductName || "N/A"),
      escapeCsvValue(item.supplierBrand || "N/A"),
      escapeCsvValue(item.supplierSku ? "Conciliado" : "Sin Equivalente")
    ]);

    // Inyección de BOM UTF-8 (\uFEFF) para forzar detección de acentos en Excel/Windows
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10);
    const timePart = now.toTimeString().slice(0, 5).replace(":", "");
    const statusPart =
      scope === "ALL"
        ? "catalogo_completo"
        : validation.data.status !== "TODOS"
          ? validation.data.status.toLowerCase()
          : "filtrado";

    const filename = `reporte_stock_${statusPart}_${datePart}_${timePart}.csv`;

    return {
      success: true,
      data: {
        csvContent,
        filename,
        totalItems: items.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Ocurrió un error al generar el archivo CSV."
    };
  }
}
