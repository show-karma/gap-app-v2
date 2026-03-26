import { cn } from "@/utilities/tailwind";
import { ContentTabsSkeleton } from "./ContentTabsSkeleton";
import { MobileProfileContentSkeleton } from "./MobileProfileContentSkeleton";
import { ProjectSidePanelSkeleton } from "./ProjectSidePanelSkeleton";
import { UpdatesContentSkeleton } from "./UpdatesContentSkeleton";

interface ProjectProfileLayoutSkeletonProps {
  className?: string;
}

/**
 * Full-page skeleton for the ProjectProfileLayout.
 * Matches the new layout: sidebar profile card + tabs + content (no header/stats bar).
 */
export function ProjectProfileLayoutSkeleton({ className }: ProjectProfileLayoutSkeletonProps) {
  return (
    <div
      className={cn("flex flex-col gap-6 w-full", className)}
      data-testid="project-profile-layout-skeleton"
    >
      {/* Mobile: Profile card skeleton */}
      <div className="lg:hidden">
        <div className="flex flex-col gap-4 p-6 rounded-lg border border-border bg-background">
          <div className="flex flex-row items-start justify-between">
            <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
            <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
          </div>
          <div className="h-6 w-3/4 rounded bg-muted animate-pulse" />
          <div className="flex flex-col gap-2">
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>

      {/* Mobile: Tabs skeleton */}
      <div className="lg:hidden -mx-4 px-4">
        <ContentTabsSkeleton />
      </div>

      {/* Mobile: Support content skeleton */}
      <div className="lg:hidden">
        <MobileProfileContentSkeleton />
      </div>

      {/* Main Layout Skeleton: Side Panel + Content */}
      <div className="flex flex-row gap-16">
        <ProjectSidePanelSkeleton />
        <div className="flex flex-col gap-6 flex-1 min-w-0">
          <div className="hidden lg:block">
            <ContentTabsSkeleton />
          </div>
          <div className="flex-1">
            <UpdatesContentSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
