import { Skeleton } from "@/components/ui/skeleton";
import { ColdStartNotice } from "@/components/ui/cold-start-notice";
import { Card } from "@/components/ui/card";

export default function IngestLoading() {
  return (
    <div className="space-y-6">
      <ColdStartNotice />

      {/* Stepper Informativo en Card */}
      <Card padding={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-200">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 flex items-start gap-3">
              <Skeleton className="size-7 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Formulario Principal de Carga */}
      <Card className="space-y-6">
        {/* Paso 1: Selección de Entidad Destino */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
            <div className="space-y-1">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-80" />
            </div>
            <Skeleton className="h-6 w-36 rounded-md" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Opción A */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>

            {/* Opción B */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </div>

        {/* Paso 2: Zona Dropzone para PDF */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <div className="h-44 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 flex flex-col items-center justify-center gap-3 p-6">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>

        {/* Botón de Envío */}
        <Skeleton className="h-11 w-full rounded-xl" />
      </Card>
    </div>
  );
}
