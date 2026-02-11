"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import type { Hex } from "viem";
import { useAuth } from "@/hooks/useAuth";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { useStaff } from "@/src/core/rbac/hooks/use-staff-bridge";
import { layoutTheme } from "@/src/helper/theme";
import { fetchMyProjects } from "@/utilities/sdk/projects/fetchMyProjects";
import { AdminSection } from "./AdminSection/AdminSection";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardLoading } from "./DashboardLoading";
import { ProjectsSection } from "./ProjectsSection/ProjectsSection";
import { ReviewsSection } from "./ReviewsSection/ReviewsSection";
import { SuperAdminSection } from "./SuperAdminSection/SuperAdminSection";

export function Dashboard() {
  const { authenticated, address } = useAuth();
  const {
    isReviewer,
    isCommunityAdmin,
    isRegistryAdmin,
    isLoading: isPermissionsLoading,
    isGuestDueToError,
  } = usePermissionContext();
  const { isStaff, isLoading: isStaffLoading } = useStaff();
  const { hasPrograms: hasReviewerPrograms, isLoading: isReviewerProgramsLoading } =
    useReviewerPrograms();

  const userAddress = address as Hex | undefined;

  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    isSuccess: isProjectsSuccess,
    isError: isProjectsError,
  } = useQuery({
    queryKey: ["myProjects", userAddress],
    queryFn: () => fetchMyProjects(userAddress),
    enabled: Boolean(userAddress && authenticated),
  });

  const hasProjects = projects.length > 0;
  const showReviews = isReviewer || hasReviewerPrograms;
  const showAdmin = isCommunityAdmin;
  const showSuperAdmin = isRegistryAdmin || isStaff;
  const showEmptyState =
    isProjectsSuccess && !hasProjects && !showReviews && !showAdmin && !showSuperAdmin;
  const isLoading =
    authenticated &&
    (isPermissionsLoading || isStaffLoading || isLoadingProjects || isReviewerProgramsLoading);
  const showProjectsSection = !isProjectsError && (hasProjects || isLoadingProjects);

  useEffect(() => {
    if (isLoading || !window.location.hash) return;

    const element = document.getElementById(window.location.hash.slice(1));
    element?.scrollIntoView({ behavior: "smooth" });
  }, [isLoading, showProjectsSection, showReviews, showAdmin, showSuperAdmin]);

  if (!authenticated || !userAddress || isLoading) {
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
        {showProjectsSection ? (
          <ProjectsSection projects={projects} isLoading={isLoadingProjects} />
        ) : null}
        {showReviews ? <ReviewsSection /> : null}
        {showAdmin ? <AdminSection /> : null}
        {showSuperAdmin ? <SuperAdminSection /> : null}
        {showEmptyState ? <DashboardEmptyState /> : null}
      </div>
    </div>
  );
}
