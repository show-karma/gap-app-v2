import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";
import { ProjectHeaderSkeleton } from "./ProjectHeaderSkeleton";
import { ProjectStatsBarSkeleton } from "./ProjectStatsBarSkeleton";

interface MobileProfileContentSkeletonProps {
  className?: string;
}

/**
 * Skeleton component for a section separator
 */
function SeparatorSkeleton() {
  return <div className="h-px w-full bg-neutral-200 dark:bg-zinc-700" />;
}

/**
 * Skeleton for a single action section
 */
function ActionSectionSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-row items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex flex-row gap-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-20 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for MobileProfileContent.
 * Shows placeholders for header, stats, actions, and quick links on mobile.
 */
export function MobileProfileContentSkeleton({ className }: MobileProfileContentSkeletonProps) {
  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      data-testid="mobile-profile-content-skeleton"
    >
      {/* Header + Stats */}
      <div className="flex flex-col bg-secondary border border-border rounded-xl">
        <ProjectHeaderSkeleton />
        <ProjectStatsBarSkeleton />
      </div>

      {/* Post an update button */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* Actions Card */}
      <div className="flex flex-col gap-8 p-6 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-neutral-100 dark:bg-zinc-800/50">
        <ActionSectionSkeleton />
        <SeparatorSkeleton />
        <ActionSectionSkeleton />
        <SeparatorSkeleton />
        {/* Subscribe section */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex flex-row items-center gap-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-6 w-28" />
            </div>
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg self-end" />
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex flex-col gap-4 p-8 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm">
        <Skeleton className="h-6 w-24" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i}>
              <div className="flex flex-row items-center gap-2 py-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
              {i < 2 && <div className="h-px w-full bg-neutral-200 dark:bg-zinc-700" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
