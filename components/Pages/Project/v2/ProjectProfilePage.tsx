"use client";

import { useParams } from "next/navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EndorsementDialog } from "@/components/Pages/Project/Impact/EndorsementDialog";
import { IntroDialog } from "@/components/Pages/Project/IntroDialog";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import { useProjectStore } from "@/store";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { useIntroModalStore } from "@/store/modals/intro";
import { cn } from "@/utilities/tailwind";
import { ProjectHeader } from "./Header/ProjectHeader";
import { ProjectMainContent } from "./MainContent/ProjectMainContent";
import { ProjectSidePanel } from "./SidePanel/ProjectSidePanel";
import { ProjectStatsBar } from "./StatsBar/ProjectStatsBar";

interface ProjectProfilePageProps {
  className?: string;
}

/**
 * ProjectProfilePage is the main orchestrator for the new 2-column project profile layout.
 *
 * Layout:
 * - Desktop: 2-column (Side Panel 324px + Main Content flex)
 * - Mobile: Single column (Header, Stats, Tabs, Content)
 *
 * Components:
 * - ProjectHeader: Profile, name, badge, socials, description, stage
 * - ProjectStatsBar: Horizontal stats (desktop scroll, mobile grid)
 * - ProjectSidePanel: Donate, Endorse, Subscribe, QuickLinks (desktop only)
 * - ProjectMainContent: Tabs, Filters, ActivityFeed
 *
 * Data Flow (DDD):
 * - Uses useProjectProfile hook to aggregate all data sources
 * - Business logic is delegated to project-profile.service.ts
 * - Types are centralized in types/v2/project-profile.types.ts
 */
export function ProjectProfilePage({ className }: ProjectProfilePageProps) {
  const { projectId } = useParams();
  const { isProjectAdmin } = useProjectStore();

  // Modal stores for dialogs
  const { isEndorsementOpen } = useEndorsementStore();
  const { isIntroModalOpen } = useIntroModalStore();

  // Use unified hook for all project profile data
  const { project, isLoading, isVerified, allUpdates, completedCount, stats } = useProjectProfile(
    projectId as string
  );

  // Loading state
  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-500">Loading project...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">
            Unable to load project
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">
            Something went wrong while loading the project profile. Please try refreshing the page.
          </p>
        </div>
      }
    >
      {/* Dialogs */}
      {isEndorsementOpen && <EndorsementDialog />}
      {isIntroModalOpen && <IntroDialog />}

      <div
        className={cn("flex flex-col gap-6 w-full", className)}
        data-testid="project-profile-page"
      >
        {/* Header + Stats Bar - Connected as one visual unit */}
        <div className="flex flex-col bg-secondary border border-border rounded-xl">
          <ProjectHeader project={project} isVerified={isVerified} />
          <ProjectStatsBar
            grants={stats.grantsCount}
            endorsements={stats.endorsementsCount}
            lastUpdate={stats.lastUpdate}
            completeRate={stats.completeRate}
          />
        </div>

        {/* Main Layout: Side Panel + Content */}
        <div className="flex flex-row gap-6" data-testid="main-layout">
          {/* Side Panel - Desktop Only */}
          <ProjectSidePanel project={project} />

          {/* Main Content */}
          <ProjectMainContent
            milestones={allUpdates}
            milestonesCount={allUpdates.length}
            completedCount={completedCount}
            fundingCount={stats.grantsCount}
            isAuthorized={isProjectAdmin}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
