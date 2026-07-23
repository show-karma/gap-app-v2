import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

interface MobileProfileContentSkeletonProps {
  className?: string;
}

const QUICK_LINK_SKELETON_KEYS = ["quick-link-1", "quick-link-2", "quick-link-3"];

function SeparatorSkeleton() {
  return <div className="h-px w-full bg-border" />;
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
      <div className="flex flex-col gap-8 p-6 rounded-xl border bg-background">
        <ActionSectionSkeleton />
        <SeparatorSkeleton />
        <ActionSectionSkeleton />
        <SeparatorSkeleton />
        <ActionSectionSkeleton />
      </div>

      {/* Quick Links */}
      <div className="flex flex-col gap-4 p-6 rounded-xl border bg-background">
        <Skeleton className="h-6 w-24" />
        <div className="flex flex-col gap-2">
          {QUICK_LINK_SKELETON_KEYS.map((key, i) => (
            <div key={key}>
              <div className="flex flex-row items-center gap-2 py-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
              {i < 2 && <div className="h-px w-full bg-border" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
