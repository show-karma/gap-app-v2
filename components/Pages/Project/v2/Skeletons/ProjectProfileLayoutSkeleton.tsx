import { cn } from "@/utilities/tailwind";
import { ContentTabsSkeleton } from "./ContentTabsSkeleton";
import { MobileProfileContentSkeleton } from "./MobileProfileContentSkeleton";
import { ProjectHeaderSkeleton } from "./ProjectHeaderSkeleton";
import { ProjectSidePanelSkeleton } from "./ProjectSidePanelSkeleton";
import { ProjectStatsBarSkeleton } from "./ProjectStatsBarSkeleton";
import { UpdatesContentSkeleton } from "./UpdatesContentSkeleton";

interface ProjectProfileLayoutSkeletonProps {
  className?: string;
}

/**
 * Full-page skeleton for the ProjectProfileLayout.
 * Used as a loading fallback when the entire layout is loading.
 */
export function ProjectProfileLayoutSkeleton({ className }: ProjectProfileLayoutSkeletonProps) {
  return (
    <div
      className={cn("flex flex-col gap-6 w-full", className)}
      data-testid="project-profile-layout-skeleton"
    >
      {/* Desktop: Header + Stats Bar Skeleton */}
      <div className="hidden lg:flex flex-col bg-secondary border border-border rounded-xl">
        <ProjectHeaderSkeleton />
        <ProjectStatsBarSkeleton />
      </div>

      {/* Mobile: Tabs Skeleton */}
      <div className="lg:hidden -mx-4 px-4">
        <ContentTabsSkeleton />
      </div>

      {/* Mobile: Profile Content Skeleton */}
      <div className="lg:hidden">
        <MobileProfileContentSkeleton />
      </div>

      {/* Main Layout Skeleton */}
      <div className="flex flex-row gap-6">
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
