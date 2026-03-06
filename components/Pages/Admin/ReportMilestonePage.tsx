"use client";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAccount } from "wagmi";
import { PendingVerificationTable } from "@/components/Pages/Admin/PendingVerificationTable";
import { ReviewerFilterDropdown } from "@/components/Pages/Admin/ReviewerFilterDropdown";
import { StatsGrid } from "@/components/Pages/Admin/StatsGrid";
import { StatsTable } from "@/components/Pages/Admin/StatsTable";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { SearchDropdown } from "@/components/Pages/ProgramRegistry/SearchDropdown";
import { Button } from "@/components/Utilities/Button";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useAuth } from "@/hooks/useAuth";
import { useCommunityMilestoneReviewers } from "@/hooks/useCommunityMilestoneReviewers";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { itemsPerPage, useReportPageData } from "@/hooks/useReportPageData";
import {
  useIsReviewerType,
  usePermissionContext,
} from "@/src/core/rbac/context/permission-context";
import { ReviewerType } from "@/src/core/rbac/types";
import type { Community } from "@/types/v2/community";
import { MESSAGES } from "@/utilities/messages";
import { defaultMetadata } from "@/utilities/meta";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";

export const metadata = defaultMetadata;

function MilestonesReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-44 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50"
          >
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-7 w-16 rounded" />
              <Skeleton className="h-3.5 w-28 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
        <div className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center h-11 px-4 gap-6">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-10 rounded" />
            <Skeleton className="h-3 w-12 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-14 rounded" />
          </div>
        </div>
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-6 px-4 h-14 border-b border-gray-100 dark:border-zinc-800 last:border-b-0"
          >
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ReportMilestonePageProps {
  community: Community;
  grantPrograms: GrantProgram[];
}

export const ReportMilestonePage = ({ community, grantPrograms }: ReportMilestonePageProps) => {
  const params = useParams();
  const communityId = params.communityId as string;
  const { isConnected, address } = useAccount();
  const { authenticated: isAuth } = useAuth();
  const { hasAccess, isLoading: isLoadingAdminAccess } = useCommunityAdminAccess(community?.uid);
  const isMilestoneReviewer = useIsReviewerType(ReviewerType.MILESTONE);
  const { isLoading: isLoadingRbac, isReviewer } = usePermissionContext();
  const { programs: reviewerPrograms, isLoading: isLoadingReviewerPrograms } =
    useReviewerPrograms();

  const isAuthorized = useMemo(() => {
    if (!isConnected || !isAuth) return false;
    if (hasAccess) return true;
    return isMilestoneReviewer || isReviewer;
  }, [isConnected, isAuth, hasAccess, isMilestoneReviewer, isReviewer]);

  const isCheckingPermissions = isLoadingRbac || isLoadingAdminAccess || isLoadingReviewerPrograms;

  const reportData = useReportPageData({
    communityId,
    grantPrograms,
    hasAccess,
    isAuthorized,
    reviewerPrograms: reviewerPrograms ?? [],
    currentUserAddress: address,
    isMilestoneReviewer,
  });

  const allProgramIds = useMemo(
    () =>
      grantPrograms
        .filter(
          (p): p is typeof p & { programId: string } =>
            typeof p.programId === "string" && p.programId.length > 0
        )
        .map((p) => normalizeProgramId(p.programId)),
    [grantPrograms]
  );

  const reviewerProgramIds = useMemo(() => {
    if (!isAuthorized || reportData.activeTab !== "pending-verification") return [];
    const ids = reportData.effectiveProgramIds;
    return ids.length > 0 ? ids : allProgramIds;
  }, [isAuthorized, reportData.activeTab, reportData.effectiveProgramIds, allProgramIds]);

  const {
    reviewers,
    isLoading: isLoadingReviewers,
    isError: isReviewersError,
  } = useCommunityMilestoneReviewers(reviewerProgramIds);

  useEffect(() => {
    if (isReviewersError) {
      toast.error("Failed to load reviewers. The filter may be incomplete.", {
        id: "reviewers-load-error",
      });
    }
  }, [isReviewersError]);

  if (isCheckingPermissions) {
    return <MilestonesReportSkeleton />;
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {MESSAGES.ADMIN.NOT_AUTHORIZED(community?.details?.name || communityId || "")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Milestones Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track milestone progress across all grant programs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={reportData.handleExportCSV} className="flex items-center gap-2 py-2.5">
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </Button>
          <SearchDropdown
            list={reportData.programLabels}
            onSelectFunction={reportData.handleProgramSelect}
            cleanFunction={reportData.handleProgramClear}
            prefixUnselected="All"
            type="Grant Programs"
            selected={reportData.selectedProgramLabels}
            showCount={true}
          />
        </div>
      </div>

      <StatsGrid stats={reportData.stats} isLoading={reportData.isStatsLoading} />

      <Tabs
        value={reportData.activeTab}
        onValueChange={(value) =>
          reportData.setActiveTab(value as "pending-verification" | "stats")
        }
      >
        <TabsList>
          <TabsTrigger value="pending-verification">
            Pending Verification
            {reportData.pendingTotalItems > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 tabular-nums">
                {reportData.pendingTotalItems}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="stats">All Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="pending-verification">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-500 dark:text-zinc-400">Reviewer:</span>
            <ReviewerFilterDropdown
              reviewers={reviewers}
              isLoading={isLoadingReviewers}
              selectedAddress={reportData.selectedReviewerAddress}
              onSelect={reportData.handleReviewerAddressChange}
              currentUserAddress={address}
            />
          </div>
          <PendingVerificationTable
            milestones={reportData.pendingMilestones}
            isLoading={reportData.isPendingLoading}
            error={reportData.pendingError}
            communityId={communityId}
            page={reportData.pendingPage}
            onPageChange={reportData.setPendingPage}
            totalItems={reportData.pendingTotalItems}
            itemsPerPage={itemsPerPage}
            selectedReviewerAddress={reportData.selectedReviewerAddress}
            currentUserAddress={address}
          />
        </TabsContent>

        <TabsContent value="stats">
          <StatsTable
            reports={reportData.reports}
            isLoading={reportData.isStatsLoading}
            error={reportData.statsError}
            communityId={communityId}
            sortBy={reportData.sortBy}
            sortOrder={reportData.sortOrder}
            onSort={reportData.handleSort}
            page={reportData.statsPage}
            onPageChange={reportData.setStatsPage}
            totalItems={reportData.totalItems}
            itemsPerPage={itemsPerPage}
            isFullyCompleted={reportData.isFullyCompleted}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
