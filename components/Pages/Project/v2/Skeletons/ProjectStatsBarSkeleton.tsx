import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface ProjectStatsBarSkeletonProps {
  className?: string;
}

/**
 * Skeleton loading state for ProjectStatsBar.
 * Shows placeholder stat items matching the actual component layout.
 */
export function ProjectStatsBarSkeleton({ className }: ProjectStatsBarSkeletonProps) {
  const statItems = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div className={cn("w-full", className)} data-testid="project-stats-bar-skeleton">
      <div className="py-6 px-4">
        {/* Desktop: Horizontal row */}
        <div className="hidden lg:block">
          <div className="flex flex-row justify-between items-center px-2">
            {statItems.map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: Wrapping grid */}
        <div className="lg:hidden">
          <div className="flex flex-row flex-wrap justify-center gap-6">
            {statItems.map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
