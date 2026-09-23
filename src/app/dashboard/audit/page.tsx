import { getProductRepository } from "@/lib/service-container";
import { AuditTableClient } from "./audit-table.client";
import { runReconciliationAction } from "@/actions/run-reconciliation.action";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const repository = getProductRepository();
  const [pendingReviews, rejectedItems, metrics] = await Promise.all([
    repository.getAuditItemsView(100, "REQUIRES_REVIEW"),
    repository.getAuditItemsView(100, "REJECTED"),
    repository.getMappingStatusCounts()
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Bandeja de Auditoría de Equivalencias
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Resolución y supervisión manual de productos en revisión (REQUIRES_REVIEW) y huérfanos (REJECTED).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form
            action={async () => {
              "use server";
              await runReconciliationAction({ allBatches: true });
            }}
          >
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              Conciliar Lotes Pendientes
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              await runReconciliationAction({
                reprocessRejected: true,
                allBatches: true
              });
            }}
          >
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              Re-evaluar Huérfanos
            </button>
          </form>
        </div>
      </div>

      <AuditTableClient
        initialItems={pendingReviews}
        rejectedItems={rejectedItems}
        metrics={metrics}
      />
    </div>
  );
}
