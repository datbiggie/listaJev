"use server";

import { ActionResult, StockReportFilterInput, StockReportFilterSchema, StockReportPaginatedResult } from "@/types";
import { getStockReconciliationService } from "@/lib/service-container";

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
