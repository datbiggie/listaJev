import { getProductRepository } from "@/lib/service-container";
import { AuditTableClient } from "./audit-table.client";
import { runReconciliationAction } from "@/actions/run-reconciliation.action";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const repository = getProductRepository();
  const pendingReviews = await repository.getAuditItemsView(100);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Bandeja de Auditoría de Equivalencias
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Resolución manual de productos marcados con discrepancias semánticas (REQUIRES_REVIEW).
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await runReconciliationAction();
          }}
        >
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            Ejecutar Ciclo de Conciliación
          </button>
        </form>
      </div>

      <AuditTableClient initialItems={pendingReviews} />
    </div>
  );
}
