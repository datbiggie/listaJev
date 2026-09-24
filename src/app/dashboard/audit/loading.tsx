import { Skeleton } from "@/components/ui/skeleton";
import { ColdStartNotice } from "@/components/ui/cold-start-notice";
import { Card } from "@/components/ui/card";

export default function AuditLoading() {
  return (
    <div className="space-y-6">
      <ColdStartNotice />

      {/* Encabezado con Botones de Acción Interactivos */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-6 w-72 sm:w-80 rounded" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
      </div>

      {/* Tarjetas KPI de Resumen (4 tarjetas) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Catálogo Cliente */}
        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Total Catálogo Cliente
          </span>
          <Skeleton className="h-8 w-20 mt-1" />
          <div className="mt-3 flex items-center gap-1.5">
            <Skeleton className="size-3.5 rounded-sm" />
            <Skeleton className="h-3 w-32" />
          </div>
        </Card>

        {/* Mapeos Confirmados */}
        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-bold text-emerald-800/60 uppercase tracking-wider block">
            Mapeos Confirmados
          </span>
          <Skeleton className="h-8 w-20 mt-1 bg-emerald-100/60" />
          <div className="mt-3 flex items-center gap-1.5">
            <Skeleton className="size-3.5 rounded-sm bg-emerald-100/50" />
            <Skeleton className="h-3 w-28 bg-emerald-100/50" />
          </div>
        </Card>

        {/* En Revisión Manual */}
        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-bold text-amber-800/60 uppercase tracking-wider block">
            En Revisión Manual
          </span>
          <Skeleton className="h-8 w-20 mt-1 bg-amber-100/60" />
          <div className="mt-3 flex items-center gap-1.5">
            <Skeleton className="size-3.5 rounded-sm bg-amber-100/50" />
            <Skeleton className="h-3 w-32 bg-amber-100/50" />
          </div>
        </Card>

        {/* Sin Coincidencia */}
        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Sin Coincidencia
          </span>
          <Skeleton className="h-8 w-16 mt-1" />
          <div className="mt-3 flex items-center gap-1.5">
            <Skeleton className="size-3.5 rounded-sm" />
            <Skeleton className="h-3 w-36" />
          </div>
        </Card>
      </div>

      {/* Barra de Filtros y Control */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Pestañas con contador */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-44 rounded-lg" />
            <Skeleton className="h-9 w-48 rounded-lg" />
          </div>

          {/* Buscador */}
          <Skeleton className="h-9 w-full sm:w-72 rounded-lg" />
        </div>
      </Card>

      {/* Tabla Principal de Auditoría */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/75 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="py-3 px-4 sm:px-6 w-[32%]">Producto Cliente</th>
                <th className="py-3 px-4 sm:px-6 w-[34%]">Candidato Sugerido (Proveedor)</th>
                <th className="py-3 px-4 w-[16%]">Score de Certeza</th>
                <th className="py-3 px-4 sm:px-6 text-right w-[18%]">Acciones de Resolución</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                  {/* Producto Cliente */}
                  <td className="py-3.5 px-4 sm:px-6 align-top">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-4 w-24 rounded font-mono" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  </td>

                  {/* Candidato Sugerido (Proveedor) */}
                  <td className="py-3.5 px-4 sm:px-6 align-top">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-4 w-28 rounded font-mono" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  </td>

                  {/* Score de Certeza */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </td>

                  {/* Acciones de Resolución */}
                  <td className="py-3.5 px-4 sm:px-6 align-top text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Skeleton className="h-8 w-20 rounded-lg" />
                      <Skeleton className="h-8 w-20 rounded-lg" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginador Inferior */}
        <div className="border-t border-zinc-200 px-4 py-3 sm:px-6 flex items-center justify-between bg-zinc-50/50">
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </Card>
    </div>
  );
}
