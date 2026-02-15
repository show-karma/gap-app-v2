"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const ProjectOptionsMenu = dynamic(
  () => import("@/components/Pages/Project/ProjectOptionsMenu").then((m) => m.ProjectOptionsMenu),
  { ssr: false }
);

const ProgressDialog = dynamic(
  () => import("@/components/Dialogs/ProgressDialog").then((m) => m.ProgressDialog),
  { ssr: false }
);
const EndorsementDialog = dynamic(
  () =>
    import("@/components/Pages/Project/Impact/EndorsementDialog").then((m) => m.EndorsementDialog),
  { ssr: false }
);
const IntroDialog = dynamic(
  () => import("@/components/Pages/Project/IntroDialog").then((m) => m.IntroDialog),
  { ssr: false }
);
const ProjectOptionsDialogs = dynamic(
  () =>
    import("@/components/Pages/Project/ProjectOptionsMenu").then((m) => m.ProjectOptionsDialogs),
  { ssr: false }
);

import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useProjectProfileLayout } from "@/hooks/v2/useProjectProfileLayout";
import { useAdminTransferOwnershipModalStore } from "@/store/modals/adminTransferOwnership";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { useGrantGenieModalStore } from "@/store/modals/genie";
import { useIntroModalStore } from "@/store/modals/intro";
import { useMergeModalStore } from "@/store/modals/merge";
import { useProgressModalStore } from "@/store/modals/progress";
import { useProjectEditModalStore } from "@/store/modals/projectEdit";
import { useTransferOwnershipModalStore } from "@/store/modals/transferOwnership";
import { cn } from "@/utilities/tailwind";
import { ProjectHeader } from "../Header/ProjectHeader";
import { type ContentTab, ContentTabs } from "../MainContent/ContentTabs";
import {
  ContentTabsSkeleton,
  MobileProfileContentSkeleton,
  ProjectHeaderSkeleton,
  ProjectSidePanelSkeleton,
  ProjectStatsBarSkeleton,
} from "../Skeletons";
import { ProjectStatsBar } from "../StatsBar/ProjectStatsBar";

const EndorsementsListDialog = dynamic(
  () => import("../EndorsementsListDialog").then((m) => m.EndorsementsListDialog),
  { ssr: false }
);

const MobileHeaderMinified = dynamic(
  () => import("../Mobile/MobileHeaderMinified").then((m) => m.MobileHeaderMinified),
  { ssr: false }
);

const MobileProfileContent = dynamic(
  () => import("../Mobile/MobileProfileContent").then((m) => m.MobileProfileContent),
  { ssr: false, loading: () => <MobileProfileContentSkeleton /> }
);

const ProjectSidePanel = dynamic(
  () => import("../SidePanel/ProjectSidePanel").then((m) => m.ProjectSidePanel),
  { loading: () => <ProjectSidePanelSkeleton />, ssr: false }
);

interface ProjectProfileLayoutProps {
  children: ReactNode;
  className?: string;
}

