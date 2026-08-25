import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface ProjectTabContentSkeletonProps {
  className?: string;
}

/**
 * Route-neutral fallback for the project profile's page body (DEV-612), used
 * for every tab, so it stays generic. Rendered as <output> for its implicit
 * role="status" + aria-live="polite".
 */
export function ProjectTabContentSkeleton({ className }: ProjectTabContentSkeletonProps) {
  return (
    <output
      className={cn("flex w-full flex-col gap-4", className)}
      aria-busy="true"
      aria-label="Loading project content"
      data-testid="project-tab-content-skeleton"
    >
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </output>
  );
}
