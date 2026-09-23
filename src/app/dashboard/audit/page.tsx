import { getProductRepository } from "@/lib/service-container";
import { AuditReportFilterSchema } from "@/types";
import { AuditTableClient } from "./audit-table.client";

export const dynamic = "force-dynamic";

interface AuditPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const params = await searchParams;

  const rawTab = typeof params.tab === "string" ? params.tab : "REVIEW";
  const rawSearch = typeof params.search === "string" ? params.search : undefined;
  const rawPage = typeof params.page === "string" ? params.page : "1";
  const rawPageSize = typeof params.pageSize === "string" ? params.pageSize : "50";

  const filterInput = AuditReportFilterSchema.parse({
    tab: rawTab === "REJECTED" ? "REJECTED" : "REVIEW",
    search: rawSearch,
    page: rawPage,
    pageSize: rawPageSize
  });

  const repository = getProductRepository();
  const report = await repository.getPaginatedAuditItems(filterInput);

  return (
    <AuditTableClient
      report={report}
      currentTab={filterInput.tab}
      currentSearch={filterInput.search ?? ""}
    />
  );
}
