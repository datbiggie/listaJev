import { Skeleton } from "@/components/ui/skeleton";
import { ColdStartNotice } from "@/components/ui/cold-start-notice";
import { Card } from "@/components/ui/card";

export default function StockLoading() {
  return (
    <div className="space-y-6">
      <ColdStartNotice />

      {/* 5 Tarjetas KPI idénticas a StockTableClient */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Catálogo */}
        <Card className="p-4 sm:p-5">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Total Catálogo
          </p>
          <Skeleton className="h-8 w-20 mt-1" />
          <div className="mt-2 flex items-center gap-1.5">
            <Skeleton className="size-3.5 rounded-sm" />
            <Skeleton className="h-3 w-24" />
          </div>
        </Card>

        {/* Stock Disponible */}
        <Card className="p-4 sm:p-5">
          <p className="text-[11px] font-bold text-emerald-800/60 uppercase tracking-wider">
            Stock Disponible
          </p>
          <Skeleton className="h-8 w-20 mt-1 bg-emerald-100/60" />
          <div className="mt-2">
            <Skeleton className="h-3 w-28 bg-emerald-100/50" />
          </div>
        </Card>

        {/* Quiebre de Stock (0) */}
        <Card className="p-4 sm:p-5">
          <p className="text-[11px] font-bold text-rose-800/60 uppercase tracking-wider">
            Quiebre de Stock (0)
          </p>
          <Skeleton className="h-8 w-20 mt-1 bg-rose-100/60" />
          <div className="mt-2">
            <Skeleton className="h-3 w-32 bg-rose-100/50" />
          </div>
        </Card>

        {/* Descatalogados */}
        <Card className="p-4 sm:p-5">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Descatalogados
          </p>
          <Skeleton className="h-8 w-16 mt-1" />
          <div className="mt-2">
            <Skeleton className="h-3 w-24" />
          </div>
        </Card>

        {/* Sin Mapear */}
        <Card className="p-4 sm:p-5">
          <p className="text-[11px] font-bold text-amber-800/60 uppercase tracking-wider">
            Sin Mapear
          </p>
          <Skeleton className="h-8 w-16 mt-1 bg-amber-100/60" />
          <div className="mt-2">
            <Skeleton className="h-3 w-28 bg-amber-100/50" />
          </div>
        </Card>
      </div>

      {/* Barra de Filtros y Control */}
      <Card className="p-3.5 sm:p-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Selector de Estado */}
            <Skeleton className="h-9 w-44 rounded-lg" />

            {/* Grupo de Rango de Stock Integrado */}
            <div className="inline-flex items-center h-9 rounded-lg border border-zinc-200 bg-white px-2.5 shadow-2xs gap-1.5">
              <span className="text-xs font-medium text-zinc-400 select-none">Stock:</span>
              <Skeleton className="h-5 w-12 rounded" />
              <span className="text-zinc-300 text-xs">a</span>
              <Skeleton className="h-5 w-12 rounded" />
              <Skeleton className="h-6 w-14 rounded-md ml-1" />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-56 sm:w-64 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
      </Card>

      {/* Tabla Principal de Existencias */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/75 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="py-3 px-4 sm:px-6 w-[18%]">SKU Cliente</th>
                <th className="py-3 px-4 w-[34%]">Producto Cliente</th>
                <th className="py-3 px-4 w-[20%]">SKU Proveedor</th>
                <th className="py-3 px-4 text-center w-[12%]">Stock Proveedor</th>
                <th className="py-3 px-4 sm:px-6 text-right w-[16%]">Estado de Sincronización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                  {/* SKU Cliente */}
                  <td className="py-3.5 px-4 sm:px-6 align-top">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-4 w-24 rounded font-mono" />
                        <Skeleton className="h-4 w-14 rounded-full" />
                      </div>
                    </div>
                  </td>

                  {/* Producto Cliente */}
                  <td className="py-3.5 px-4 align-top">
                    <Skeleton className="h-4 w-5/6" />
                  </td>

                  {/* SKU Proveedor */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-4 w-28 rounded font-mono" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </td>

                  {/* Stock Proveedor */}
                  <td className="py-3.5 px-4 align-top text-center">
                    <div className="flex justify-center">
                      <Skeleton className="h-6 w-14 rounded-full" />
                    </div>
                  </td>

                  {/* Estado de Sincronización */}
                  <td className="py-3.5 px-4 sm:px-6 align-top text-right">
                    <div className="flex justify-end">
                      <Skeleton className="h-6 w-24 rounded-full" />
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
