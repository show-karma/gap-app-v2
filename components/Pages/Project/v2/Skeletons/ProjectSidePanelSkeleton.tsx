import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface ProjectSidePanelSkeletonProps {
  className?: string;
}

/**
 * Skeleton component for a section separator
 */
function SeparatorSkeleton() {
  return <div className="h-px w-full bg-neutral-200 dark:bg-zinc-700" />;
}

/**
 * Skeleton for a single action section (Donate, Endorse, Subscribe)
 */
function ActionSectionSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-row items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-4 w-40" />
      </div>
      {/* Button/Input */}
      <div className="flex flex-row gap-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-20 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for ProjectSidePanel.
 * Shows placeholders for Post Update, Donate, Endorse, Subscribe, and Quick Links.
 */
export function ProjectSidePanelSkeleton({ className }: ProjectSidePanelSkeletonProps) {
  return (
    <aside
      className={cn("hidden lg:flex flex-col gap-4 w-[324px] shrink-0", className)}
      data-testid="project-side-panel-skeleton"
    >
      {/* Post an update button */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* Main Card with Donate, Endorse, Subscribe */}
      <div className="flex flex-col gap-8 p-8 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-neutral-100 dark:bg-zinc-800/50 shadow-sm">
        <ActionSectionSkeleton />
        <SeparatorSkeleton />
        <ActionSectionSkeleton />
        <SeparatorSkeleton />
        {/* Subscribe section with extra inputs */}
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

      {/* Quick Links Card */}
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
    </aside>
  );
}
