"use client";

import React, { type FC, useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { IApplicationFilters } from "@/services/fundingPlatformService";
import type { MilestoneReviewer } from "@/services/milestone-reviewers.service";
import type { ProgramReviewer } from "@/services/program-reviewers.service";
import type { IApplicationListProps, IFundingApplication } from "@/types/funding-platform";
import StatusChangeModal from "../ApplicationView/StatusChangeModal";
import { ApplicationTable } from "./ApplicationTable";

interface IApplicationListComponentProps extends IApplicationListProps {
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
  showStatusActions?: boolean;
  sortBy?: IApplicationFilters["sortBy"];
  sortOrder?: IApplicationFilters["sortOrder"];
  onSortChange?: (sortBy: string) => void;
  showAIScoreColumn?: boolean;
  showInternalAIScoreColumn?: boolean;
  programReviewers?: ProgramReviewer[];
  milestoneReviewers?: MilestoneReviewer[];
  isLoadingProgramReviewers?: boolean;
  isProgramReviewersError?: boolean;
  isLoadingMilestoneReviewers?: boolean;
  isMilestoneReviewersError?: boolean;
  onReviewerAssignmentChange?: () => void;
}

const ApplicationListComponent: FC<IApplicationListComponentProps> = ({
  applications,
  isLoading = false,
  onApplicationSelect,
  onApplicationHover,
  onStatusChange,
  showStatusActions = false,
  sortBy,
  sortOrder,
  onSortChange,
  showAIScoreColumn = false,
  showInternalAIScoreColumn = false,
  programReviewers = [],
  milestoneReviewers = [],
  isLoadingProgramReviewers = false,
  isProgramReviewersError = false,
  isLoadingMilestoneReviewers = false,
  isMilestoneReviewersError = false,
  onReviewerAssignmentChange,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [pendingApplicationId, setPendingApplicationId] = useState<string>("");
  const [pendingApplication, setPendingApplication] = useState<IFundingApplication | undefined>(
    undefined
  );

  // Show all applications (no internal pagination for infinite scroll)
  const paginatedApplications = useMemo(() => applications, [applications]);

  // Determine if reviewer columns should be shown
  const showAppReviewersColumn = useMemo(
    () => programReviewers.length > 0,
    [programReviewers.length]
  );
  const showMilestoneReviewersColumn = useMemo(
    () => milestoneReviewers.length > 0,
    [milestoneReviewers.length]
  );

  const handleStatusChangeClick = useCallback(
    (applicationId: string, newStatus: string, e: React.MouseEvent) => {
      e.stopPropagation();
      // Find the application to pass to modal
      const application = applications.find(
        (app) => app.referenceNumber === applicationId || app.id === applicationId
      );
      setPendingApplicationId(applicationId);
      setPendingStatus(newStatus);
      setPendingApplication(application);
      setStatusModalOpen(true);
    },
    [applications]
  );

  const handleStatusChangeConfirm = async (
    reason?: string,
    approvedAmount?: string,
    approvedCurrency?: string
  ) => {
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
        setIsUpdatingStatus(false);
        setStatusModalOpen(false);
        setPendingStatus("");
        setPendingApplicationId("");
        setPendingApplication(undefined);
        if (pendingStatus === "approved") {
          toast.success("Application approved successfully!");
        } else {
          toast.success(`Application status updated to ${pendingStatus}`);
        }
      } catch (error) {
        console.error("Failed to update status:", error);
        setIsUpdatingStatus(false);
        toast.error("Failed to update application status");
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
            isLoadingProgramReviewers={isLoadingProgramReviewers}
            isProgramReviewersError={isProgramReviewersError}
            isLoadingMilestoneReviewers={isLoadingMilestoneReviewers}
            isMilestoneReviewersError={isMilestoneReviewersError}
            onApplicationSelect={onApplicationSelect}
            onApplicationHover={onApplicationHover}
            onStatusChange={handleStatusChangeClick}
            onReviewerAssignmentChange={onReviewerAssignmentChange}
            isUpdatingStatus={isUpdatingStatus}
          />
        )}
      </div>

      {/* Pagination removed - handled by infinite scroll in parent component */}

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false);
          setPendingStatus("");
          setPendingApplicationId("");
          setPendingApplication(undefined);
        }}
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
