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

interface ProjectAboutPageProps {
  className?: string;
}

/**
 * ProjectAboutPage displays the project's detailed information using the
 * same layout as the main project profile page, but with the "About" tab
 * selected by default.
 *
 * This page shows:
 * - Project header with logo, title, description, stats
 * - Side panel with Donate, Endorse, Subscribe sections and Quick Links
 * - Tab navigation with "About" tab active
 * - About content (Description, Mission, Problem, Solution, Business Model, Path to Success)
 */
export function ProjectAboutPage({ className }: ProjectAboutPageProps) {
  const { projectId } = useParams();
  const { isProjectAdmin } = useProjectStore();

  // Modal stores for dialogs
  const { isEndorsementOpen } = useEndorsementStore();
  const { isIntroModalOpen } = useIntroModalStore();

  // Use unified hook for all project profile data
  const { project, isLoading, isVerified, allUpdates, milestonesCount, completedCount, stats } =
    useProjectProfile(projectId as string);

  // Get team count from project
  const teamCount = project
    ? new Set([project?.owner, ...(project?.members?.map((m) => m.address) || [])]).size
    : 0;

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

      <div className={cn("flex flex-col gap-6 w-full", className)} data-testid="project-about-page">
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

          {/* Main Content - with About tab selected by default */}
          <ProjectMainContent
            project={project}
            milestones={allUpdates}
            milestonesCount={milestonesCount}
            completedCount={completedCount}
            fundingCount={stats.grantsCount}
            teamCount={teamCount}
            isAuthorized={isProjectAdmin}
            initialTab="about"
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
