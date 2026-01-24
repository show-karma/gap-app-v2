import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface ActivityFeedSkeletonProps {
  className?: string;
  itemCount?: number;
}

/**
 * Skeleton for a single activity item in the feed.
 */
function ActivityItemSkeleton() {
  return (
    <div className="relative pl-8 max-lg:pl-7">
      {/* Timeline icon */}
      <div className="absolute left-0 top-0 w-6 h-6 max-lg:w-5 max-lg:h-5 rounded-full border border-orange-100 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/30 flex items-center justify-center">
        <Skeleton className="h-3.5 w-3.5 rounded bg-orange-200 dark:bg-orange-800" />
      </div>

      {/* Status row */}
      <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between lg:gap-2 mb-3">
        {/* Left side: Status and Due Date */}
        <div className="flex flex-row items-center gap-1.5 lg:gap-2 flex-wrap">
          <Skeleton className="h-4 w-20 lg:h-5" />
          <Skeleton className="h-4 w-32 lg:h-5" />
        </div>

        {/* Right side: Posted by */}
        <div className="flex flex-row items-center gap-1.5 lg:gap-2">
          <Skeleton className="h-4 w-28 lg:h-5" />
          <Skeleton className="h-5 w-5 lg:h-6 lg:w-6 rounded-full" />
          <Skeleton className="h-4 w-24 lg:h-5" />
        </div>
      </div>

      {/* Activity Card */}
      <div className="border bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-400 rounded-xl p-6 gap-3 flex flex-col">
        {/* Title row */}
        <div className="flex flex-row gap-3 items-start justify-between w-full">
          <div className="flex flex-row gap-3 items-center w-full">
            <Skeleton className="w-2/3 h-6 pl-4 border-l-4 border-l-gray-300" />
            <Skeleton className="w-20 h-6 rounded-full" />
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1 w-full">
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-2/3 h-4" />
        </div>

        {/* Footer */}
        <div className="flex flex-row gap-x-4 gap-y-2 items-center justify-between w-full flex-wrap">
          <Skeleton className="w-48 h-5" />
          <Skeleton className="w-20 h-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for ActivityFeed.
 * Shows placeholder timeline items with activity cards.
 */
export function ActivityFeedSkeleton({ className, itemCount = 4 }: ActivityFeedSkeletonProps) {
  const items = Array.from({ length: itemCount }, (_, i) => i);

  return (
    <div className={cn("relative", className)} data-testid="activity-feed-skeleton">
      {/* Timeline line */}
      <div className="absolute left-[11px] max-lg:left-[9px] top-2 bottom-0 w-0.5 bg-neutral-200 dark:bg-zinc-700" />

      {/* Timeline items */}
      <div className="flex flex-col gap-6">
        {items.map((i) => (
          <ActivityItemSkeleton key={i} />
        ))}
      </div>

      {/* Timeline end dot */}
      <div className="absolute left-[10px] max-lg:left-[8px] bottom-0 w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-zinc-600" />
    </div>
  );
}
