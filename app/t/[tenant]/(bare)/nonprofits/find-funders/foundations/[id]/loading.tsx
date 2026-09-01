import { Skeleton } from "@/components/ui/skeleton";

/**
 * Foundation detail route loading skeleton.
 * Shown by Next.js while the page component is streaming.
 */
export default function FoundationLoading() {
  return (
    <main className="w-full">
      {/* Hero skeleton */}
      <div className="border-b border-zinc-200 bg-white px-4 py-8 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-xl" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-3/4 max-w-xl" />
        </div>
      </div>

      {/* Stat grid skeleton */}
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {(["assets", "net", "revenue", "expenses", "dist", "grants", "officers"] as const).map(
            (key) => (
              <div
                key={key}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="size-8 rounded-lg" />
                </div>
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            )
          )}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="px-4 py-6">
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      </div>
    </main>
  );
}
