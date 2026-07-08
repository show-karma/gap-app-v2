"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Hex } from "viem";
import { useProgramsWithConfig } from "@/features/programs/hooks/use-programs-with-config";
import { useUserApplications } from "@/features/user-applications/hooks/use-user-applications";
import { setPostLoginRedirect, useAuth } from "@/hooks/useAuth";
import { useDashboardAdmin } from "@/hooks/useDashboardAdmin";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { useStaff } from "@/src/core/rbac/hooks/use-staff-bridge";
import { PAGES } from "@/utilities/pages";
import { fetchMyProjects } from "@/utilities/sdk/projects/fetchMyProjects";
import { useWhitelabel } from "@/utilities/whitelabel-context";
import { ApplicationsSection } from "./ApplicationsSection/ApplicationsSection";
import { DashboardLoading } from "./DashboardLoading";
import { ProjectsSection } from "./ProjectsSection/ProjectsSection";
import { ReviewsSection } from "./ReviewsSection/ReviewsSection";
import { SuperAdminSection } from "./SuperAdminSection/SuperAdminSection";
import { AdvisorFullView, useAdvisorData } from "./v3/AdvisorModule";
import { BentoOverview } from "./v3/BentoOverview";
import { CommunitiesFullView } from "./v3/CommunitiesFullView";
import "./v3/dashboard-soft.css";
import type { DashModule } from "./v3/module";
import type { ModuleStatus } from "./v3/primitives";
import { WarnBar } from "./v3/primitives";
import { SoftShell } from "./v3/SoftShell";
import {
  buildApplicationsSummary,
  buildCommunitiesSummary,
  buildProjectsSummary,
  buildReviewsSummary,
} from "./v3/summaries";

export function Dashboard() {
  const router = useRouter();
  const { authenticated, address, ready } = useAuth();
  const { isWhitelabel, communitySlug } = useWhitelabel();
  const {
    isRegistryAdmin,
    isLoading: isPermissionsLoading,
    isGuestDueToError,
  } = usePermissionContext();
  const { isStaff, isLoading: isStaffLoading } = useStaff();
  const {
    programs: reviewerPrograms,
    hasPrograms: hasReviewerPrograms,
    isLoading: isReviewerProgramsLoading,
  } = useReviewerPrograms();

  const userAddress = address as Hex | undefined;

  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    isError: isProjectsError,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ["myProjects", userAddress],
    queryFn: () => fetchMyProjects(userAddress),
    enabled: Boolean(authenticated),
    staleTime: 5 * 60 * 1000,
  });

  const {
    communities: adminCommunities,
    isLoading: isAdminLoading,
    isError: isAdminError,
  } = useDashboardAdmin();

  const applicationsHook = useUserApplications(communitySlug ?? undefined);
  const { programs } = useProgramsWithConfig(communitySlug ?? "");

  const advisor = useAdvisorData(Boolean(authenticated));

  const showAdmin = adminCommunities.length > 0 || isAdminLoading || isAdminError;
  const showSuperAdmin = isRegistryAdmin || isStaff;
  const isLoading =
    !ready ||
    (authenticated && (isPermissionsLoading || isStaffLoading || isReviewerProgramsLoading));

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

  const projectsStatus: ModuleStatus = isProjectsError
    ? "error"
    : isLoadingProjects
      ? "loading"
      : projects.length === 0
        ? "empty"
        : "ready";

  const communitiesStatus: ModuleStatus = isAdminError
    ? "error"
    : isAdminLoading
      ? "loading"
      : adminCommunities.length === 0
        ? "empty"
        : "ready";

  const applicationsStatus: ModuleStatus = applicationsHook.error
    ? "error"
    : applicationsHook.isLoading
      ? "loading"
      : applicationsTotal === 0
        ? "empty"
        : "ready";

  const reviewsStatus: ModuleStatus = isReviewerProgramsLoading ? "loading" : "ready";

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
      render: () => <AdvisorFullView authenticated={Boolean(authenticated)} />,
    });
  }

  modules.push({
    key: "projects",
    label: "My projects",
    icon: "rocket",
    status: projectsStatus,
    summary: projectsStatus === "ready" ? buildProjectsSummary(projects) : undefined,
    onRetry: () => refetchProjects(),
    empty: {
      prompt: "Create a project to track grants and milestones on Karma GAP.",
      cta: { label: "Create project", icon: "plus" },
    },
    render: () => (
      <ProjectsSection
        projects={projects}
        isLoading={isLoadingProjects}
        isError={isProjectsError}
        refetch={refetchProjects}
      />
    ),
  });

  if (hasReviewerPrograms) {
    modules.push({
      key: "reviews",
      label: "My reviews",
      icon: "eye",
      status: reviewsStatus,
      summary: reviewsStatus === "ready" ? buildReviewsSummary(reviewerPrograms ?? []) : undefined,
      empty: {
        prompt: "No reviewer assignments yet. Admins can add you to their programs.",
        cta: { label: "Browse communities", icon: "users" },
      },
      render: () => <ReviewsSection />,
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
      <ApplicationsSection
        communitySlug={communitySlug ?? undefined}
        applicationsHook={applicationsHook}
        programs={programs}
      />
    ),
  });

  return (
    <SoftShell address={userAddress}>
      {isGuestDueToError ? (
        <WarnBar>
          We couldn&apos;t verify your permissions. Some sections may be hidden — try refreshing.
        </WarnBar>
      ) : null}
      <BentoOverview modules={modules} />
      {showSuperAdmin ? (
        <div className="mt-[18px]">
          <SuperAdminSection />
        </div>
      ) : null}
    </SoftShell>
  );
}
