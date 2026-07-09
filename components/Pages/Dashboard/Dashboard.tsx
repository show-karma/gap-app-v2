"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import type { Hex } from "viem";
import { useUserApplications } from "@/features/user-applications/hooks/use-user-applications";
import type { UseUserApplicationsReturn } from "@/features/user-applications/types";
import { setPostLoginRedirect, useAuth } from "@/hooks/useAuth";
import type { DashboardAdminCommunity } from "@/hooks/useDashboardAdmin";
import { useDashboardAdmin } from "@/hooks/useDashboardAdmin";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { useTokenReady } from "@/hooks/useTokenReady";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { useStaff } from "@/src/core/rbac/hooks/use-staff-bridge";
import type { ProjectWithGrantsResponse } from "@/types/v2/project";
import { PAGES } from "@/utilities/pages";
import { fetchMyProjects } from "@/utilities/sdk/projects/fetchMyProjects";
import { useWhitelabel } from "@/utilities/whitelabel-context";
import { DashboardLoading } from "./DashboardLoading";
import { SuperAdminSection } from "./SuperAdminSection/SuperAdminSection";
import { BentoOverview } from "./v3/BentoOverview";
import "./v3/dashboard-soft.css";
import { GettingStartedView } from "./v3/GettingStartedView";
import type { DashModule } from "./v3/module";
import type { ModuleStatus, ModuleSummary } from "./v3/primitives";
import { SkeletonList, WarnBar } from "./v3/primitives";
import { ReviewsInboxSkeleton } from "./v3/ReviewsInboxSkeleton";
import { SoftShell } from "./v3/SoftShell";
import {
  buildApplicationsSummary,
  buildCommunitiesSummary,
  buildProjectsSummary,
} from "./v3/summaries";
import { useAdvisorData } from "./v3/useAdvisorData";
import { useReviewsSummary } from "./v3/useReviewsSummary";

// Each drill-in view (and its heavy deps — the reviewer inbox, persona editors,
// dialogs) is code-split so its chunk only downloads when that module is opened,
// not on the initial /dashboard load. The overview only needs the tile summaries.
const drillInFallback = () => <SkeletonList count={4} />;
const AdvisorFullView = dynamic(() => import("./v3/AdvisorModule").then((m) => m.AdvisorFullView), {
  ssr: false,
  loading: drillInFallback,
});
const ApplicationsFullView = dynamic(
  () => import("./v3/ApplicationsFullView").then((m) => m.ApplicationsFullView),
  { ssr: false, loading: drillInFallback }
);
const CommunitiesFullView = dynamic(
  () => import("./v3/CommunitiesFullView").then((m) => m.CommunitiesFullView),
  { ssr: false, loading: drillInFallback }
);
const ProjectsFullView = dynamic(
  () => import("./v3/ProjectsFullView").then((m) => m.ProjectsFullView),
  { ssr: false, loading: drillInFallback }
);
const ReviewsFullView = dynamic(
  () => import("./v3/ReviewsFullView").then((m) => m.ReviewsFullView),
  { ssr: false, loading: () => <ReviewsInboxSkeleton /> }
);

/** Collapse a data source's error/loading/empty flags into a tile status. */
function computeStatus(isError: boolean, isLoading: boolean, isEmpty: boolean): ModuleStatus {
  if (isError) return "error";
  if (isLoading) return "loading";
  if (isEmpty) return "empty";
  return "ready";
}

interface BuildDashboardModulesParams {
  authenticated: boolean;
  advisor: ReturnType<typeof useAdvisorData>;
  projects: ProjectWithGrantsResponse[];
  isLoadingProjects: boolean;
  isProjectsError: boolean;
  refetchProjects: () => void;
  projectsStatus: ModuleStatus;
  showReviews: boolean;
  reviewsStatus: ModuleStatus;
  reviewsSummary: ModuleSummary | undefined;
  reviewerPrograms: FundingProgram[] | undefined;
  adminCommunities: DashboardAdminCommunity[];
  showAdmin: boolean;
  communitiesStatus: ModuleStatus;
  applicationsStatus: ModuleStatus;
  applicationsHook: UseUserApplicationsReturn;
  communitySlug: string | undefined;
}

