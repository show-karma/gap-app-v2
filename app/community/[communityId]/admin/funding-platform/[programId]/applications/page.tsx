"use client";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ApplicationListWithAPI } from "@/components/FundingPlatform";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import {
  useApplication,
  useApplicationStatus,
  useFundingApplications,
} from "@/hooks/useFundingPlatform";
import { usePermissions } from "@/hooks/usePermissions";
import { useStaff } from "@/hooks/useStaff";
import type { IApplicationFilters } from "@/services/fundingPlatformService";
import { layoutTheme } from "@/src/helper/theme";
import { useOwnerStore } from "@/store";
import type { IFundingApplication } from "@/types/funding-platform";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";

export default function ApplicationsPage() {
  const router = useRouter();
  const _pathname = usePathname();
  const searchParams = useSearchParams();
  const { communityId, programId: combinedProgramId } = useParams() as {
    communityId: string;
    programId: string;
  };

  // Extract programId and chainId from the combined format (e.g., "777_11155111")
  const [programId, chainId] = combinedProgramId.split("_");
  const parsedChainId = parseInt(chainId, 10);

  // Parse initial filters from URL
  const initialFilters = useMemo((): IApplicationFilters => {
    const filters: IApplicationFilters = {};

    const search = searchParams.get("search");
    if (search) filters.search = search;

    const status = searchParams.get("status");
    if (status) filters.status = status;

    const dateFrom = searchParams.get("dateFrom");
    if (dateFrom) filters.dateFrom = dateFrom;

    const dateTo = searchParams.get("dateTo");
    if (dateTo) filters.dateTo = dateTo;

    const page = searchParams.get("page");
    if (page) filters.page = parseInt(page, 10);

    const sortBy = searchParams.get("sortBy");
    if (sortBy) filters.sortBy = sortBy as IApplicationFilters["sortBy"];

    const sortOrder = searchParams.get("sortOrder");
    if (sortOrder) filters.sortOrder = sortOrder as IApplicationFilters["sortOrder"];

    return filters;
  }, [searchParams]);

  // State no longer needed for sidesheet

  const { isCommunityAdmin, isLoading: isLoadingAdmin } = useIsCommunityAdmin(communityId);
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isStaff, isLoading: isStaffLoading } = useStaff();

  // Check if user is a reviewer for this program
  const { hasPermission: canView, isLoading: isLoadingPermission } = usePermissions({
    programId,
    chainID: parsedChainId,
    action: "read",
  });

  const { hasPermission: _canComment } = usePermissions({
    programId,
    chainID: parsedChainId,
    action: "comment",
  });

  // Use the funding applications hook to get applications data
  const { applications: _applications } = useFundingApplications(
    programId,
    parsedChainId,
    initialFilters
  );

  // Prefetch hook for better UX on hover
  const { prefetchApplication } = useApplication(null);

  // Use the custom application status hook
  const { updateStatusAsync } = useApplicationStatus(programId, parsedChainId);

  // Admin, owner, staff have full access; reviewers have view and comment access
  const hasAccess = isCommunityAdmin || isOwner || isStaff || canView;
  const isAdmin = isCommunityAdmin || isOwner || isStaff;
  const isReviewer = canView && !isAdmin;

  const handleBackClick = () => {
    router.push(PAGES.ADMIN.FUNDING_PLATFORM(communityId));
  };

  const handleApplicationSelect = (_application: IFundingApplication) => {
    // This function is now called by ApplicationList but we handle opening in new tab there
    // Keep this for compatibility but it won't be directly used
  };

  // Prefetch application on hover for better UX
  const handleApplicationHover = (applicationId: string) => {
    prefetchApplication(applicationId);
  };

  // Handle status change for both ApplicationList and ApplicationDetailSidesheet
  const handleStatusChange = async (applicationId: string, status: string, note?: string) => {
    return updateStatusAsync({ applicationId, status, note });
  };

  if (isLoadingAdmin || isStaffLoading || isLoadingPermission) {
    return (
      <div className="flex w-full items-center justify-center min-h-[600px]">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className={layoutTheme.padding}>
        <p className="text-red-500">
          {isReviewer
            ? "You don't have permission to view applications for this program."
            : MESSAGES.REVIEWS.NOT_ADMIN}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-gray-700">
        <div className="sm:px-3 md:px-4 px-6 py-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <Button onClick={handleBackClick} variant="secondary" className="flex items-center">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Funding Applications
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Program ID: {programId}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {isAdmin && (
                <Link
                  href={PAGES.ADMIN.FUNDING_PLATFORM_QUESTION_BUILDER(
                    communityId,
                    combinedProgramId
                  )}
                >
                  <Button variant="primary" className="flex items-center">
                    <Cog6ToothIcon className="w-4 h-4 mr-2" />
                    Configure Form
                  </Button>
                </Link>
              )}
              {isReviewer && (
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  Reviewer Mode
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="sm:px-3 md:px-4 px-6 py-2 flex-1 ">
        <ApplicationListWithAPI
          programId={programId}
          chainId={parsedChainId}
          showStatusActions={isAdmin}
          onApplicationSelect={handleApplicationSelect}
          onApplicationHover={handleApplicationHover}
          initialFilters={initialFilters}
          onStatusChange={handleStatusChange}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
