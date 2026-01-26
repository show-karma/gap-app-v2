"use client";

import { usePathname } from "next/navigation";
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
import { type ContentTab, ContentTabs } from "../MainContent/ContentTabs";
import { MobileHeaderMinified } from "../Mobile/MobileHeaderMinified";
import { MobileProfileContent } from "../Mobile/MobileProfileContent";
import { ProjectSidePanel } from "../SidePanel/ProjectSidePanel";
import {
  ContentTabsSkeleton,
  MobileHeaderMinifiedSkeleton,
  MobileProfileContentSkeleton,
  ProjectSidePanelSkeleton,
} from "../Skeletons";

interface ProjectProfileClientShellProps {
  projectId: string;
  children: ReactNode;
  className?: string;
}

/**
 * ProjectProfileClientShell is the client-side interactive shell for the project profile.
 *
 * This component handles all client-only concerns:
 * - Mobile view state (profile vs content toggle)
 * - Modal stores (endorsement, intro, progress dialogs)
 * - Tab navigation state
 * - Side panel rendering
 *
 * The header and stats bar are rendered by the parent server component
 * with their own Suspense boundaries for optimal streaming.
 *
 * Layout:
 * - Desktop: 2-column (Side Panel 324px + Main Content flex)
 * - Mobile: Single column with Profile/Updates view switching
 */
export function ProjectProfileClientShell({
  projectId,
  children,
  className,
}: ProjectProfileClientShellProps) {
  const pathname = usePathname();

  // Mobile view state: track if user is viewing Profile or other tabs on mobile
  const [mobileView, setMobileView] = useState<"profile" | "content">("profile");

  // Modal stores for dialogs
  const { isEndorsementOpen } = useEndorsementStore();
  const { isIntroModalOpen } = useIntroModalStore();
  const { isProgressModalOpen } = useProgressModalStore();

  // Use unified hook for project profile data (hydrated from server prefetch)
  const { project, isLoading, isVerified, stats } = useProjectProfile(projectId);

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
    // On desktop, ContentTabs handles showing Updates as active when Profile is selected
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

  // Loading state for mobile components - show skeletons
  if (isLoading || !project) {
    return (
      <>
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
            <div className="flex-1">{children}</div>
          </div>
        </div>
      </>
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

      {/* Mobile: Navigation tabs at the top */}
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
      <div className={cn("flex flex-row gap-6", className)} data-testid="main-layout">
        {/* Side Panel - Desktop Only */}
        <ProjectSidePanel project={project} />

        {/* Main Content Area */}
        <div className="flex flex-col gap-6 flex-1 min-w-0" data-testid="project-main-content-area">
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
    </ErrorBoundary>
  );
}