/**
 * Each role's tile is only pushed once its own gate resolves truthy (has
 * data, or admin/reviewer data is still loading so it doesn't flash-hide) —
 * kept out of the component body to stay under Biome's complexity budget.
 */
function buildDashboardModules(params: BuildDashboardModulesParams): DashModule[] {
  const {
    authenticated,
    advisor,
    projects,
    isLoadingProjects,
    isProjectsError,
    refetchProjects,
    projectsStatus,
    showReviews,
    reviewsStatus,
    reviewsSummary,
    reviewerPrograms,
    adminCommunities,
    showAdmin,
    communitiesStatus,
    applicationsStatus,
    applicationsHook,
    communitySlug,
  } = params;

  const modules: DashModule[] = [];

  if (advisor.isAdvisor) {
    modules.push({
      key: "advisor",
      label: "Funder research",
      icon: "compass",
      brand: true,
      status: advisor.status,
      summary: advisor.summary,
      onRetry: advisor.onRetry,
      empty: {
        prompt: "Ask an agent to find funders aligned to a mission — grounded in 990 filings.",
        cta: { label: "Start funder research", icon: "search" },
      },
      render: () => <AdvisorFullView authenticated={authenticated} />,
    });
  }

  if (projectsStatus !== "empty") {
    modules.push({
      key: "projects",
      label: "My projects",
      icon: "rocket",
      status: projectsStatus,
      summary: projectsStatus === "ready" ? buildProjectsSummary(projects) : undefined,
      onRetry: () => refetchProjects(),
      empty: {
        prompt: "Create a project to track grants and milestones on Karma.",
        cta: { label: "Create project", icon: "plus" },
      },
      render: () => (
        <ProjectsFullView
          projects={projects}
          isLoading={isLoadingProjects}
          isError={isProjectsError}
          refetch={refetchProjects}
        />
      ),
    });
  }

  if (showReviews) {
    modules.push({
      key: "reviews",
      label: "My reviews",
      icon: "eye",
      status: reviewsStatus,
      summary: reviewsStatus === "ready" ? reviewsSummary : undefined,
      empty: {
        prompt: "No reviewer assignments yet. Admins can add you to their programs.",
        cta: { label: "Browse communities", icon: "users" },
      },
      render: () => (
        <ReviewsFullView programs={reviewerPrograms ?? []} adminCommunities={adminCommunities} />
      ),
    });
  }

  if (showAdmin) {
    modules.push({
      key: "communities",
      label: "My communities",
      icon: "users",
      status: communitiesStatus,
      summary:
        communitiesStatus === "ready" ? buildCommunitiesSummary(adminCommunities) : undefined,
      empty: {
        prompt: "Create a community to run funding programs and review applications.",
        cta: { label: "Create community", icon: "plus" },
      },
      render: () => <CommunitiesFullView />,
    });
  }

  if (applicationsStatus !== "empty") {
    modules.push({
      key: "applications",
      label: "My applications",
      icon: "file",
      status: applicationsStatus,
      summary:
        applicationsStatus === "ready"
          ? buildApplicationsSummary(
              applicationsHook.applications,
              applicationsHook.statusCounts ?? {}
            )
          : undefined,
      onRetry: () => applicationsHook.refresh(),
      empty: {
        prompt: "Browse funding programs and submit your first application.",
        cta: { label: "Explore programs", icon: "bank" },
      },
      render: () => (
        <ApplicationsFullView communitySlug={communitySlug} applicationsHook={applicationsHook} />
      ),
    });
  }

  return modules;
}

