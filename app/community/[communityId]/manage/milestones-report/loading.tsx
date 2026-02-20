import { Skeleton } from "@/components/Utilities/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-44 rounded-md" />
        </div>
      </div>

      {/* Stat cards 2x4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50"
          >
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-7 w-16 rounded" />
              <Skeleton className="h-3.5 w-28 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
        {/* Table header */}
        <div className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center h-11 px-4 gap-6">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="h-3 w-14 rounded" />
          </div>
        </div>
        {/* Table rows */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-6 px-4 h-14 border-b border-gray-100 dark:border-zinc-800 last:border-b-0"
          >
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <Skeleton className="h-4 w-36 rounded" />
            </div>
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-8 rounded" />
              <Skeleton className="h-1.5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        ))}
        {/* Pagination skeleton */}
        <div className="border-t border-gray-200 dark:border-zinc-700 px-4 py-3 flex justify-between items-center">
          <Skeleton className="h-4 w-44 rounded" />
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-8 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
