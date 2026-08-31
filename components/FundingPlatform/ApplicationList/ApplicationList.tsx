"use client";

import React, { type FC, useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { IApplicationFilters } from "@/services/fundingPlatformService";
import type { MilestoneReviewer } from "@/services/milestone-reviewers.service";
import type { ProgramReviewer } from "@/services/program-reviewers.service";
import type { IApplicationListProps, IFundingApplication } from "@/types/funding-platform";
import type { KycStatusResponse } from "@/types/kyc";
import {
  formatApplicationStatus,
  isStatusConflictError,
  STATUS_CONFLICT_MESSAGE,
  STATUS_CONFLICT_TOAST_ID,
} from "@/utilities/application-status";
import StatusChangeModal from "../ApplicationView/StatusChangeModal";
import { isAllowedStatusTransition } from "../statusTransitions";
import { ApplicationTable } from "./ApplicationTable";

const EMPTY_KYC_MAP = new Map<string, KycStatusResponse | null>();

interface IApplicationListComponentProps extends IApplicationListProps {
  communityUID?: string;
  communityId?: string;
  applications: IFundingApplication[];
  isLoading?: boolean;
  onStatusChange?: (
    applicationId: string,
    status: string,
    note?: string,
    approvedAmount?: string,
    approvedCurrency?: string
  ) => Promise<void>;
  onExport?: () => void;
  /** Re-reads the list from the API. Used to drop row actions after a conflict. */
  onRefreshApplications?: () => Promise<IFundingApplication[]>;
  /**
   * Re-reads a single application from the API, resolving with `null` when the
   * read fails. Backs the pre-flight transition check.
   */
  onFetchApplication?: (referenceNumber: string) => Promise<IFundingApplication | null>;
  showStatusActions?: boolean;
  sortBy?: IApplicationFilters["sortBy"];
  sortOrder?: IApplicationFilters["sortOrder"];
  onSortChange?: (sortBy: string) => void;
  showAIScoreColumn?: boolean;
  showInternalAIScoreColumn?: boolean;
  programReviewers?: ProgramReviewer[];
  milestoneReviewers?: MilestoneReviewer[];
  addProgramReviewer: (data: { name: string; email: string; telegram?: string }) => Promise<{
    name: string;
    email: string;
    publicAddress?: string;
  }>;
  isAddingProgramReviewer?: boolean;
  addMilestoneReviewer: (data: {
    name: string;
    email: string;
    telegram?: string;
  }) => Promise<{ name: string; email: string; publicAddress?: string }>;
  isAddingMilestoneReviewer?: boolean;
  isLoadingProgramReviewers?: boolean;
  isProgramReviewersError?: boolean;
  isLoadingMilestoneReviewers?: boolean;
  isMilestoneReviewersError?: boolean;
  onReviewerAssignmentChange?: () => void;
  isKycEnabled?: boolean;
  kycStatuses?: Map<string, KycStatusResponse | null>;
  isLoadingKycStatuses?: boolean;
}

const ApplicationListComponent: FC<IApplicationListComponentProps> = ({
  programId,
  communityUID,
  communityId,
  applications,
  isLoading = false,
  onApplicationSelect,
  onApplicationHover,
  onStatusChange,
  onRefreshApplications,
  onFetchApplication,
  showStatusActions = false,
  sortBy,
  sortOrder,
  onSortChange,
  showAIScoreColumn = false,
  showInternalAIScoreColumn = false,
  programReviewers = [],
  milestoneReviewers = [],
  addProgramReviewer,
  isAddingProgramReviewer = false,
  addMilestoneReviewer,
  isAddingMilestoneReviewer = false,
  isLoadingProgramReviewers = false,
  isProgramReviewersError = false,
  isLoadingMilestoneReviewers = false,
  isMilestoneReviewersError = false,
  onReviewerAssignmentChange,
  isKycEnabled = false,
  kycStatuses = EMPTY_KYC_MAP,
  isLoadingKycStatuses = false,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  // Pre-flight freshness read that runs before the modal opens. The ref rejects
  // the second of two clicks landing in the same tick; the state disables the
  // row actions so the first click never appears dead.
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const isCheckingStatusRef = useRef(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [pendingApplicationId, setPendingApplicationId] = useState<string>("");
  const [pendingApplication, setPendingApplication] = useState<IFundingApplication | undefined>(
    undefined
  );

  // Show all applications (no internal pagination for infinite scroll)
  const paginatedApplications = useMemo(() => applications, [applications]);

  // Determine if reviewer columns should be shown
  const showAppReviewersColumn = useMemo(() => !!programId, [programId]);
  const showMilestoneReviewersColumn = useMemo(() => !!programId, [programId]);

  const closeStatusModal = useCallback(() => {
    setStatusModalOpen(false);
    setPendingStatus("");
    setPendingApplicationId("");
    setPendingApplication(undefined);
  }, []);

  const handleStatusChangeClick = useCallback(
    async (applicationId: string, newStatus: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (isCheckingStatusRef.current) return;

      const matches = (app: IFundingApplication) =>
        app.referenceNumber === applicationId || app.id === applicationId;
      const renderedApplication = applications.find(matches);

      // Re-read this one row first: a long-lived tab can still render actions
      // for a status another reviewer already moved past, and the PUT would only
      // 409. Reading the row directly (rather than refetching the list) also
      // survives an active status filter having dropped it from the results.
      let application = renderedApplication;
      if (onFetchApplication) {
        isCheckingStatusRef.current = true;
        setIsCheckingStatus(true);
        try {
          application =
            (await onFetchApplication(renderedApplication?.referenceNumber ?? applicationId)) ??
            renderedApplication;
        } finally {
          isCheckingStatusRef.current = false;
          setIsCheckingStatus(false);
        }
      }

      if (application && !isAllowedStatusTransition(application.status, newStatus)) {
        toast.error(STATUS_CONFLICT_MESSAGE, { id: STATUS_CONFLICT_TOAST_ID });
        // Pull the table back in sync so the now-dead row actions disappear.
        onRefreshApplications?.();
        return;
      }
      setPendingApplicationId(applicationId);
      setPendingStatus(newStatus);
      setPendingApplication(application);
      setStatusModalOpen(true);
    },
    [applications, onFetchApplication, onRefreshApplications]
  );

  const handleStatusChangeConfirm = async (
    reason?: string,
    approvedAmount?: string,
    approvedCurrency?: string
  ) => {
    if (isUpdatingStatus) return;
    if (onStatusChange && pendingApplicationId && pendingStatus) {
      try {
        setIsUpdatingStatus(true);
        await onStatusChange(
          pendingApplicationId,
          pendingStatus,
          reason,
          approvedAmount,
          approvedCurrency
        );
        closeStatusModal();
        if (pendingStatus === "approved") {
          toast.success("Application approved successfully!");
        } else {
          toast.success(`Application status updated to ${formatApplicationStatus(pendingStatus)}`);
        }
      } catch (error) {
        // SUPPRESSED: the status mutation's onError owns the failure toast. Only
        // a transition conflict can never succeed, so close the modal then; a
        // correctable failure (currency, amount, reason) stays open for a fix.
        if (isStatusConflictError(error)) {
          closeStatusModal();
        }
      } finally {
        setIsUpdatingStatus(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading applications...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Table Container with horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        {paginatedApplications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">
              {applications.length === 0
                ? "No applications found."
                : "No applications match your filters."}
            </div>
          </div>
        ) : (
          <ApplicationTable
            programId={programId}
            communityUID={communityUID}
            communityId={communityId}
            applications={paginatedApplications}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={onSortChange}
            showAIScoreColumn={showAIScoreColumn}
            showInternalAIScoreColumn={showInternalAIScoreColumn}
            showAppReviewersColumn={showAppReviewersColumn}
            showMilestoneReviewersColumn={showMilestoneReviewersColumn}
            showStatusActions={showStatusActions}
            programReviewers={programReviewers}
            milestoneReviewers={milestoneReviewers}
            onAddProgramReviewer={addProgramReviewer}
            isAddingProgramReviewer={isAddingProgramReviewer}
            onAddMilestoneReviewer={addMilestoneReviewer}
            isAddingMilestoneReviewer={isAddingMilestoneReviewer}
            isLoadingProgramReviewers={isLoadingProgramReviewers}
            isProgramReviewersError={isProgramReviewersError}
            isLoadingMilestoneReviewers={isLoadingMilestoneReviewers}
            isMilestoneReviewersError={isMilestoneReviewersError}
            onApplicationSelect={onApplicationSelect}
            onApplicationHover={onApplicationHover}
            onStatusChange={handleStatusChangeClick}
            onReviewerAssignmentChange={onReviewerAssignmentChange}
            isUpdatingStatus={isUpdatingStatus || isCheckingStatus}
            isKycEnabled={isKycEnabled}
            kycStatuses={kycStatuses}
            isLoadingKycStatuses={isLoadingKycStatuses}
          />
        )}
      </div>

      {/* Pagination removed - handled by infinite scroll in parent component */}

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={statusModalOpen}
        onClose={closeStatusModal}
        onConfirm={handleStatusChangeConfirm}
        status={pendingStatus}
        isSubmitting={isUpdatingStatus}
        application={pendingApplication}
      />
    </div>
  );
};

export const ApplicationList = React.memo(ApplicationListComponent);
ApplicationList.displayName = "ApplicationList";
