"use client";

import { useState, useOptimistic, useTransition } from "react";
import { resolveReviewAction } from "@/actions/resolve-review.action";
import { AuditItemViewDTO } from "@/types";

interface AuditTableClientProps {
  initialItems: AuditItemViewDTO[];
  rejectedItems?: AuditItemViewDTO[];
  metrics?: {
    confirmed: number;
    requiresReview: number;
    rejected: number;
    totalClient: number;
  };
}

export function AuditTableClient({
  initialItems,
  rejectedItems = [],
  metrics
}: AuditTableClientProps) {
  const [activeTab, setActiveTab] = useState<"REVIEW" | "REJECTED">("REVIEW");
  const [items, setItems] = useState<AuditItemViewDTO[]>(initialItems);
  const [rejectedList] = useState<AuditItemViewDTO[]>(rejectedItems);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [optimisticItems, setOptimisticItems] = useOptimistic(
    items,
    (currentItems, skuToRemove: string) =>
      currentItems.filter((item) => item.clientSku !== skuToRemove)
  );

  const handleResolve = (
    item: AuditItemViewDTO,
    resolution: "CONFIRMED" | "REJECTED"
  ) => {
    setErrorMessage(null);
    startTransition(async () => {
      setOptimisticItems(item.clientSku);
      const result = await resolveReviewAction({
        clientSku: item.clientSku,
        supplierSku: item.supplierSku,
        resolution,
        reviewer: "Auditor Operativo"
      });

      if (result.success) {
        setItems((prev) => prev.filter((i) => i.clientSku !== item.clientSku));
      } else {
        setErrorMessage(result.error ?? "No se pudo resolver la revisión.");
      }
    });
  };

  const isReviewTab = activeTab === "REVIEW";

  return (
    <div className="space-y-6">
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Catálogo
            </span>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {metrics.totalClient.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              Confirmados
            </span>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {metrics.confirmed.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              En Revisión Manual
            </span>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {metrics.requiresReview.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sin Coincidencia
            </span>
            <p className="text-2xl font-bold text-slate-700 mt-1">
              {metrics.rejected.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Selector de pestañas */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("REVIEW")}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            isReviewTab
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Pendientes de Revisión ({optimisticItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("REJECTED")}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            !isReviewTab
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Sin Coincidencia / Huérfanos ({rejectedList.length})
        </button>
      </div>

      {isReviewTab ? (
        optimisticItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
            <p className="text-base font-semibold text-slate-700">
              Bandeja limpia
            </p>
            <p className="text-sm mt-1">
              No existen productos pendientes de revisión manual en este momento.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Producto Cliente</th>
                    <th className="py-3 px-4">Candidato Proveedor</th>
                    <th className="py-3 px-4">Diagnóstico / Score</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {optimisticItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs text-blue-700 font-semibold">
                          {item.clientSku}
                        </div>
                        <div className="font-medium text-slate-900 mt-0.5">
                          {item.clientProductName}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {item.supplierSku ? (
                          <>
                            <div className="font-mono text-xs text-slate-600 font-semibold">
                              {item.supplierSku}
                            </div>
                            <div className="text-slate-800 mt-0.5">
                              {item.supplierProductName ?? "Sin descripción"}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">
                            Sin candidato disponible
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                            Score: {(item.confidenceScore * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                          {item.discrepancyReason}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleResolve(item, "CONFIRMED")}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded text-xs font-medium transition-colors shadow-sm"
                        >
                          Confirmar Equivalencia
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleResolve(item, "REJECTED")}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded text-xs font-medium transition-colors shadow-sm"
                        >
                          Rechazar Candidato
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Pestaña Sin Coincidencia */
        rejectedList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
            <p className="text-base font-semibold text-slate-700">
              No hay productos huérfanos
            </p>
            <p className="text-sm mt-1">
              Todos los productos del cliente cuentan con un mapeo confirmado o en revisión.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">SKU Cliente</th>
                    <th className="py-3 px-4">Descripción Producto Cliente</th>
                    <th className="py-3 px-4">Motivo de Rechazo</th>
                    <th className="py-3 px-4 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rejectedList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-blue-700 font-semibold">
                        {item.clientSku}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {item.clientProductName}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                        {item.discrepancyReason}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Sin Mapeo
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
