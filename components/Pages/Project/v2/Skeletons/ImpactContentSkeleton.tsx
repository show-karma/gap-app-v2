import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface ImpactContentSkeletonProps {
  className?: string;
}

/**
 * Skeleton for a single impact card
 */
function ImpactCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      {/* Impact description */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Work done */}
      <div className="flex flex-col gap-2 p-4 rounded-lg bg-muted">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for ImpactContent.
 * Shows placeholders for impact/outcome cards.
 */
export function ImpactContentSkeleton({ className }: ImpactContentSkeletonProps) {
  const impactCount = 3;

  return (
    <div className={cn("flex flex-col gap-6", className)} data-testid="impact-content-skeleton">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Impact cards */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: impactCount }, (_, i) => (
          <ImpactCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
