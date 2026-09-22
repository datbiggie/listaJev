"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { StockReportPaginatedResult, StockStatus } from "@/types";

interface StockTableClientProps {
  report: StockReportPaginatedResult;
  currentStatus: string;
  currentSearch: string;
}

export function StockTableClient({
  report,
  currentStatus,
  currentSearch
}: StockTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(currentSearch);

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
    updateFilters({ status, page: 1 });
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchTerm.trim(), page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    updateFilters({ page: newPage });
  };

  const exportToCsv = () => {
    const headers = [
      "SKU Cliente",
      "Producto Cliente",
      "SKU Proveedor",
      "Stock Proveedor",
      "Estado"
    ];

    const escapeCsvField = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = report.items.map((item) => [
      escapeCsvField(item.clientSku),
      escapeCsvField(item.clientProductName),
      escapeCsvField(item.supplierSku ?? "N/A"),
      escapeCsvField(item.supplierStock),
      escapeCsvField(item.stockStatus)
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reporte_stock_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case "DISPONIBLE":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            DISPONIBLE
          </span>
        );
      case "AGOTADO":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            AGOTADO
          </span>
        );
      case "DESCATALOGADO_PROVEEDOR":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-800">
            DESCATALOGADO
          </span>
        );
      case "NO_CATALOGADO":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            NO CATALOGADO
          </span>
        );
    }
  };

  const statuses = [
    { label: "Todos", value: "TODOS" },
    { label: "Disponibles", value: "DISPONIBLE" },
    { label: "Agotados", value: "AGOTADO" },
    { label: "Descatalogados", value: "DESCATALOGADO_PROVEEDOR" },
    { label: "Sin Mapear", value: "NO_CATALOGADO" }
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Catálogo
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {report.metrics.totalProducts}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">
            Disponibles
          </p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            {report.metrics.availableCount}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">
            Agotados
          </p>
          <p className="text-2xl font-bold text-red-700 mt-1">
            {report.metrics.outOfStockCount}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Descatalogados
          </p>
          <p className="text-2xl font-bold text-slate-700 mt-1">
            {report.metrics.discontinuedCount}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
            Sin Mapear
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {report.metrics.unmappedCount}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {statuses.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => handleStatusChange(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentStatus === s.value || (!currentStatus && s.value === "TODOS")
                  ? "bg-slate-900 text-white font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center">
            <input
              type="text"
              placeholder="Buscar por SKU o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-l-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 w-48 sm:w-64"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-900 text-white rounded-r-lg text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              Buscar
            </button>
          </form>

          <button
            type="button"
            onClick={exportToCsv}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">SKU Cliente</th>
                <th className="py-3 px-4">Producto Cliente</th>
                <th className="py-3 px-4">SKU Proveedor</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {report.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                    No se encontraron productos con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                report.items.map((item) => (
                  <tr key={item.clientSku} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-blue-700">
                      {item.clientSku}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {item.clientProductName}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {item.supplierSku ?? "N/A"}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-800">
                      {item.supplierStock}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {getStatusBadge(item.stockStatus)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Total: <span className="font-semibold text-slate-700">{report.pagination.totalItems}</span> productos |
            Página <span className="font-semibold text-slate-700">{report.pagination.currentPage}</span> de{" "}
            <span className="font-semibold text-slate-700">{report.pagination.totalPages}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={report.pagination.currentPage <= 1}
              onClick={() => handlePageChange(report.pagination.currentPage - 1)}
              className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={report.pagination.currentPage >= report.pagination.totalPages}
              onClick={() => handlePageChange(report.pagination.currentPage + 1)}
              className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