export function Dashboard() {
  const router = useRouter();
  const { authenticated, address, ready } = useAuth();
  const { isWhitelabel, communitySlug } = useWhitelabel();
  const { isLoading: isPermissionsLoading, isGuestDueToError } = usePermissionContext();
  const { isStaff, isLoading: isStaffLoading } = useStaff();

  // Privy flips `authenticated` true before the JWT mints and flickers during
  // init; gate every data query on the resolved token instead so they fire once
  // (after auth settles) rather than refetching on each flicker. See #1804.
  const tokenReady = useTokenReady();

  const {
    programs: reviewerPrograms,
    hasPrograms: hasReviewerPrograms,
    isLoading: isReviewerProgramsLoading,
  } = useReviewerPrograms({ enabled: tokenReady });

  const userAddress = address as Hex | undefined;

  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    isError: isProjectsError,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ["myProjects", userAddress],
    queryFn: () => fetchMyProjects(userAddress),
    enabled: tokenReady,
    staleTime: 5 * 60 * 1000,
  });

  const {
    communities: adminCommunities,
    isLoading: isAdminLoading,
    isError: isAdminError,
  } = useDashboardAdmin({ enabled: tokenReady });

  const applicationsHook = useUserApplications(communitySlug ?? undefined, { enabled: tokenReady });

  const advisor = useAdvisorData(tokenReady);

  // The reviews tile shows the reviewer inbox's actual actionable count per
  // community (fetched here), not a metrics approximation.
  const reviewsSummary = useReviewsSummary(reviewerPrograms ?? [], adminCommunities, tokenReady);

  // Tracks whether a bento tile is drilled into, so the admin panel banner
  // (a bento-overview affordance) hides while a module's full view is open.
  const [isDrilledIn, setIsDrilledIn] = useState(false);

  const showAdmin = adminCommunities.length > 0 || isAdminLoading || isAdminError;
  const showSuperAdmin = isStaff;
  const hasAdminPendingReviews = adminCommunities.some((c) => c.pendingApplicationsCount > 0);
  const showReviews = hasReviewerPrograms || hasAdminPendingReviews || isAdminLoading;
  // Hold the full-page skeleton until the auth token has resolved — the data
  // queries are gated on `tokenReady`, so before it they're disabled (and would
  // otherwise read as "empty" and flash the getting-started view).
  const isLoading =
    !ready ||
    (authenticated &&
      (!tokenReady || isPermissionsLoading || isStaffLoading || isReviewerProgramsLoading));

  useEffect(() => {
    if (!ready || authenticated) return;
    if (isWhitelabel) return;
    setPostLoginRedirect(`${PAGES.DASHBOARD}${window.location.hash}`);
    router.replace(PAGES.HOME);
  }, [authenticated, ready, router, isWhitelabel]);

  if (!authenticated || isLoading) {
    return <DashboardLoading />;
  }

  const applicationsTotal = applicationsHook.statusCounts
    ? Object.values(applicationsHook.statusCounts).reduce((sum, count) => sum + count, 0)
    : 0;

  const projectsStatus = computeStatus(isProjectsError, isLoadingProjects, projects.length === 0);
  const communitiesStatus = computeStatus(
    isAdminError,
    isAdminLoading,
    adminCommunities.length === 0
  );
  const applicationsStatus = computeStatus(
    Boolean(applicationsHook.error),
    applicationsHook.isLoading,
    applicationsTotal === 0
  );
  // While the reviewer-program / admin-community lists load we can't build the
  // review communities yet; once resolved, defer to the inbox-stats summary.
  const reviewsStatus: ModuleStatus =
    isReviewerProgramsLoading || isAdminLoading ? "loading" : reviewsSummary.status;

  const modules = buildDashboardModules({
    authenticated: Boolean(authenticated),
    advisor,
    projects,
    isLoadingProjects,
    isProjectsError,
    refetchProjects,
    projectsStatus,
    showReviews,
    reviewsStatus,
    reviewsSummary: reviewsSummary.summary,
    reviewerPrograms,
    adminCommunities,
    showAdmin,
    communitiesStatus,
    applicationsStatus,
    applicationsHook,
    communitySlug: communitySlug ?? undefined,
  });

  let mainContent: ReactNode;
  if (modules.length > 0) {
    mainContent = (
      <BentoOverview modules={modules} onFocusChange={(key) => setIsDrilledIn(key != null)} />
    );
  } else if (advisor.advisorLoading) {
    // The advisor gate is the only one that can still be undecided once every
    // other module resolved empty — hold a skeleton so the getting-started
    // cards don't flash in before an advisor's tile.
    mainContent = <SkeletonList count={3} />;
  } else {
    mainContent = <GettingStartedView />;
  }

  return (
    <SoftShell address={userAddress}>
      {isGuestDueToError ? (
        <WarnBar>
          We couldn&apos;t verify your permissions. Some sections may be hidden — try refreshing.
        </WarnBar>
      ) : null}
      {mainContent}
      {showSuperAdmin && !isDrilledIn ? (
        <div className="mt-[18px]">
          <SuperAdminSection />
        </div>
      ) : null}
    </SoftShell>
  );
}
