"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { ApplicationListWithAPI } from "@/components/FundingPlatform";
import { IFundingApplication } from "@/types/funding-platform";
import { IApplicationFilters } from "@/services/fundingPlatformService";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/Utilities/Button";
import { ArrowLeftIcon, EyeIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import {
  useApplication,
  useApplicationStatus
} from "@/hooks/useFundingPlatform";
import { PAGES } from "@/utilities/pages";
import { layoutTheme } from "@/src/helper/theme";

/**
 * Reviewer Applications Page
 * Provides view and comment access to applications for reviewers
 * Reuses the ApplicationListWithAPI component with reviewer permissions
 */
export default function ReviewerApplicationsPage() {
  const router = useRouter();
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
    if (status) filters.status = status as any;

    const dateFrom = searchParams.get("dateFrom");
    if (dateFrom) filters.dateFrom = dateFrom;

    const dateTo = searchParams.get("dateTo");
    if (dateTo) filters.dateTo = dateTo;

    const page = searchParams.get("page");
    if (page) filters.page = parseInt(page, 10);

    const sortBy = searchParams.get("sortBy");
    if (sortBy) filters.sortBy = sortBy as any;

    const sortOrder = searchParams.get("sortOrder");
    if (sortOrder) filters.sortOrder = sortOrder as any;

    return filters;
  }, [searchParams]);

  // Check if user is a reviewer for this program
  const { hasPermission: canView, isLoading: isLoadingPermission } = usePermissions({
    programId,
    chainID: parsedChainId,
    action: "read",
  });

  // Reviewers with view permission can comment (used in ApplicationListWithAPI internally)
  // const canComment = canView; // Not directly used here but reviewers can comment in the application detail view

  // Note: applications data is fetched inside ApplicationListWithAPI component
  // We don't need to fetch it here as it would be redundant

  // Prefetch hook for better UX on hover
  const { prefetchApplication } = useApplication(null);

  // Use the custom application status hook (needed for component compatibility)
  // Destructure but don't use - this avoids the unused variable warning
  useApplicationStatus(programId, parsedChainId);

  const handleBackClick = () => {
    router.push(`/community/${communityId}/reviewer/funding-platform`);
  };

  const handleApplicationSelect = (_application: IFundingApplication) => {
    // This opens in a new tab (handled by ApplicationList component)
  };

  // Prefetch application on hover for better UX
  const handleApplicationHover = (applicationId: string) => {
    prefetchApplication(applicationId);
  };

  // Handle status change - reviewers cannot change status but the component expects this prop
  const handleStatusChange = async (_applicationId: string, _status: string, _note?: string) => {
    // This shouldn't be called for reviewers as showStatusActions is false
    return Promise.reject(new Error("Reviewers cannot change application status"));
  };

  if (isLoadingPermission) {
    return (
      <div className="flex w-full items-center justify-center min-h-[600px]">
        <Spinner />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className={layoutTheme.padding}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">
            You don&apos;t have permission to view applications for this program.
          </p>
          <Button
            onClick={handleBackClick}
            variant="secondary"
            className="mt-4 flex items-center"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Programs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header with Reviewer Badge */}
      <div className="bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-gray-700">
        <div className="sm:px-3 md:px-4 px-6 py-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <Button
                onClick={handleBackClick}
                variant="secondary"
                className="flex items-center"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Funding Applications
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Program ID: {programId} | Chain ID: {parsedChainId}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Reviewer Access Badge */}
              <div className="flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full">
                <EyeIcon className="w-4 h-4 text-blue-700 dark:text-blue-300 mr-2" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Reviewer Access
                </span>
              </div>

              {/* View Form Button */}
              <Link
                href={PAGES.REVIEWER.QUESTION_BUILDER(communityId, programId, parsedChainId)}
              >
                <Button variant="secondary" className="flex items-center">
                  <EyeIcon className="w-4 h-4 mr-2" />
                  View Form
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="sm:px-3 md:px-4 px-6 py-2 flex-1">
        <ApplicationListWithAPI
          programId={programId}
          chainId={parsedChainId}
          showStatusActions={false} // Reviewers cannot change status
          onApplicationSelect={handleApplicationSelect}
          onApplicationHover={handleApplicationHover}
          initialFilters={initialFilters}
          onStatusChange={handleStatusChange} // Required prop but won't be used
          isAdmin={false} // Explicitly set as non-admin (allows commenting)
        />
      </div>
    </div>
  );
}