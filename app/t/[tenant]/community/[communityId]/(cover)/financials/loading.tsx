import { Skeleton } from "@/components/Utilities/Skeleton";

const TABLE_COLS = Array.from({ length: 7 }, (_, i) => `c-${i}`);
const TABLE_ROWS = Array.from({ length: 8 }, (_, i) => `r-${i}`);
const KPI_KEYS = ["k0", "k1", "k2", "k3"];

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 py-6 animate-fade-in-up">
      {/* Page header skeleton */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-[420px] max-w-full" />
      </div>

      {/* KPI grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_KEYS.map((key) => (
          <div key={key} className="rounded-2xl border border-border bg-background p-5 md:p-6">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-8 w-28" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Toolbar skeleton */}
      <div className="flex flex-row flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-[260px] flex-1 max-w-[420px]" />
        <Skeleton className="h-10 w-[140px]" />
        <Skeleton className="h-10 w-[140px]" />
        <Skeleton className="h-10 w-[140px]" />
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="border-b border-border bg-secondary/40 px-5 py-3">
          <div className="grid grid-cols-7 gap-4">
            {TABLE_COLS.map((c) => (
              <Skeleton key={c} className="h-3 w-16" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-border">
          {TABLE_ROWS.map((r) => (
            <div key={r} className="grid grid-cols-7 gap-4 px-5 py-4">
              {TABLE_COLS.map((c, i) => (
                <Skeleton key={`${r}-${c}`} className={i === 0 ? "h-4 w-32" : "h-4 w-20"} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
