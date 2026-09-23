import { getStockReconciliationService } from "@/lib/service-container";
import { StockReportFilterSchema } from "@/types";
import { StockTableClient } from "./stock-table.client";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

interface StockPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StockPage({ searchParams }: StockPageProps) {
  const params = await searchParams;

  const rawStatus = typeof params.status === "string" ? params.status : "TODOS";
  const rawSearch = typeof params.search === "string" ? params.search : undefined;
  const rawMinStock =
    typeof params.minStock === "string" && params.minStock.trim() !== ""
      ? params.minStock
      : undefined;
  const rawMaxStock =
    typeof params.maxStock === "string" && params.maxStock.trim() !== ""
      ? params.maxStock
      : undefined;
  const rawSortBy = typeof params.sortBy === "string" ? params.sortBy : "stock";
  const rawSortOrder = typeof params.sortOrder === "string" ? params.sortOrder : "asc";
  const rawPage = typeof params.page === "string" ? params.page : "1";
  const rawPageSize = typeof params.pageSize === "string" ? params.pageSize : "50";

  const filterInput = StockReportFilterSchema.parse({
    status: rawStatus,
    search: rawSearch,
    minStock: rawMinStock,
    maxStock: rawMaxStock,
    sortBy: rawSortBy,
    sortOrder: rawSortOrder,
    page: rawPage,
    pageSize: rawPageSize
  });

  const stockService = getStockReconciliationService();
  const report = await stockService.getPaginatedReconciliationReport(filterInput);

  return (
    <div className="space-y-6">

      <StockTableClient
        report={report}
        currentStatus={filterInput.status}
        currentSearch={filterInput.search ?? ""}
        currentMinStock={filterInput.minStock}
        currentMaxStock={filterInput.maxStock}
        currentSortBy={filterInput.sortBy}
        currentSortOrder={filterInput.sortOrder}
      />
    </div>
  );
}
