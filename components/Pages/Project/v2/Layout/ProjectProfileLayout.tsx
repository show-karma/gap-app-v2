"use client";

import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { ProgressDialog } from "@/components/Dialogs/ProgressDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ShareDialog } from "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/ShareDialog";
import { EndorsementDialog } from "@/components/Pages/Project/Impact/EndorsementDialog";
import { IntroDialog } from "@/components/Pages/Project/IntroDialog";
import {
  ProjectOptionsDialogs,
  ProjectOptionsMenu,
} from "@/components/Pages/Project/ProjectOptionsMenu";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { useIntroModalStore } from "@/store/modals/intro";
import { useProgressModalStore } from "@/store/modals/progress";
import { useShareDialogStore } from "@/store/modals/shareDialog";
import { cn } from "@/utilities/tailwind";
import { EndorsementsListDialog } from "../EndorsementsListDialog";
import { type ContentTab, ContentTabs } from "../MainContent/ContentTabs";
import { MobileSupportContent } from "../Mobile/MobileSupportContent";
import { ProjectSidePanel } from "../SidePanel/ProjectSidePanel";
import { SidebarProfileCard } from "../SidePanel/SidebarProfileCard";
import {
  ContentTabsSkeleton,
  MobileProfileContentSkeleton,
  ProjectSidePanelSkeleton,
} from "../Skeletons";

interface ProjectProfileLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * ProjectProfileLayout is the shared layout for all project profile pages.
 * It renders the sidebar (with profile card), tabs, and main content area.
 *
 * Layout:
 * - Desktop: 2-column (Side Panel 360px + Main Content flex). Profile info lives in sidebar.
 * - Mobile: Profile card always visible above tabs. Support tab shows Donate/Endorse/Subscribe.
 *
 * Mobile Behavior:
 * - Profile card always shown above the tab bar
 * - Support tab (mobile-only): shows Donate, Endorse, Subscribe, Quick Links
 * - Other tabs: show their page content
 *
 * Shared Components:
 * - SidebarProfileCard: avatar, name, description, socials, share (desktop sidebar + mobile top)
 * - ProjectSidePanel: profile card + Donate, Endorse, Subscribe, QuickLinks (desktop only)
 * - ContentTabs: Support (mobile), Updates, About, Funding, Impact, Team
 */
