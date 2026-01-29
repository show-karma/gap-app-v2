import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface AboutContentSkeletonProps {
  className?: string;
}

/**
 * Skeleton for a single about section (Problem, Solution, Mission, etc.)
 */
function SectionSkeleton({ hasButton = false }: { hasButton?: boolean }) {
  return (
    <div className="flex flex-col gap-4 p-6 rounded-xl border border-border bg-card">
      {/* Header with icon and title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>
        {hasButton && <Skeleton className="h-8 w-8 rounded" />}
      </div>

      {/* Content paragraphs */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for AboutContent.
 * Shows placeholders for project description sections.
 */
export function AboutContentSkeleton({ className }: AboutContentSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)} data-testid="about-content-skeleton">
      {/* Main description section */}
      <SectionSkeleton hasButton />

      {/* Problem/Solution grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionSkeleton />
        <SectionSkeleton />
      </div>

      {/* Mission/Vision */}
      <SectionSkeleton />

      {/* Tags/Categories */}
      <div className="flex flex-col gap-4 p-6 rounded-xl border border-border bg-card">
        <Skeleton className="h-6 w-24" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}
