import { Skeleton } from "@/components/ui/skeleton";

/**
 * Nonprofit detail route loading skeleton.
 */
export default function NonprofitLoading() {
  return (
    <main className="w-full px-4 py-8" aria-busy="true">
      {/* Masthead skeleton */}
      <div className="mb-6 flex items-start gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <Skeleton className="size-10 shrink-0 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      {/* Two-column skeleton */}
      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="w-full space-y-3 xl:w-[30%]">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <div className="min-w-0 xl:w-[70%]">
          <Skeleton className="mb-3 h-5 w-32" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
