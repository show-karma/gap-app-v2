import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface ProjectSidePanelSkeletonProps {
  className?: string;
}

function SeparatorSkeleton() {
  return <div className="h-px w-full bg-neutral-200 dark:bg-neutral-700" />;
}

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
 * Skeleton loading state for ProjectSidePanel.
 * Shows placeholders for Post Update, Profile card, Donate, Endorse, Subscribe, and Quick Links.
 */
export function ProjectSidePanelSkeleton({ className }: ProjectSidePanelSkeletonProps) {
  return (
    <aside
      className={cn("hidden lg:flex flex-col gap-4 w-[360px] shrink-0", className)}
      data-testid="project-side-panel-skeleton"
    >
      {/* Post an update button */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* Outer card: profile + actions */}
      <div className="flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/50 shadow-sm overflow-hidden">
        {/* Inner white profile card */}
        <div className="flex flex-col gap-4 p-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex flex-row items-start justify-between">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-row gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-8 p-8">
          <ActionSectionSkeleton />
          <SeparatorSkeleton />
          <ActionSectionSkeleton />
          <SeparatorSkeleton />
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
      </div>

      {/* Quick Links Card */}
      <div className="flex flex-col gap-4 p-8 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm">
        <Skeleton className="h-6 w-24" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i}>
              <div className="flex flex-row items-center gap-2 py-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
              {i < 2 && <div className="h-px w-full bg-neutral-200 dark:bg-neutral-700" />}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
