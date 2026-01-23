"use client";

import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EndorsementDialog } from "@/components/Pages/Project/Impact/EndorsementDialog";
import { IntroDialog } from "@/components/Pages/Project/IntroDialog";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { useIntroModalStore } from "@/store/modals/intro";
import { cn } from "@/utilities/tailwind";
import { ProjectHeader } from "../Header/ProjectHeader";
import { type ContentTab, ContentTabs } from "../MainContent/ContentTabs";
import { ProjectSidePanel } from "../SidePanel/ProjectSidePanel";
import { ProjectStatsBar } from "../StatsBar/ProjectStatsBar";

interface ProjectProfileLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * ProjectProfileLayout is the shared layout for all project profile pages.
 * It renders the header, stats bar, sidebar, and tabs - with children as the content area.
 *
 * Layout:
 * - Desktop: 2-column (Side Panel 324px + Main Content flex)
 * - Mobile: Single column (Header, Stats, Tabs, Content)
 *
 * Shared Components:
 * - ProjectHeader: Profile, name, badge, socials, description, stage
 * - ProjectStatsBar: Horizontal stats (desktop scroll, mobile grid)
 * - ProjectSidePanel: Donate, Endorse, Subscribe, QuickLinks (desktop only)
 * - ContentTabs: Navigation tabs for Updates, About, Funding, Impact, Team
 *
 * Data Flow:
 * - Uses useProjectProfile hook to aggregate all data sources
 * - Active tab is determined from the current pathname
 */
export function ProjectProfileLayout({ children, className }: ProjectProfileLayoutProps) {
  const { projectId } = useParams();
  const pathname = usePathname();

  // Modal stores for dialogs
  const { isEndorsementOpen } = useEndorsementStore();
  const { isIntroModalOpen } = useIntroModalStore();

  // Use unified hook for all project profile data
  const { project, isLoading, isVerified, stats } = useProjectProfile(projectId as string);

  // Get team count from project
  const teamCount = project
    ? new Set([project?.owner, ...(project?.members?.map((m) => m.address) || [])]).size
    : 0;

  // Determine active tab from pathname
  const getActiveTab = (): ContentTab => {
    const basePath = `/project/${projectId}`;
    if (pathname === `${basePath}/about`) return "about";
    if (pathname === `${basePath}/funding` || pathname?.startsWith(`${basePath}/funding/`))
      return "funding";
    if (pathname === `${basePath}/impact`) return "impact";
    if (pathname === `${basePath}/team`) return "team";
    return "updates";
  };

  const activeTab = getActiveTab();

  // Loading state
  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="layout-loading">
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
        data-testid="project-profile-layout"
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

          {/* Main Content Area */}
          <div
            className="flex flex-col gap-6 flex-1 min-w-0"
            data-testid="project-main-content-area"
          >
            {/* Content Tabs - Shared across all pages */}
            <ContentTabs
              activeTab={activeTab}
              fundingCount={stats.grantsCount}
              teamCount={teamCount}
            />

            {/* Page-specific content */}
            <div className="flex-1" data-testid="tab-content">
              {children}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
