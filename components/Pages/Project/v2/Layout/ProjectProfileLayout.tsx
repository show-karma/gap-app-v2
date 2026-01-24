"use client";

import { useParams, usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { ProgressDialog } from "@/components/Dialogs/ProgressDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EndorsementDialog } from "@/components/Pages/Project/Impact/EndorsementDialog";
import { IntroDialog } from "@/components/Pages/Project/IntroDialog";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { useIntroModalStore } from "@/store/modals/intro";
import { useProgressModalStore } from "@/store/modals/progress";
import { cn } from "@/utilities/tailwind";
import { ProjectHeader } from "../Header/ProjectHeader";
import { type ContentTab, ContentTabs } from "../MainContent/ContentTabs";
import { MobileHeaderMinified } from "../Mobile/MobileHeaderMinified";
import { MobileProfileContent } from "../Mobile/MobileProfileContent";
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
 * - Mobile: Single column with Profile/Updates view switching
 *
 * Mobile Behavior:
 * - Profile tab (first, mobile-only): Shows full header, stats, actions, quick links
 * - Updates tab: Shows updates content with minified header
 * - Other tabs: Shows their content with minified header
 *
 * Shared Components:
 * - ProjectHeader: Profile, name, badge, socials, description, stage
 * - ProjectStatsBar: Horizontal stats (desktop scroll, mobile grid)
 * - ProjectSidePanel: Donate, Endorse, Subscribe, QuickLinks (desktop only)
 * - ContentTabs: Navigation tabs for Profile (mobile), Updates, About, Funding, Impact, Team
 */
export function ProjectProfileLayout({ children, className }: ProjectProfileLayoutProps) {
  const { projectId } = useParams();
  const pathname = usePathname();

  // Mobile view state: track if user is viewing Profile or other tabs on mobile
  // Default to "profile" on mobile when at root URL
  const [mobileView, setMobileView] = useState<"profile" | "content">("profile");

  // Modal stores for dialogs
  const { isEndorsementOpen } = useEndorsementStore();
  const { isIntroModalOpen } = useIntroModalStore();
  const { isProgressModalOpen } = useProgressModalStore();

  // Use unified hook for all project profile data
  const { project, isLoading, isVerified, stats } = useProjectProfile(projectId as string);

  // Initialize project permissions in store (for authorization checks in ContentTabs)
  useProjectPermissions();

  // Get team count from project
  const teamCount = project
    ? new Set([project?.owner, ...(project?.members?.map((m) => m.address) || [])]).size
    : 0;

  // Check if we're on the root project page (where Profile/Updates toggle applies)
  const isRootPage = pathname === `/project/${projectId}`;

  // Determine active tab from pathname and mobile view state
  const getActiveTab = (): ContentTab => {
    const basePath = `/project/${projectId}`;
    if (pathname === `${basePath}/about`) return "about";
    if (pathname === `${basePath}/funding` || pathname?.startsWith(`${basePath}/funding/`))
      return "funding";
    if (pathname === `${basePath}/impact`) return "impact";
    if (pathname === `${basePath}/team`) return "team";
    if (pathname === `${basePath}/contact-info`) return "contact-info";
    // On root page, use mobile view state to determine active tab
    return mobileView === "profile" ? "profile" : "updates";
  };

  const activeTab = getActiveTab();

  // Handle tab changes - for Profile/Updates, just update state instead of navigating
  const handleTabChange = (tab: ContentTab) => {
    if (tab === "profile") {
      setMobileView("profile");
    } else if (tab === "updates" && isRootPage) {
      setMobileView("content");
    }
    // Other tabs will navigate via Link href
  };

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
      {isProgressModalOpen && <ProgressDialog />}

      <div
        className={cn("flex flex-col gap-6 w-full", className)}
        data-testid="project-profile-layout"
      >
        {/* Desktop: Header + Stats Bar - Always visible */}
        <div className="hidden lg:flex flex-col bg-secondary border border-border rounded-xl">
          <ProjectHeader project={project} isVerified={isVerified} />
          <ProjectStatsBar
            grants={stats.grantsCount}
            endorsements={stats.endorsementsCount}
            lastUpdate={stats.lastUpdate}
            completeRate={stats.completeRate}
          />
        </div>

        {/* Mobile: Navigation tabs at the top - always first on mobile */}
        {/* Use negative margins to extend tabs full width beyond container padding */}
        <div className="lg:hidden -mx-4 px-4">
          <ContentTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            fundingCount={stats.grantsCount}
            teamCount={teamCount}
          />
        </div>

        {/* Mobile: Minified header when NOT on Profile tab */}
        {activeTab !== "profile" && (
          <div className="lg:hidden">
            <MobileHeaderMinified project={project} isVerified={isVerified} />
          </div>
        )}

        {/* Mobile: Profile tab content (header, stats, actions, quick links) */}
        {activeTab === "profile" && (
          <div className="lg:hidden">
            <MobileProfileContent project={project} isVerified={isVerified} stats={stats} />
          </div>
        )}

        {/* Main Layout: Side Panel + Content */}
        <div className="flex flex-row gap-6" data-testid="main-layout">
          {/* Side Panel - Desktop Only */}
          <ProjectSidePanel project={project} />

          {/* Main Content Area */}
          <div
            className="flex flex-col gap-6 flex-1 min-w-0"
            data-testid="project-main-content-area"
          >
            {/* Desktop: Content Tabs */}
            <div className="hidden lg:block">
              <ContentTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                fundingCount={stats.grantsCount}
                teamCount={teamCount}
              />
            </div>

            {/* Page-specific content - hidden on mobile when Profile tab is active */}
            <div
              className={cn("flex-1", activeTab === "profile" && "hidden lg:block")}
              data-testid="tab-content"
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
