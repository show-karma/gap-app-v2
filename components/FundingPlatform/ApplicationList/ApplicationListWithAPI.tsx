"use client";

import { useMutation } from "@tanstack/react-query";
import pluralize from "pluralize";
import { type FC, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import InfiniteScroll from "react-infinite-scroll-component";
import {
  useApplicationExport,
  useFundingApplications,
  useFundingPrograms,
  useProgramConfig,
} from "@/hooks/useFundingPlatform";
import { useKycBatchStatusesByAppRef, useKycConfig } from "@/hooks/useKycStatus";
import { useMilestoneReviewers } from "@/hooks/useMilestoneReviewers";
import { useProgramReviewers } from "@/hooks/useProgramReviewers";
import type { IApplicationFilters } from "@/services/fundingPlatformService";
import { useProgramPrompts } from "@/src/features/prompt-management";
import type { IFundingApplication } from "@/types/funding-platform";
import { getAIColumnVisibility } from "../helper/getAIColumnVisibility";
import { ApplicationList } from "./ApplicationList";
import { ApplicationListFilterBar } from "./ApplicationListFilterBar";
import { ApplicationListStatsBar } from "./ApplicationListStatsBar";
import { useApplicationListFilters } from "./useApplicationListFilters";

interface IApplicationListWithAPIProps {
  programId: string; // Normalized program id (chainId suffix stripped)
  communityId: string;
  onApplicationSelect?: (application: IFundingApplication) => void;
  onApplicationHover?: (applicationId: string) => void;
  showStatusActions?: boolean;
  initialFilters?: IApplicationFilters;
  onStatusChange?: (applicationId: string, status: string, note?: string) => Promise<unknown>;
  isAdmin?: boolean;
}

const ApplicationListWithAPI: FC<IApplicationListWithAPIProps> = ({
  programId,
  communityId,
  onApplicationSelect,
  onApplicationHover,
  showStatusActions = false,
  initialFilters = {},
  isAdmin = false,
}) => {
  const {
    filters,
    searchInput,
    sortBy,
    sortOrder,
    selectedReviewerAddresses,
    setSelectedReviewerAddresses,
    queryParams,
    handleFilterChange,
    handleSearchChange,
    handleSortChange,
    clearFilters,
  } = useApplicationListFilters(initialFilters);

  const {
    applications,
    total,
    stats,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    updateApplicationStatus,
    refetch,
  } = useFundingApplications(programId, queryParams);

  // Load more function for infinite scroll
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { exportApplications, isExporting } = useApplicationExport(programId, isAdmin);

  // Fetch program config and prompts to determine AI column visibility
  const { config } = useProgramConfig(programId);
  const { data: promptsData } = useProgramPrompts(programId);

  // Fetch programs to derive communityUID (needed for the reviewer picker modal).
  // `programId` may arrive as `"programId_chainId"`, so normalize before matching.
  const normalizedProgramId = useMemo(() => programId.split("_")[0], [programId]);
  const { programs } = useFundingPrograms(communityId);
  const communityUID = useMemo(
    () => programs.find((p) => p.programId === normalizedProgramId)?.communityUID,
    [programs, normalizedProgramId]
  );

  // Fetch reviewers for the program
  const {
    data: programReviewers = [],
    isLoading: isLoadingProgramReviewers,
    isError: isProgramReviewersError,
    addReviewer: addProgramReviewer,
    isAdding: isAddingProgramReviewer,
  } = useProgramReviewers(programId);
  const {
    data: milestoneReviewers = [],
    isLoading: isLoadingMilestoneReviewers,
    isError: isMilestoneReviewersError,
    addReviewer: addMilestoneReviewer,
    isAdding: isAddingMilestoneReviewer,
  } = useMilestoneReviewers(programId);

  // Determine column visibility based on config, prompts, or application data
  const { showAIScoreColumn, showInternalAIScoreColumn } = useMemo(
    () => getAIColumnVisibility(config?.formSchema, promptsData, applications),
    [config?.formSchema, promptsData, applications]
  );

  // KYC: Collect unique reference numbers from loaded applications
  const referenceNumbers = useMemo(
    () => [...new Set(applications.map((app) => app.referenceNumber).filter(Boolean))].sort(),
    [applications]
  );

  // KYC: Fetch config and batch statuses in parallel (no waterfall)
  const { isEnabled: isKycEnabled } = useKycConfig(communityId, {
    enabled: !!communityId,
  });

  const { statuses: kycStatuses, isLoading: isLoadingKycStatuses } = useKycBatchStatusesByAppRef(
    communityId,
    referenceNumbers,
    {
      enabled: !!communityId && referenceNumbers.length > 0,
    }
  );

  const statusChangeMutation = useMutation({
    mutationFn: (vars: {
      applicationId: string;
      status: string;
      note?: string;
      approvedAmount?: string;
      approvedCurrency?: string;
    }) => updateApplicationStatus(vars),
    onSuccess: () => {
      refetch();
    },
    onError: () => {
      toast.error("Failed to update application status. Please try again.");
    },
  });

  const handleStatusChange = useCallback(
    async (
      applicationId: string,
      status: string,
      note?: string,
      approvedAmount?: string,
      approvedCurrency?: string
    ): Promise<void> => {
      await statusChangeMutation.mutateAsync({
        applicationId,
        status,
        note,
        approvedAmount,
        approvedCurrency,
      });
    },
    [statusChangeMutation]
  );

  const handleExport = useCallback(
    (format: "json" | "csv" = "json") => {
      exportApplications(format, queryParams);
    },
    [exportApplications, queryParams]
  );

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-4xl">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Error Loading Applications
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            There was an error loading the applications. Please try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <ApplicationListStatsBar stats={stats} />

      <ApplicationListFilterBar
        searchInput={searchInput}
        filters={filters}
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
        programReviewers={programReviewers}
        selectedReviewerAddresses={selectedReviewerAddresses}
        onReviewerAddressesChange={setSelectedReviewerAddresses}
        isLoadingProgramReviewers={isLoadingProgramReviewers}
        isProgramReviewersError={isProgramReviewersError}
        onClearFilters={clearFilters}
        onExport={handleExport}
        isExporting={isExporting}
      />

      <InfiniteScroll
        dataLength={applications.length}
        next={loadMore}
        hasMore={hasNextPage || false}
        loader={
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Loading more applications...
            </div>
          </div>
        }
        endMessage={
          applications.length > 0 ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {total} total {pluralize("application", total)} loaded
              </div>
            </div>
          ) : null
        }
      >
        <ApplicationList
          programId={programId}
          communityUID={communityUID}
          applications={applications}
          isLoading={isLoading && applications.length === 0}
          onApplicationSelect={onApplicationSelect}
          onApplicationHover={onApplicationHover}
          onStatusChange={showStatusActions ? handleStatusChange : undefined}
          showStatusActions={showStatusActions}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          showAIScoreColumn={showAIScoreColumn}
          showInternalAIScoreColumn={showInternalAIScoreColumn}
          programReviewers={programReviewers}
          milestoneReviewers={milestoneReviewers}
          addProgramReviewer={addProgramReviewer}
          isAddingProgramReviewer={isAddingProgramReviewer}
          addMilestoneReviewer={addMilestoneReviewer}
          isAddingMilestoneReviewer={isAddingMilestoneReviewer}
          isLoadingProgramReviewers={isLoadingProgramReviewers}
          isProgramReviewersError={isProgramReviewersError}
          isLoadingMilestoneReviewers={isLoadingMilestoneReviewers}
          isMilestoneReviewersError={isMilestoneReviewersError}
          isKycEnabled={isKycEnabled}
          kycStatuses={kycStatuses}
          isLoadingKycStatuses={isLoadingKycStatuses}
        />
      </InfiniteScroll>
    </div>
  );
};

export default ApplicationListWithAPI;
