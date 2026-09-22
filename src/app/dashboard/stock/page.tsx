import { getStockReconciliationService } from "@/lib/service-container";
import { StockReportFilterSchema } from "@/types";
import { StockTableClient } from "./stock-table.client";

export const dynamic = "force-dynamic";

interface StockPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StockPage({ searchParams }: StockPageProps) {
  const params = await searchParams;

  const rawStatus = typeof params.status === "string" ? params.status : "TODOS";
  const rawSearch = typeof params.search === "string" ? params.search : undefined;
  const rawPage = typeof params.page === "string" ? params.page : "1";
  const rawPageSize = typeof params.pageSize === "string" ? params.pageSize : "50";

  const filterInput = StockReportFilterSchema.parse({
    status: rawStatus,
    search: rawSearch,
    page: rawPage,
    pageSize: rawPageSize
  });

  const stockService = getStockReconciliationService();
  const report = await stockService.getPaginatedReconciliationReport(filterInput);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Tablero de Inventario y Quiebres
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Visualización en tiempo real del estado de stock cruzado con proveedores y cálculo determinista.
        </p>
      </div>

      <StockTableClient
        report={report}
        currentStatus={filterInput.status}
        currentSearch={filterInput.search ?? ""}
      />
    </div>
  );
}
