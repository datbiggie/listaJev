import { Skeleton } from "@/components/ui/skeleton";
import { ColdStartNotice } from "@/components/ui/cold-start-notice";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <ColdStartNotice />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2 shadow-2xs"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 p-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-28" />
        </div>

        <div className="divide-y divide-zinc-100">
          <div className="grid grid-cols-12 gap-4 bg-zinc-50/75 p-3 text-xs font-semibold text-zinc-500">
            <Skeleton className="col-span-3 h-4" />
            <Skeleton className="col-span-4 h-4" />
            <Skeleton className="col-span-2 h-4" />
            <Skeleton className="col-span-3 h-4" />
          </div>

          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 p-4 items-center">
              <Skeleton className="col-span-3 h-5 w-3/4" />
              <Skeleton className="col-span-4 h-4 w-5/6" />
              <Skeleton className="col-span-2 h-6 w-20 rounded-full" />
              <Skeleton className="col-span-3 h-8 w-24 ml-auto rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
