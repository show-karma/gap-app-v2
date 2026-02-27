import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface MobileProfileContentSkeletonProps {
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
 * Skeleton loading state for MobileSupportContent.
 * Shows placeholders for Post Update button, action sections, and quick links.
 */
export function MobileProfileContentSkeleton({ className }: MobileProfileContentSkeletonProps) {
  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      data-testid="mobile-support-content-skeleton"
    >
      {/* Post an update button */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* Actions Card */}
      <div className="flex flex-col gap-8 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/50">
        <ActionSectionSkeleton />
        <SeparatorSkeleton />
        <ActionSectionSkeleton />
        <SeparatorSkeleton />
        <ActionSectionSkeleton />
      </div>

      {/* Quick Links */}
      <div className="flex flex-col gap-4 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
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
    </div>
  );
}
