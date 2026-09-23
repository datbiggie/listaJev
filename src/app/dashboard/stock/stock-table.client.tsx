"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { StockReportPaginatedResult } from "@/types";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchInput } from "@/components/ui/search-input";
import {
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BoxesIcon,
  XIcon
} from "@/components/icons";

interface StockTableClientProps {
  report: StockReportPaginatedResult;
  currentStatus: string;
  currentSearch: string;
  currentMinStock?: number;
  currentMaxStock?: number;
  currentSortBy?: "sku" | "stock";
  currentSortOrder?: "asc" | "desc";
}

export function StockTableClient({
  report,
  currentStatus,
  currentSearch,
  currentMinStock,
  currentMaxStock,
  currentSortBy = "stock",
  currentSortOrder = "asc"
}: StockTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [minStockInput, setMinStockInput] = useState<string>(
    currentMinStock !== undefined ? String(currentMinStock) : ""
  );
  const [maxStockInput, setMaxStockInput] = useState<string>(
    currentMaxStock !== undefined ? String(currentMaxStock) : ""
  );

  const sortBy = currentSortBy;
  const sortOrder = currentSortOrder;

  useEffect(() => {
    setSearchTerm(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    setMinStockInput(currentMinStock !== undefined ? String(currentMinStock) : "");
  }, [currentMinStock]);

  useEffect(() => {
    setMaxStockInput(currentMaxStock !== undefined ? String(currentMaxStock) : "");
  }, [currentMaxStock]);

  const updateFilters = (newParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === "TODOS") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleStatusChange = (status: string) => {
    updateFilters({ status: status === "TODOS" ? undefined : status, page: 1 });
  };

  const handleToggleStockSort = () => {
    if (sortBy === "stock") {
      const nextOrder = sortOrder === "asc" ? "desc" : "asc";
      updateFilters({ sortBy: "stock", sortOrder: nextOrder, page: 1 });
    } else {
      updateFilters({ sortBy: "stock", sortOrder: "asc", page: 1 });
    }
  };

  const handleToggleSkuSort = () => {
    if (sortBy === "sku") {
      const nextOrder = sortOrder === "asc" ? "desc" : "asc";
      updateFilters({ sortBy: "sku", sortOrder: nextOrder, page: 1 });
    } else {
      updateFilters({ sortBy: "sku", sortOrder: "asc", page: 1 });
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchTerm.trim() || undefined, page: 1 });
  };

  const handleApplyStockFilter = () => {
    const minVal = minStockInput.trim() !== "" ? Number(minStockInput) : undefined;
    const maxVal = maxStockInput.trim() !== "" ? Number(maxStockInput) : undefined;
    updateFilters({
      minStock: minVal !== undefined && !isNaN(minVal) ? minVal : undefined,
      maxStock: maxVal !== undefined && !isNaN(maxVal) ? maxVal : undefined,
      page: 1
    });
  };

  const handleStockKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApplyStockFilter();
    }
  };

  const handleResetAllFilters = () => {
    setSearchTerm("");
    setMinStockInput("");
    setMaxStockInput("");
    router.push(pathname);
  };

  const hasActiveFilters = Boolean(
    (currentStatus && currentStatus !== "TODOS") ||
      currentSearch ||
      currentMinStock !== undefined ||
      currentMaxStock !== undefined ||
      currentSortBy !== "stock" ||
      currentSortOrder !== "asc"
  );

  const handlePageChange = (newPage: number) => {
    updateFilters({ page: newPage });
  };

  const exportToCsv = () => {
    const headers = [
      "SKU Cliente",
      "Producto Cliente",
      "Marca Cliente",
      "SKU Proveedor",
      "Marca Proveedor",
      "Stock Proveedor",
      "Estado Inventario"
    ];

    const escapeCsvField = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = report.items.map((item) => [
      escapeCsvField(item.clientSku),
      escapeCsvField(item.clientProductName),
      escapeCsvField(item.clientBrand ?? "N/A"),
      escapeCsvField(item.supplierSku ?? "N/A"),
      escapeCsvField(item.supplierBrand ?? "N/A"),
      escapeCsvField(item.supplierStock),
      escapeCsvField(item.stockStatus)
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reporte_existencias_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 sm:p-5">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Total Catálogo
          </p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">
            {report.metrics.totalProducts.toLocaleString()}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
            <BoxesIcon className="size-3.5" />
            <span>Base total cliente</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            Stock Disponible
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {report.metrics.availableCount.toLocaleString()}
          </p>
          <div className="mt-2 text-xs text-emerald-600 font-medium">
            {report.metrics.totalProducts > 0
              ? `${((report.metrics.availableCount / report.metrics.totalProducts) * 100).toFixed(1)}% disponibilidad`
              : "0%"}
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
            Quiebre de Stock (0)
          </p>
          <p className="text-2xl font-bold text-rose-700 mt-1">
            {report.metrics.outOfStockCount.toLocaleString()}
          </p>
          <div className="mt-2 text-xs text-rose-600 font-medium">
            Mapeados sin unidades
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Descatalogados
          </p>
          <p className="text-2xl font-bold text-zinc-700 mt-1">
            {report.metrics.discontinuedCount.toLocaleString()}
          </p>
          <div className="mt-2 text-xs text-zinc-500 font-medium">
            Fuera de catálogo
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
            Sin Mapear
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {report.metrics.unmappedCount.toLocaleString()}
          </p>
          <div className="mt-2 text-xs text-amber-600 font-medium">
            Pendientes de cruce
          </div>
        </Card>
      </div>

      {/* Barra de Filtros y Control */}
      <Card className="p-3.5 sm:p-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Bloque Izquierdo: Estado + Rango de Stock + Limpiar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Selector de Estado con estética moderna */}
            <div className="relative inline-flex items-center">
              <select
                id="status-filter"
                value={currentStatus || "TODOS"}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="h-9 rounded-lg border border-zinc-300 bg-white pl-3 pr-8 text-xs font-semibold text-zinc-800 shadow-2xs hover:border-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-0 transition-colors cursor-pointer appearance-none"
              >
                <option value="TODOS">Todos los estados ({report.metrics.totalProducts.toLocaleString()})</option>
                <option value="DISPONIBLE">Disponibles ({report.metrics.availableCount.toLocaleString()})</option>
                <option value="AGOTADO">Agotados ({report.metrics.outOfStockCount.toLocaleString()})</option>
                <option value="DESCATALOGADO_PROVEEDOR">Descatalogados ({report.metrics.discontinuedCount.toLocaleString()})</option>
                <option value="NO_CATALOGADO">Sin Mapear ({report.metrics.unmappedCount.toLocaleString()})</option>
              </select>
              <div className="pointer-events-none absolute right-2.5 text-zinc-400">
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>

            {/* Grupo de Rango de Stock Integrado */}
            <div className="inline-flex items-center h-9 rounded-lg border border-zinc-300 bg-white px-2.5 shadow-2xs hover:border-zinc-400 focus-within:border-zinc-400 focus-within:ring-0 focus-within:outline-none transition-colors">
              <span className="text-xs font-medium text-zinc-500 mr-2 select-none">
                Stock:
              </span>
              <input
                type="number"
                min={0}
                value={minStockInput}
                onChange={(e) => setMinStockInput(e.target.value)}
                onKeyDown={handleStockKeyDown}
                placeholder="Mín"
                className="w-14 bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-center font-mono shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                title="Cantidad mínima de existencias"
              />
              <span className="text-zinc-300 mx-1 select-none">a</span>
              <input
                type="number"
                min={0}
                value={maxStockInput}
                onChange={(e) => setMaxStockInput(e.target.value)}
                onKeyDown={handleStockKeyDown}
                placeholder="Máx"
                className="w-14 bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-center font-mono shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                title="Cantidad máxima de existencias"
              />
              <button
                type="button"
                onClick={handleApplyStockFilter}
                className="ml-1.5 rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-zinc-800 transition"
              >
                Filtrar
              </button>
            </div>

            {/* Botón Restablecer / Limpiar Filtros */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="h-9 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 shadow-2xs transition"
                title="Restablecer todos los filtros"
              >
                <XIcon className="size-3 text-zinc-400" />
                <span>Limpiar</span>
              </button>
            )}
          </div>

          {/* Bloque Derecho: Buscador y Exportación CSV */}
          <div className="flex items-center gap-2.5">
            <form onSubmit={handleSearchSubmit} className="w-56 sm:w-64">
              <SearchInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClear={() => {
                  setSearchTerm("");
                  updateFilters({ search: undefined, page: 1 });
                }}
                placeholder="Buscar SKU o nombre..."
              />
            </form>

            <button
              type="button"
              onClick={exportToCsv}
              className="h-9 inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 shadow-2xs whitespace-nowrap transition"
            >
              <DownloadIcon className="size-3.5 text-zinc-500" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Tabla Principal de Existencias */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600">
            <thead className="border-b border-zinc-200 bg-zinc-50/75 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <tr>
                <th
                  scope="col"
                  onClick={handleToggleSkuSort}
                  className="py-3 px-4 sm:px-6 cursor-pointer select-none hover:bg-zinc-100/75 transition-colors group"
                  title="Ordenar por SKU Cliente (clic para alternar)"
                >
                  <div className="inline-flex items-center gap-1.5">
                    <span>SKU Cliente</span>
                    {sortBy === "sku" ? (
                      <svg className="size-3 text-zinc-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={sortOrder === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                      </svg>
                    ) : null}
                  </div>
                </th>
                <th scope="col" className="py-3 px-4 sm:px-6">Descripción del Producto (Cliente)</th>
                <th scope="col" className="py-3 px-4">SKU Proveedor</th>
                <th
                  scope="col"
                  onClick={handleToggleStockSort}
                  className="py-3 px-4 text-center cursor-pointer select-none hover:bg-zinc-100/75 transition-colors group"
                  title="Ordenar por existencias (clic para alternar menor/mayor stock)"
                >
                  <div className="inline-flex items-center justify-center gap-1.5">
                    <span>Existencias</span>
                    {sortBy === "stock" ? (
                      <svg className="size-3 text-zinc-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={sortOrder === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                      </svg>
                    ) : null}
                  </div>
                </th>
                <th scope="col" className="py-3 px-4 sm:px-6 text-right">Estatus de Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {report.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 text-sm">
                    No se encontraron productos que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                report.items.map((item) => (
                  <tr
                    key={item.clientSku}
                    className="hover:bg-zinc-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 sm:px-6 font-mono text-xs font-bold text-zinc-900">
                      <div>{item.clientSku}</div>
                      {item.clientBrand && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[12px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 font-sans">
                          {item.clientBrand}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 sm:px-6 font-medium text-zinc-900 text-xs">
                      {item.clientProductName}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-zinc-700">
                      {item.supplierSku ? (
                        <div>
                          <div>{item.supplierSku}</div>
                          {item.supplierBrand && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[12px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 font-sans">
                              {item.supplierBrand}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono border ${
                          item.supplierStock > 0
                            ? "text-emerald-700 bg-emerald-50 border-emerald-500/20"
                            : "text-zinc-500 bg-zinc-100 border-zinc-200"
                        }`}
                      >
                        {item.supplierStock}
                      </span>
                    </td>
                    <td className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">
                      <StatusBadge status={item.stockStatus} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
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
              disabled={report.pagination.currentPage <= 1}
              onClick={() => handlePageChange(report.pagination.currentPage - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition"
            >
              <ChevronLeftIcon className="size-3.5" />
              <span>Anterior</span>
            </button>
            <button
              type="button"
              disabled={report.pagination.currentPage >= report.pagination.totalPages}
              onClick={() => handlePageChange(report.pagination.currentPage + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition"
            >
              <span>Siguiente</span>
              <ChevronRightIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
