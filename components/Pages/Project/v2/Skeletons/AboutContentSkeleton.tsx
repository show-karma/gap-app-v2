import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface AboutContentSkeletonProps {
  className?: string;
}

/**
 * Skeleton for a single section inside the doc-style about card.
 */
function SectionSkeleton() {
  return (
    <div className="px-10 py-9">
      {/* Icon + title */}
      <div className="flex items-center gap-3 mb-5">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-32" />
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
 * Matches the doc-style single-card layout with section separators.
 */
export function AboutContentSkeleton({ className }: AboutContentSkeletonProps) {
  const sectionCount = 3;

  return (
    <div className={cn("flex flex-col gap-8", className)} data-testid="about-content-skeleton">
      {/* Doc-style card */}
      <div className="rounded-xl border bg-background overflow-hidden">
        {Array.from({ length: sectionCount }, (_, i) => (
          <div key={i}>
            {i > 0 && <div className="h-px bg-border mx-10" />}
            <SectionSkeleton />
          </div>
        ))}
      </div>

      {/* Team section skeleton */}
      <div className="flex flex-col gap-4 p-6 rounded-xl border bg-background">
        <Skeleton className="h-5 w-16" />
        <div className="flex flex-row gap-4 flex-wrap">
          <Skeleton className="h-12 w-48 rounded-lg" />
          <Skeleton className="h-12 w-48 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
