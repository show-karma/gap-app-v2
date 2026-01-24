import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface TeamContentSkeletonProps {
  className?: string;
}

/**
 * Skeleton for a single team member card
 */
function TeamMemberCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
      {/* Avatar */}
      <Skeleton className="h-12 w-12 rounded-full shrink-0" />

      {/* Name and role */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Social links */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for TeamContent.
 * Shows placeholders for team member cards.
 */
export function TeamContentSkeleton({ className }: TeamContentSkeletonProps) {
  const memberCount = 4;

  return (
    <div className={cn("flex flex-col gap-6", className)} data-testid="team-content-skeleton">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Team members grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: memberCount }, (_, i) => (
          <TeamMemberCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
