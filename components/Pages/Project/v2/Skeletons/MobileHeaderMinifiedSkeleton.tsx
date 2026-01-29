import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface MobileHeaderMinifiedSkeletonProps {
  className?: string;
}

/**
 * Skeleton loading state for MobileHeaderMinified.
 * Shows placeholder for the compact mobile header.
 */
export function MobileHeaderMinifiedSkeleton({ className }: MobileHeaderMinifiedSkeletonProps) {
  return (
    <div
      className={cn("flex flex-col gap-3 p-4 rounded-xl border border-border bg-card", className)}
      data-testid="mobile-header-minified-skeleton"
    >
      {/* Row 1: Logo + Title */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 min-w-10 min-h-10 rounded-full" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
      </div>

      {/* Row 2: Socials + Dropdown */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-5 rounded" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  );
}
