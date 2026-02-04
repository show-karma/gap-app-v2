import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface FundingContentSkeletonProps {
  className?: string;
}

/**
 * Skeleton for a single grant card
 */
function GrantCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 rounded-xl border border-border bg-card">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for FundingContent.
 * Shows placeholders for grant cards list.
 */
export function FundingContentSkeleton({ className }: FundingContentSkeletonProps) {
  const grantCount = 3;

  return (
    <div className={cn("flex flex-col gap-6", className)} data-testid="funding-content-skeleton">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Grant cards */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: grantCount }, (_, i) => (
          <GrantCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