export function ProjectProfileLayout({ children, className }: ProjectProfileLayoutProps) {
  const { projectId } = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Support tab is mobile-only and has no URL — track with local state
  const [isSupportActive, setIsSupportActive] = useState(false);

  // Reset support tab when navigating to a new URL
  useEffect(() => {
    setIsSupportActive(false);
  }, [pathname]);

  // Modal stores for dialogs
  const { isEndorsementOpen } = useEndorsementStore();
  const { isIntroModalOpen } = useIntroModalStore();
  const { isProgressModalOpen } = useProgressModalStore();
  const { isOpen: isShareDialogOpen } = useShareDialogStore();
  const { openModal: openContributorProfileModal } = useContributorProfileModalStore();
  const [isEndorsementsListOpen, setIsEndorsementsListOpen] = useState(false);

  // Auto-open contributor profile modal when invite code is present in URL (only once)
  const inviteCode = searchParams.get("invite-code");
  const [hasOpenedInviteModal, setHasOpenedInviteModal] = useState(false);
  useEffect(() => {
    if (inviteCode && !hasOpenedInviteModal) {
      setHasOpenedInviteModal(true);
      openContributorProfileModal();
    }
  }, [inviteCode, hasOpenedInviteModal, openContributorProfileModal]);

  // Use unified hook for all project profile data
  const { project, isLoading, isError, isVerified, stats } = useProjectProfile(projectId as string);

  // Initialize project permissions in store (for authorization checks in ContentTabs)
  useProjectPermissions();

  // Get team count from project
  const teamCount = project
    ? new Set([project?.owner, ...(project?.members?.map((m) => m.address) || [])]).size
    : 0;

  // Determine active tab from local state (support) or URL pathname
  const getActiveTab = (): ContentTab => {
    if (isSupportActive) return "support";

    const basePath = `/project/${projectId}`;
    if (pathname === `${basePath}/about`) return "about";
    if (pathname === `${basePath}/funding` || pathname?.startsWith(`${basePath}/funding/`))
      return "funding";
    if (pathname === `${basePath}/impact`) return "impact";
    if (pathname === `${basePath}/team`) return "team";
    if (pathname === `${basePath}/contact-info`) return "contact-info";
    return "updates";
  };

  const activeTab = getActiveTab();

  // Handle tab changes — Support is mobile-only with no href, others navigate via Link
  const handleTabChange = (tab: ContentTab) => {
    if (tab === "support") {
      setIsSupportActive(true);
    } else {
      setIsSupportActive(false);
    }
  };

  // Error state
  if (isError && !isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-6 w-full min-h-[60vh] px-4"
        data-testid="project-not-found"
      >
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-400 dark:text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
            Project Not Found
          </h1>
          <p className="text-gray-600 dark:text-neutral-400">
            The project you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <div className="flex flex-row gap-3 mt-4">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-white bg-brand-blue hover:bg-brand-blue/90 rounded-lg transition-colors"
            >
              Go to Homepage
            </Link>
            <Link
              href="/projects"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Browse Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state — matches ProjectProfileLayoutSkeleton structure
  if (isLoading || !project) {
    return (
      <div className="flex flex-col gap-6 w-full" data-testid="layout-loading">
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

        {/* Main Layout Skeleton */}
        <div className="flex flex-row gap-16">
          <ProjectSidePanelSkeleton />
          <div className="flex flex-col gap-6 flex-1 min-w-0">
            <div className="hidden lg:block">
              <ContentTabsSkeleton />
            </div>
            <div className="flex-1">
              <div className="animate-pulse bg-muted rounded-xl h-96" />
            </div>
          </div>
        </div>
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
      {isShareDialogOpen && <ShareDialog />}
      <EndorsementsListDialog
        open={isEndorsementsListOpen}
        onOpenChange={setIsEndorsementsListOpen}
      />
      <ProjectOptionsDialogs />

      <div
        className={cn("flex flex-col gap-6 w-full", className)}
        data-testid="project-profile-layout"
      >
        {/* Mobile: Profile card - always visible above tabs */}
        <div className="lg:hidden">
          <SidebarProfileCard project={project} isVerified={isVerified} />
        </div>

        {/* Mobile: Project Settings - right aligned */}
        <div className="lg:hidden flex justify-end">
          <ProjectOptionsMenu />
        </div>

        {/* Mobile: Navigation tabs */}
        <div className="lg:hidden -mx-4 px-4">
          <ContentTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            fundingCount={stats.grantsCount}
            teamCount={teamCount}
          />
        </div>

        {/* Mobile: Support tab content */}
        {activeTab === "support" && (
          <div className="lg:hidden">
            <MobileSupportContent project={project} />
          </div>
        )}

        {/* Main Layout: Side Panel + Content */}
        <div className="flex flex-row gap-16" data-testid="main-layout">
          {/* Side Panel - Desktop Only */}
          <ProjectSidePanel project={project} isVerified={isVerified} />

          {/* Main Content Area */}
          <div
            className="flex flex-col gap-6 flex-1 min-w-0"
            data-testid="project-main-content-area"
          >
            {/* Desktop: Project Settings above tabs */}
            <div className="hidden lg:flex lg:justify-end">
              <ProjectOptionsMenu />
            </div>

            {/* Desktop: Content Tabs */}
            <div className="hidden lg:block">
              <ContentTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                fundingCount={stats.grantsCount}
                teamCount={teamCount}
              />
            </div>

            {/* Page content - hidden on mobile when Support tab is active */}
            <div
              className={cn("flex-1", activeTab === "support" && "hidden lg:block")}
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
