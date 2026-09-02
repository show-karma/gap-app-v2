import { Skeleton } from "@/components/ui/skeleton";

/**
 * Grant detail route loading skeleton.
 */
export default function GrantLoading() {
  return (
    <main className="w-full px-4 py-6" aria-busy="true">
      {/* Breadcrumb */}
      <Skeleton className="mb-4 h-4 w-48" />

      {/* Amount + Purpose */}
      <div className="flex items-baseline gap-3">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* FROM / TO rows */}
      <div className="mt-4 space-y-1.5">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Metadata line */}
      <Skeleton className="mt-4 h-3.5 w-64" />

      {/* Related grants */}
      <div className="mt-8 border-t border-zinc-100 pt-6 dark:border-zinc-800">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-36" />
              {Array.from({ length: 5 }).map((_, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
                <div key={j} className="flex justify-between gap-4">
                  <Skeleton
                    className="h-3.5 w-full"
                    style={{ maxWidth: `${60 + (j % 3) * 10}%` }}
                  />
                  <Skeleton className="h-3.5 w-16 shrink-0" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
