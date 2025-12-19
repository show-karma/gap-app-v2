"use client";

import React, { type FC } from "react";
import { ReviewerType } from "@/hooks/useReviewerAssignment";
import type { MilestoneReviewer } from "@/services/milestone-reviewers.service";
import type { ProgramReviewer } from "@/services/program-reviewers.service";
import type { FundingApplicationStatusV2, IFundingApplication } from "@/types/funding-platform";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import { formatAIScore } from "../helper/getAIScore";
import { formatInternalAIScore } from "../helper/getInternalAIScore";
import { getProjectTitle } from "../helper/getProjecTitle";
import { ReviewerAssignmentDropdown } from "./ReviewerAssignmentDropdown";
import { TableStatusActionButtons } from "./TableStatusActionButtons";

const statusColors = {
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  resubmitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  under_review: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  revision_requested: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const formatStatus = (status: string): string => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface ApplicationTableRowProps {
  application: IFundingApplication;
  showAIScoreColumn: boolean;
  showInternalAIScoreColumn: boolean;
  showAppReviewersColumn: boolean;
  showMilestoneReviewersColumn: boolean;
  showStatusActions: boolean;
  programReviewers: ProgramReviewer[];
  milestoneReviewers: MilestoneReviewer[];
  onApplicationSelect?: (application: IFundingApplication) => void;
  onApplicationHover?: (applicationId: string) => void;
  onStatusChange?: (applicationId: string, status: string, e: React.MouseEvent) => void;
  onReviewerAssignmentChange?: () => void;
  isUpdatingStatus?: boolean;
}

const getStatusBadge = (status: string) => (
  <span
    className={cn(
      "inline-flex px-2 py-1 rounded-full text-xs font-medium",
      statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
    )}
  >
    {formatStatus(status)}
  </span>
);

const ApplicationTableRowComponent: FC<ApplicationTableRowProps> = ({
  application,
  showAIScoreColumn,
  showInternalAIScoreColumn,
  showAppReviewersColumn,
  showMilestoneReviewersColumn,
  showStatusActions,
  programReviewers,
  milestoneReviewers,
  onApplicationSelect,
  onApplicationHover,
  onStatusChange,
  onReviewerAssignmentChange,
  isUpdatingStatus = false,
}) => {
  return (
    <tr
      key={application.referenceNumber}
      className="hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
      onClick={(e) => {
        // Open in new tab for application details
        if (onApplicationSelect) {
          e.preventDefault();
          const currentPath = window.location.pathname;
          const newPath = `${currentPath}/${application.referenceNumber}`;
          window.open(newPath, "_blank");
          onApplicationSelect(application);
        }
      }}
      onMouseEnter={() => onApplicationHover?.(application.referenceNumber)}
    >
      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
        {application.referenceNumber}
      </td>
      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
        <div className="max-w-xs truncate" title={getProjectTitle(application)}>
          {getProjectTitle(application)}
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {application.applicantEmail}
      </td>
      <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(application.status)}</td>
      {showAIScoreColumn && (
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-center">
          <span className="font-medium">{formatAIScore(application)}</span>
        </td>
      )}
      {showInternalAIScoreColumn && (
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-center">
          <span className="font-medium">{formatInternalAIScore(application)}</span>
        </td>
      )}
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {formatDate(application.createdAt)}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {formatDate(application.updatedAt)}
      </td>
      {showAppReviewersColumn && (
        <td className="px-4 py-4 text-sm">
          {/* biome-ignore lint/a11y/noStaticElementInteractions: This div only stops event propagation, interactivity is handled by the dropdown */}
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <ReviewerAssignmentDropdown
              applicationId={application.referenceNumber}
              availableReviewers={programReviewers}
              assignedReviewerAddresses={application.appReviewers || []}
              reviewerType={ReviewerType.APP}
              onAssignmentChange={onReviewerAssignmentChange}
            />
          </div>
        </td>
      )}
      {showMilestoneReviewersColumn && (
        <td className="px-4 py-4 text-sm">
          {/* biome-ignore lint/a11y/noStaticElementInteractions: This div only stops event propagation, interactivity is handled by the dropdown */}
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <ReviewerAssignmentDropdown
              applicationId={application.referenceNumber}
              availableReviewers={milestoneReviewers}
              assignedReviewerAddresses={application.milestoneReviewers || []}
              reviewerType={ReviewerType.MILESTONE}
              onAssignmentChange={onReviewerAssignmentChange}
            />
          </div>
        </td>
      )}
      {showStatusActions && onStatusChange && (
        <td className="px-4 py-4 whitespace-nowrap text-sm">
          <TableStatusActionButtons
            applicationId={application.referenceNumber}
            currentStatus={application.status as FundingApplicationStatusV2}
            onStatusChange={onStatusChange}
            isUpdating={isUpdatingStatus}
          />
        </td>
      )}
    </tr>
  );
};

export const ApplicationTableRow = React.memo(ApplicationTableRowComponent);
ApplicationTableRow.displayName = "ApplicationTableRow";
