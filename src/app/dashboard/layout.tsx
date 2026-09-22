import type React from "react";
import Link from "next/link";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="w-full lg:w-64 bg-slate-900 text-slate-100 flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-lg font-bold tracking-tight text-white">
            Conciliación de Stock
          </h1>
          <p className="text-xs text-slate-400 mt-1">Panel de Operaciones</p>
        </div>
        <nav className="p-4 space-y-1">
          <Link
            href="/dashboard/ingest"
            className="flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Centro de Ingesta
          </Link>
          <Link
            href="/dashboard/audit"
            className="flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Bandeja de Auditoría
          </Link>
          <Link
            href="/dashboard/stock"
            className="flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Tablero de Stock
          </Link>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-10">
        {children}
      </main>
    </div>
  );
}
