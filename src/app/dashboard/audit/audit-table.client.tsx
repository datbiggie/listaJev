"use client";

import { useState, useOptimistic, useTransition } from "react";
import { resolveReviewAction } from "@/actions/resolve-review.action";
import { AuditItemViewDTO } from "@/types";

interface AuditTableClientProps {
  initialItems: AuditItemViewDTO[];
}

export function AuditTableClient({ initialItems }: AuditTableClientProps) {
  const [items, setItems] = useState<AuditItemViewDTO[]>(initialItems);
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

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errorMessage}
        </div>
      )}

      {optimisticItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
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
                  <th className="py-3 px-4">Diagnóstico Jev</th>
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
                      <div className="text-xs text-slate-500 mt-1">
                        {item.discrepancyReason}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleResolve(item, "CONFIRMED")}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded text-xs font-medium transition-colors"
                      >
                        Confirmar Equivalencia
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleResolve(item, "REJECTED")}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded text-xs font-medium transition-colors"
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
      )}
    </div>
  );
}
