import type React from "react";
import Link from "next/link";
import { checkAiServiceHealth } from "@/lib/ai-health";
import { NavLinks } from "./nav-links.client";
import {
  DatabaseIcon,
  LayersIcon,
  ExternalLinkIcon
} from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const aiHealth = await checkAiServiceHealth();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-100 font-sans antialiased text-zinc-900">
      <aside
        className="hidden lg:flex w-64 flex-col border-r border-zinc-200 bg-white shrink-0 h-full justify-between"
        aria-label="Barra lateral de navegación"
      >
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-6">
            <Link
              href="/dashboard/ingest"
              className="flex items-center gap-2.5 font-bold tracking-tight text-zinc-900"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-xs">
                <LayersIcon className="size-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight leading-none text-zinc-900">
                  JOHBRI C.A.
                </span>
                <span className="text-[11px] text-zinc-500 font-semibold mt-0.5">
                  Conciliación & Stock
                </span>
              </div>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <NavLinks />
          </div>
        </div>

        <div className="shrink-0 p-4 border-t border-zinc-200 bg-zinc-50/50">
          <div className="rounded-xl border border-zinc-200 bg-white p-3 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900">
                Motor IA Jev
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold border ${
                  aiHealth.status === "ONLINE"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-500/20"
                    : aiHealth.status === "UNVERIFIED"
                      ? "bg-amber-50 text-amber-700 border-amber-500/20"
                      : "bg-rose-50 text-rose-700 border-rose-500/20"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    aiHealth.status === "ONLINE"
                      ? "bg-emerald-500"
                      : aiHealth.status === "UNVERIFIED"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }`}
                />
                {aiHealth.status === "ONLINE"
                  ? "En Línea"
                  : aiHealth.status === "UNVERIFIED"
                    ? "Standby"
                    : "Offline"}
              </span>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              {aiHealth.message}
            </p>

            {aiHealth.status === "UNVERIFIED" && (
              <a
                href="https://vercel.com/~/ai?modal=add-credit-card"
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center justify-center gap-1.5 w-full py-1 px-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md text-[11px] font-medium transition-colors"
              >
                <span>Habilitar Inferencia</span>
                <ExternalLinkIcon className="size-3" />
              </a>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        <header className="shrink-0 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md transition-colors z-30">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="flex size-7 items-center justify-center rounded-md bg-zinc-900 text-white">
                <LayersIcon className="size-3.5" />
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-zinc-900">
                Consola de Conciliación
              </span>
              <span className="text-xs text-zinc-500">
                Mapeo Determinista & Cruce de Inventarios
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-1.5">
              <DatabaseIcon className="size-4 text-zinc-500" />
              <div className="flex flex-col text-right leading-tight">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  Base de Datos
                </span>
                <span className="font-mono text-xs font-semibold text-zinc-900">
                  catalogo_db (PostgreSQL)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-1.5">
              <div className="flex flex-col items-end text-right leading-tight">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  Inferencia Semántica
                </span>
                <span className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                  <span
                    className={`size-1.5 rounded-full ${
                      aiHealth.status === "ONLINE"
                        ? "bg-emerald-500"
                        : aiHealth.status === "UNVERIFIED"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                  />
                  {aiHealth.status === "ONLINE"
                    ? "Activa"
                    : aiHealth.status === "UNVERIFIED"
                      ? "Determinista"
                      : "Desconectada"}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-zinc-50">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