function ProjectPermissionsBootstrap() {
  useProjectPermissions();
  return null;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [enableDeferredUI, setEnableDeferredUI] = useState(false);

  useEffect(() => {
    const enableUI = () => setEnableDeferredUI(true);

    if (typeof window.requestIdleCallback === "function") {
      const idleCallbackId = window.requestIdleCallback(enableUI, { timeout: 2000 });
      return () => window.cancelIdleCallback(idleCallbackId);
    }

    const timeoutId = window.setTimeout(enableUI, 1200);
    return () => window.clearTimeout(timeoutId);
  }, []);

  // Mobile view state: track if user is viewing Profile or other tabs on mobile
  // Read initial state from URL param: ?view=profile shows profile, otherwise show content
  const viewParam = searchParams.get("view");
  const initialView = viewParam === "profile" ? "profile" : "content";
  const [mobileView, setMobileView] = useState<"profile" | "content">(initialView);

  // Sync state with URL param changes (e.g., browser back/forward)
  useEffect(() => {
    const newView = viewParam === "profile" ? "profile" : "content";
    if (newView !== mobileView) {
      setMobileView(newView);
    }
  }, [viewParam]);

  // Update URL when mobile view changes
  const updateMobileView = useCallback(
    (newView: "profile" | "content") => {
      setMobileView(newView);

      // Update URL with view param (shallow navigation, no scroll)
      const params = new URLSearchParams(searchParams.toString());
      if (newView === "profile") {
        params.set("view", "profile");
      } else {
        params.delete("view"); // Content is default, no param needed
      }

      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Modal stores for dialogs
  const { isEndorsementOpen } = useEndorsementStore();
  const { isIntroModalOpen } = useIntroModalStore();
  const { isProgressModalOpen } = useProgressModalStore();
  const isProjectEditModalOpen = useProjectEditModalStore((s) => s.isProjectEditModalOpen);
  const isMergeModalOpen = useMergeModalStore((s) => s.isMergeModalOpen);
  const isGrantGenieModalOpen = useGrantGenieModalStore((s) => s.isGrantGenieModalOpen);
  const isTransferOwnershipModalOpen = useTransferOwnershipModalStore(
    (s) => s.isTransferOwnershipModalOpen
  );
  const isAdminTransferOwnershipModalOpen = useAdminTransferOwnershipModalStore(
    (s) => s.isAdminTransferOwnershipModalOpen
  );
  const { openModal: openContributorProfileModal } = useContributorProfileModalStore();
  const [isEndorsementsListOpen, setIsEndorsementsListOpen] = useState(false);
  const shouldRenderProjectOptionsDialogs =
    enableDeferredUI &&
    (isProjectEditModalOpen ||
      isMergeModalOpen ||
      isGrantGenieModalOpen ||
      isTransferOwnershipModalOpen ||
      isAdminTransferOwnershipModalOpen);
  const shouldRenderProjectOptionsMenu = enableDeferredUI;

  // Auto-open contributor profile modal when invite code is present in URL (only once)
  const inviteCode = searchParams.get("invite-code");
  const [hasOpenedInviteModal, setHasOpenedInviteModal] = useState(false);
  useEffect(() => {
    if (inviteCode && !hasOpenedInviteModal) {
      setHasOpenedInviteModal(true);
      openContributorProfileModal();
    }
  }, [inviteCode, hasOpenedInviteModal, openContributorProfileModal]);

  // Use lightweight layout hook — only fetches project core + grants (for stats).
  // Updates and impacts are deferred to per-tab hooks (e.g., UpdatesContent).
  const { project, isLoading, isProjectLoading, isError, isVerified, stats } =
    useProjectProfileLayout(projectId as string);

  // Get team count from project
  const teamCount = project
    ? new Set([project?.owner, ...(project?.members?.map((m) => m.address) || [])]).size
    : 0;

  // Determine active tab from pathname and mobile view state
  const getActiveTab = (): ContentTab => {
    // On mobile, if user clicked Profile tab, always show profile regardless of pathname
    // This allows Profile tab to work from any page (about, funding, etc.)
    if (mobileView === "profile") return "profile";

    const basePath = `/project/${projectId}`;
    if (pathname === `${basePath}/about`) return "about";
    if (pathname === `${basePath}/funding` || pathname?.startsWith(`${basePath}/funding/`))
      return "funding";
    if (pathname === `${basePath}/impact`) return "impact";
    if (pathname === `${basePath}/team`) return "team";
    if (pathname === `${basePath}/contact-info`) return "contact-info";
    // Default to updates for root page
    return "updates";
  };

  const activeTab = getActiveTab();

  // Handle tab changes - Profile toggles mobile view, other tabs navigate via Link
  const handleTabChange = (tab: ContentTab) => {
    if (tab === "profile") {
      updateMobileView("profile");
    } else {
      // Any other tab should switch to content view on mobile
      updateMobileView("content");
    }
  };

  // Error state - show not found page when project doesn't exist
  if (isError && !isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-6 w-full min-h-[60vh] px-4"
        data-testid="project-not-found"
      >
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-400 dark:text-zinc-500"
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Project Not Found</h1>
          <p className="text-gray-600 dark:text-zinc-400">
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
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Browse Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state - only wait for core project data, not all secondary queries
  if (isProjectLoading || !project) {
    return (
      <div className="flex flex-col gap-6 w-full" data-testid="layout-loading">
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
              <div className="animate-pulse bg-gray-100 dark:bg-zinc-800 rounded-xl h-96" />
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
      {isEndorsementsListOpen && (
        <EndorsementsListDialog
          open={isEndorsementsListOpen}
          onOpenChange={setIsEndorsementsListOpen}
        />
      )}
      {/* Start project permission checks after the initial render window. */}
      {enableDeferredUI && <ProjectPermissionsBootstrap />}
      {/* Mount project option dialogs only when one is explicitly opened. */}
      {shouldRenderProjectOptionsDialogs && <ProjectOptionsDialogs />}

      <div
        className={cn("flex flex-col gap-6 w-full", className)}
        data-testid="project-profile-layout"
      >
        {/* Desktop: Header + Stats Bar - Always visible */}
        <div className="hidden lg:flex flex-col bg-secondary border border-border rounded-xl">
          <ProjectHeader
            project={project}
            projectId={projectId as string}
            isVerified={isVerified}
          />
          {isLoading ? (
            <ProjectStatsBarSkeleton />
          ) : (
            <ProjectStatsBar
              grants={stats.grantsCount}
              endorsements={stats.endorsementsCount}
              lastUpdate={stats.lastUpdate}
              onEndorsementsClick={() => setIsEndorsementsListOpen(true)}
            />
          )}
        </div>

        {/* Mobile: Project Settings above tabs - right aligned */}
        {shouldRenderProjectOptionsMenu && (
          <div className="lg:hidden flex justify-end">
            <ProjectOptionsMenu />
          </div>
        )}

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
          <div className="lg:hidden min-h-[60px]">
            <MobileHeaderMinified project={project} isVerified={isVerified} />
          </div>
        )}

        {/* Mobile: Profile tab content (header, stats, actions, quick links) */}
        {activeTab === "profile" && (
          <div className="lg:hidden">
            <MobileProfileContent
              project={project}
              isVerified={isVerified}
              stats={stats}
              onEndorsementsClick={() => setIsEndorsementsListOpen(true)}
            />
          </div>
        )}

        {/* Main Layout: Side Panel + Content */}
        <div className="flex flex-row gap-6" data-testid="main-layout">
          {/* Side Panel - Desktop Only */}
          {enableDeferredUI ? <ProjectSidePanel project={project} /> : <ProjectSidePanelSkeleton />}

          {/* Main Content Area */}
          <div
            className="flex flex-col gap-6 flex-1 min-w-0"
            data-testid="project-main-content-area"
          >
            {/* Desktop: Project Settings above tabs */}
            {shouldRenderProjectOptionsMenu && (
              <div className="hidden lg:flex lg:justify-end">
                <ProjectOptionsMenu />
              </div>
            )}

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
