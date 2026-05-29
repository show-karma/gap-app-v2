import { Skeleton } from "@/components/Utilities/Skeleton";

const SKELETON_PLACEHOLDERS = ["a", "b", "c", "d", "e", "f"] as const;

export function CommunityAdminLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {SKELETON_PLACEHOLDERS.map((slot) => (
        <div
          key={slot}
          className="border border-zinc-300 rounded-lg p-6 bg-white dark:bg-zinc-900 shadow-sm"
        >
          {/* Network skeleton */}
          <div className="mb-3">
            <div className="flex flex-row gap-2 items-center">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          {/* Header skeleton */}
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>

          {/* UUID skeleton */}
          <div className="mb-4">
            <Skeleton className="h-3 w-12 mb-1" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6 mt-1" />
          </div>

          {/* Links skeleton */}
          <div className="mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-700">
            <Skeleton className="h-3 w-20 mb-2" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24 mt-1" />
            </div>
          </div>

          {/* Admins skeleton */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full rounded" />
              <Skeleton className="h-8 w-full rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
