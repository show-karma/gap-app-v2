"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
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
import { layoutTheme } from "@/src/helper/theme";
import { PAGES } from "@/utilities/pages";
import { fetchMyProjects } from "@/utilities/sdk/projects/fetchMyProjects";
import { useWhitelabel } from "@/utilities/whitelabel-context";
import { AdminSection } from "./AdminSection/AdminSection";
import { ApplicationsSection } from "./ApplicationsSection/ApplicationsSection";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardLoading } from "./DashboardLoading";
import { ProjectsSection } from "./ProjectsSection/ProjectsSection";
import { ReviewsSection } from "./ReviewsSection/ReviewsSection";
import { SuperAdminSection } from "./SuperAdminSection/SuperAdminSection";

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
  const { hasPrograms: hasReviewerPrograms, isLoading: isReviewerProgramsLoading } =
    useReviewerPrograms();

  const userAddress = address as Hex | undefined;

  // Start all data fetches eagerly — don't wait for RBAC to finish.
  // These hooks use `enabled` guards internally so they're safe to call early.
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

  const { communities: adminCommunities, isLoading: isAdminLoading } = useDashboardAdmin();

  // Fetch applications + programs eagerly so they start in parallel with RBAC
  const applicationsHook = useUserApplications(communitySlug ?? undefined);
  const { programs } = useProgramsWithConfig(communitySlug ?? "");

  const hasProjects = projects.length > 0;
  const showReviews = hasReviewerPrograms;
  const hasAdminCommunities = adminCommunities.length > 0;
  const showAdmin = hasAdminCommunities;
  const showSuperAdmin = isRegistryAdmin || isStaff;
  const showEmptyState =
    !isLoadingProjects &&
    !isProjectsError &&
    !hasProjects &&
    !showReviews &&
    !showAdmin &&
    !showSuperAdmin &&
    !isAdminLoading;
  const isLoading =
    !ready ||
    (authenticated && (isPermissionsLoading || isStaffLoading || isReviewerProgramsLoading));

  useEffect(() => {
    if (!ready || authenticated) return;
    // In whitelabel mode, "/" is the community homepage — not a login page.
    // Don't redirect; let the dashboard show its own unauthenticated state.
    if (isWhitelabel) return;

    setPostLoginRedirect(`${PAGES.DASHBOARD}${window.location.hash}`);
    router.replace(PAGES.HOME);
  }, [authenticated, ready, router, isWhitelabel]);

  useEffect(() => {
    if (!ready || isLoading || !window.location.hash) return;

    const element = document.getElementById(window.location.hash.slice(1));
    element?.scrollIntoView({ behavior: "smooth" });
  }, [isLoading, ready, showReviews, showAdmin, showSuperAdmin]);

  if (!authenticated || isLoading) {
    return <DashboardLoading />;
  }

  return (
    <div className={layoutTheme.padding}>
      <div className="flex flex-col gap-8">
        <DashboardHeader address={userAddress} />
        {isGuestDueToError ? (
          <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              We couldn&apos;t verify your permissions. Some sections may be hidden. Try refreshing
              the page.
            </p>
          </div>
        ) : null}
        <ApplicationsSection
          communitySlug={communitySlug ?? undefined}
          applicationsHook={applicationsHook}
          programs={programs}
        />
        <ProjectsSection
          projects={projects}
          isLoading={isLoadingProjects}
          isError={isProjectsError}
          refetch={refetchProjects}
        />
        {showReviews ? <ReviewsSection /> : null}
        {showAdmin ? <AdminSection /> : null}
        {showSuperAdmin ? <SuperAdminSection /> : null}
        {showEmptyState ? <DashboardEmptyState /> : null}
      </div>
    </div>
  );
}
