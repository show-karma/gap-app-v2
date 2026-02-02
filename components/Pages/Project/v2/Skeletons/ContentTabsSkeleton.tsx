import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface ContentTabsSkeletonProps {
  className?: string;
}

/**
 * Skeleton loading state for ContentTabs.
 * Shows placeholder tab buttons.
 */
export function ContentTabsSkeleton({ className }: ContentTabsSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-row items-center gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-zinc-800 overflow-x-auto",
        className
      )}
      data-testid="content-tabs-skeleton"
    >
      {/* Profile tab - mobile only */}
      <Skeleton className="lg:hidden h-9 w-16 rounded-md" />
      {/* Updates tab */}
      <Skeleton className="h-9 w-20 rounded-md" />
      {/* About tab */}
      <Skeleton className="h-9 w-16 rounded-md" />
      {/* Funding tab */}
      <Skeleton className="h-9 w-24 rounded-md" />
      {/* Impact tab */}
      <Skeleton className="h-9 w-16 rounded-md" />
      {/* Team tab */}
      <Skeleton className="h-9 w-20 rounded-md" />
    </div>
  );
}
