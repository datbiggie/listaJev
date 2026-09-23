"use client";

import { useState, useOptimistic, useTransition, useEffect, type FormEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { resolveReviewAction } from "@/actions/resolve-review.action";
import { runReconciliationAction } from "@/actions/run-reconciliation.action";
import { AuditItemViewDTO, AuditPaginatedResult } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  XIcon,
  ShieldCheckIcon,
  AuditCheckIcon,
  BoxesIcon,
  InfoIcon,
  RefreshIcon,
  LayersIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "@/components/icons";

interface AuditTableClientProps {
  report: AuditPaginatedResult;
  currentTab: "REVIEW" | "REJECTED";
  currentSearch: string;
}

interface ReconciliationFeedback {
  type: "success" | "error";
  title: string;
  message: string;
  details?: {
    processed: number;
    resolved: number;
  };
}

export function AuditTableClient({
  report,
  currentTab,
  currentSearch
}: AuditTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<AuditItemViewDTO[]>(report.items);
  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Estados de control para conciliación por lotes
  const [isReconciling, setIsReconciling] = useState(false);
  const [activeAction, setActiveAction] = useState<"BATCH" | "ORPHANS" | null>(null);
  const [feedback, setFeedback] = useState<ReconciliationFeedback | null>(null);

  // Sincronización reactiva con datos del servidor
  useEffect(() => {
    setItems(report.items);
  }, [report.items]);

  useEffect(() => {
    setSearchTerm(currentSearch);
  }, [currentSearch]);

  // Auto-cierre de la notificación de retroalimentación tras 10 segundos
  useEffect(() => {
    if (!feedback || isReconciling) {
      return;
    }

    const timer = setTimeout(() => {
      setFeedback(null);
    }, 10000);

    return () => clearTimeout(timer);
  }, [feedback, isReconciling]);

  const [optimisticItems, setOptimisticItems] = useOptimistic(
    items,
    (currentItems, skuToRemove: string) =>
      currentItems.filter((item) => item.clientSku !== skuToRemove)
  );

  const updateFilters = (newParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === "" || (key === "tab" && value === "REVIEW")) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleTabChange = (tab: "REVIEW" | "REJECTED") => {
    updateFilters({ tab, page: 1 });
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchTerm.trim() || undefined, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    updateFilters({ page: newPage });
  };

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
        router.refresh();
      } else {
        setErrorMessage(result.error ?? "No se pudo resolver la revisión.");
      }
    });
  };

  const handleRunReconciliation = async (type: "BATCH" | "ORPHANS") => {
    setIsReconciling(true);
    setActiveAction(type);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const options =
        type === "BATCH"
          ? { allBatches: true }
          : { reprocessRejected: true, allBatches: true };

      const result = await runReconciliationAction(options);

      if (result.success && result.data) {
        setFeedback({
          type: "success",
          title:
            type === "BATCH"
              ? "Conciliación Finalizada"
              : "Re-evaluación Completada",
          message:
            result.data.processed > 0
              ? `Se evaluaron ${result.data.processed.toLocaleString()} registros y se resolvieron ${result.data.resolved.toLocaleString()} equivalencias.`
              : "Todos los productos del catálogo se encuentran al día. No se detectaron lotes pendientes.",
          details: result.data
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          title: "Fallo durante la Conciliación",
          message: result.error ?? "Ocurrió un error inesperado al procesar los lotes."
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        title: "Error de Conexión",
        message:
          (err as Error).message ??
          "No fue posible completar la comunicación con el servidor."
      });
    } finally {
      setIsReconciling(false);
      setActiveAction(null);
    }
  };

  const isReviewTab = currentTab === "REVIEW";

  const renderPagination = () => (
    <div className="bg-zinc-50/75 px-4 sm:px-6 py-3 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="text-xs text-zinc-500">
        Total de registros:{" "}
        <span className="font-bold text-zinc-900">
          {report.pagination.totalItems.toLocaleString()}
        </span>{" "}
        | Página{" "}
        <span className="font-bold text-zinc-900">
          {report.pagination.currentPage}
        </span>{" "}
        de{" "}
        <span className="font-bold text-zinc-900">
          {report.pagination.totalPages.toLocaleString()}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={report.pagination.currentPage <= 1 || isPending}
          onClick={() => handlePageChange(report.pagination.currentPage - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition"
        >
          <ChevronLeftIcon className="size-3.5" />
          <span>Anterior</span>
        </button>
        <button
          type="button"
          disabled={report.pagination.currentPage >= report.pagination.totalPages || isPending}
          onClick={() => handlePageChange(report.pagination.currentPage + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition"
        >
          <span>Siguiente</span>
          <ChevronRightIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Encabezado con Botones de Acción Interactivos */}
      <PageHeader
        title="Bandeja de Auditoría de Equivalencias"
        description="Supervisión manual de discrepancias semánticas y gestión de productos huérfanos entre catálogos."
        badge="Human-in-the-Loop"
        badgeVariant="warning"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isReconciling}
              onClick={() => handleRunReconciliation("BATCH")}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <RefreshIcon
                className={cn(
                  "size-4 shrink-0",
                  isReconciling && activeAction === "BATCH" && "animate-spin"
                )}
              />
              <span>
                {isReconciling && activeAction === "BATCH"
                  ? "Conciliando Lotes..."
                  : "Conciliar Lotes Pendientes"}
              </span>
            </button>

            <button
              type="button"
              disabled={isReconciling}
              onClick={() => handleRunReconciliation("ORPHANS")}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs transition"
            >
              <LayersIcon
                className={cn(
                  "size-4 text-zinc-500 shrink-0",
                  isReconciling && activeAction === "ORPHANS" && "animate-spin"
                )}
              />
              <span>
                {isReconciling && activeAction === "ORPHANS"
                  ? "Re-evaluando Huérfanos..."
                  : "Re-evaluar Huérfanos"}
              </span>
            </button>
          </div>
        }
      />

      {/* Modal Flotante de Proceso en Segundo Plano (Bottom-Right) */}
      {(isReconciling || feedback) && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] transition-all duration-300">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xl shadow-zinc-950/10 backdrop-blur-md">
            {isReconciling ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-2xs">
                      <RefreshIcon className="size-4 animate-spin" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-900 leading-none">
                        Tarea en Segundo Plano
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        Conciliación Algorítmica
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-semibold border bg-zinc-100 text-zinc-800 border-zinc-200">
                    <span className="size-1.5 rounded-full bg-zinc-900 animate-pulse" />
                    En ejecución
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-zinc-800">
                    {activeAction === "BATCH"
                      ? "Conciliando lotes pendientes de catálogo..."
                      : "Re-evaluando productos huérfanos..."}
                  </p>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Normalizando SKUs, analizando similitud determinista y evaluando inferencia semántica Jev en PostgreSQL.
                  </p>
                </div>

                <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-zinc-900 rounded-full w-2/5 animate-pulse" />
                </div>
              </div>
            ) : feedback ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg text-white shadow-2xs",
                        feedback.type === "success" ? "bg-emerald-600" : "bg-rose-600"
                      )}
                    >
                      {feedback.type === "success" ? (
                        <CheckIcon className="size-4 stroke-[3]" />
                      ) : (
                        <XIcon className="size-4 stroke-[3]" />
                      )}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-900 leading-none">
                        {feedback.title}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        {feedback.type === "success" ? "Completado" : "Error"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFeedback(null)}
                    className="p-1 text-zinc-400 hover:text-zinc-600 rounded-md transition-colors"
                    aria-label="Cerrar notificación"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed">
                  {feedback.message}
                </p>

                {feedback.details && feedback.details.processed > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded text-zinc-800">
                      Evaluados: {feedback.details.processed.toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold bg-emerald-50 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-800">
                      Resueltos: {feedback.details.resolved.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
            Total Catálogo Cliente
          </span>
          <p className="text-2xl font-bold text-zinc-900 mt-1">
            {report.metrics.totalClient.toLocaleString()}
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
            <BoxesIcon className="size-3.5 text-zinc-400" />
            <span>Base total de referencia</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Mapeos Confirmados
          </span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {report.metrics.confirmed.toLocaleString()}
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700">
            <ShieldCheckIcon className="size-3.5" />
            <span>
              {report.metrics.totalClient > 0
                ? `${((report.metrics.confirmed / report.metrics.totalClient) * 100).toFixed(1)}% del catálogo`
                : "0%"}
            </span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
            En Revisión Manual
          </span>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {report.metrics.requiresReview.toLocaleString()}
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700">
            <AuditCheckIcon className="size-3.5" />
            <span>Candidatos con similitud</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
            Sin Coincidencia
          </span>
          <p className="text-2xl font-bold text-zinc-700 mt-1">
            {report.metrics.rejected.toLocaleString()}
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
            <InfoIcon className="size-3.5 text-zinc-400" />
            <span>Sin candidato en proveedor</span>
          </div>
        </Card>
      </div>

      {/* Alerta de Error de Resolución Manual */}
      {errorMessage && (
        <Card className="border-rose-200 bg-rose-50/50 p-4 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <XIcon className="size-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </Card>
      )}

      {/* Barra de Filtros y Control */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs<"REVIEW" | "REJECTED">
            activeTab={currentTab}
            onChange={handleTabChange}
            tabs={[
              {
                id: "REVIEW",
                label: "Pendientes de Revisión",
                count: report.metrics.requiresReview
              },
              {
                id: "REJECTED",
                label: "Sin Coincidencia / Huérfanos",
                count: report.metrics.rejected
              }
            ]}
          />

          <form onSubmit={handleSearchSubmit} className="w-full sm:w-72">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => {
                setSearchTerm("");
                updateFilters({ search: undefined, page: 1 });
              }}
              placeholder="Filtrar por SKU o descripción..."
            />
          </form>
        </div>
      </Card>

      {/* Tabla Principal de Auditoría */}
      {isReviewTab ? (
        optimisticItems.length === 0 ? (
          <Card className="p-12 text-center text-zinc-500 space-y-2">
            <div className="size-11 rounded-lg bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center border border-zinc-200">
              <AuditCheckIcon className="size-5" />
            </div>
            <p className="text-base font-semibold text-zinc-900">
              {searchTerm ? "Sin resultados para el filtro" : "Bandeja de revisión limpia"}
            </p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              {searchTerm
                ? "No se hallaron productos pendientes que coincidan con la búsqueda actual."
                : "No existen productos pendientes de revisión manual. Todos los candidatos han sido procesados."}
            </p>
          </Card>
        ) : (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-600">
                <thead className="border-b border-zinc-200 bg-zinc-50/75 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th scope="col" className="py-3 px-4 sm:px-6">Producto Cliente</th>
                    <th scope="col" className="py-3 px-4 sm:px-6">Candidato Sugerido (Proveedor)</th>
                    <th scope="col" className="py-3 px-4">Score de Certeza</th>
                    <th scope="col" className="py-3 px-4 sm:px-6 text-right">Acciones de Resolución</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {optimisticItems.map((item) => {
                    const scorePercent = Math.round(item.confidenceScore * 100);
                    const isHighScore = scorePercent >= 80;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-zinc-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4 sm:px-6 align-top">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-zinc-900">
                              {item.clientSku}
                            </span>
                            {item.clientBrand ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
                                {item.clientBrand}
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400 italic">Sin marca</span>
                            )}
                          </div>
                          <span className="font-medium text-zinc-900 text-xs block mt-1 leading-snug">
                            {item.clientProductName}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 sm:px-6 align-top">
                          {item.supplierSku ? (
                            <>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-zinc-700">
                                  {item.supplierSku}
                                </span>
                                {item.supplierBrand ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
                                    {item.supplierBrand}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-zinc-400 italic">Sin marca</span>
                                )}
                              </div>
                              <span className="text-zinc-600 text-xs block mt-1 leading-snug">
                                {item.supplierProductName ?? "Sin descripción"}
                              </span>
                            </>
                          ) : (
                            <span className="text-zinc-400 italic text-xs">
                              Sin candidato disponible
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold border ${
                                isHighScore
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-500/20"
                                  : "bg-amber-50 text-amber-700 border-amber-500/20"
                              }`}
                            >
                              {scorePercent}%
                            </span>
                          </div>
                          <div className="w-24 bg-zinc-200 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isHighScore ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${scorePercent}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono mt-1">
                            {item.discrepancyReason}
                          </div>

                          {/* Comparativa visual de marcas */}
                          {item.supplierSku && (
                            <div className="mt-1.5">
                              {item.clientBrand && item.supplierBrand ? (
                                item.clientBrand.toUpperCase() === item.supplierBrand.toUpperCase() ? (
                                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Misma marca ({item.clientBrand})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                                    Marca: {item.clientBrand} vs {item.supplierBrand}
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] text-zinc-400 font-sans">
                                  {item.clientBrand ? `Marca: ${item.clientBrand}` : item.supplierBrand ? `Marca: ${item.supplierBrand}` : "Sin marcas"}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 sm:px-6 text-right align-middle whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={isPending || isReconciling}
                              onClick={() => handleResolve(item, "CONFIRMED")}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 transition"
                            >
                              <CheckIcon className="size-3.5" />
                              <span>Confirmar</span>
                            </button>
                            <button
                              type="button"
                              disabled={isPending || isReconciling}
                              onClick={() => handleResolve(item, "REJECTED")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-rose-700 hover:border-rose-300 disabled:opacity-50 shadow-2xs transition"
                            >
                              <XIcon className="size-3.5" />
                              <span>Descartar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {renderPagination()}
          </Card>
        )
      ) : (
        /* Pestaña Sin Coincidencia / Huérfanos */
        items.length === 0 ? (
          <Card className="p-12 text-center text-zinc-500 space-y-2">
            <div className="size-11 rounded-lg bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center border border-zinc-200">
              <ShieldCheckIcon className="size-5" />
            </div>
            <p className="text-base font-semibold text-zinc-900">
              {searchTerm ? "Sin resultados para el filtro" : "Cero productos huérfanos"}
            </p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              {searchTerm
                ? "No se hallaron productos huérfanos que coincidan con la búsqueda actual."
                : "Todos los productos cuentan con una equivalencia confirmada o en revisión activa."}
            </p>
          </Card>
        ) : (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-600">
                <thead className="border-b border-zinc-200 bg-zinc-50/75 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th scope="col" className="py-3 px-4 sm:px-6">SKU Cliente</th>
                    <th scope="col" className="py-3 px-4 sm:px-6">Descripción del Producto</th>
                    <th scope="col" className="py-3 px-4">Diagnóstico Algorítmico</th>
                    <th scope="col" className="py-3 px-4 sm:px-6 text-right">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 align-top font-mono text-xs font-bold text-zinc-900">
                        <div>{item.clientSku}</div>
                        {item.clientBrand && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 font-sans">
                            Marca: {item.clientBrand}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-medium text-zinc-900 text-xs">
                        {item.clientProductName}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-zinc-500 font-mono">
                        {item.discrepancyReason}
                      </td>
                      <td className="py-3.5 whitespace-nowrap px-4 sm:px-6 text-right">
                        <StatusBadge status="REJECTED" label="Sin match" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {renderPagination()}
          </Card>
        )
      )}
    </div>
  );
}
