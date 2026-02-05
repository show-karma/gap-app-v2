import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";
import { ActivityFeedSkeleton } from "./ActivityFeedSkeleton";

interface UpdatesContentSkeletonProps {
  className?: string;
}

/**
 * Skeleton loading state for UpdatesContent.
 * Shows placeholders for filters and activity feed.
 */
export function UpdatesContentSkeleton({ className }: UpdatesContentSkeletonProps) {
  return (
    <div className={cn("", className)} data-testid="updates-content-skeleton">
      {/* Filters */}
      <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
        {/* Sort dropdown */}
        <Skeleton className="h-9 w-32 rounded-lg" />

        {/* Filter chips */}
        <div className="flex flex-row items-center gap-2 flex-wrap">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>

      {/* Activity Feed */}
      <div className="mt-6">
        <ActivityFeedSkeleton itemCount={4} />
      </div>
    </div>
  );
}
