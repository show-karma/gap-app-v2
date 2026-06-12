"use client";

import { ClipboardDocumentCheckIcon } from "@heroicons/react/24/solid";
import React, { type FC, useState } from "react";
import { KycStatusBadge } from "@/components/KycStatusIcon";
import { Spinner } from "@/components/Utilities/Spinner";
import { ReviewerType } from "@/hooks/useReviewerAssignment";
import type { MilestoneReviewer } from "@/services/milestone-reviewers.service";
import type { ProgramReviewer } from "@/services/program-reviewers.service";
import type { FundingApplicationStatusV2, IFundingApplication } from "@/types/funding-platform";
import type { KycStatusResponse } from "@/types/kyc";
import { formatDate } from "@/utilities/formatDate";
import { formatAIScore } from "../helper/getAIScore";
import { formatInternalAIScore } from "../helper/getInternalAIScore";
import { AIEvaluationModal, type EvaluationType } from "./AIEvaluationModal";
import { ApplicationStatusBadge } from "./applicationStatusBadge";
import { ReviewerAssignmentDropdown } from "./ReviewerAssignmentDropdown";
import { TableStatusActionButtons } from "./TableStatusActionButtons";

interface ApplicationTableRowProps {
  programId: string;
  communityUID?: string;
  application: IFundingApplication;
  showAIScoreColumn: boolean;
  showInternalAIScoreColumn: boolean;
  showAppReviewersColumn: boolean;
  showMilestoneReviewersColumn: boolean;
  showStatusActions: boolean;
  programReviewers: ProgramReviewer[];
  milestoneReviewers: MilestoneReviewer[];
  onAddProgramReviewer: (data: { name: string; email: string; telegram?: string }) => Promise<{
    name: string;
    email: string;
    publicAddress?: string;
  }>;
  isAddingProgramReviewer?: boolean;
  onAddMilestoneReviewer: (data: {
    name: string;
    email: string;
    telegram?: string;
  }) => Promise<{ name: string; email: string; publicAddress?: string }>;
  isAddingMilestoneReviewer?: boolean;
  onApplicationSelect?: (application: IFundingApplication) => void;
  onApplicationHover?: (applicationId: string) => void;
  onStatusChange?: (applicationId: string, status: string, e: React.MouseEvent) => void;
  onReviewerAssignmentChange?: () => void;
  isUpdatingStatus?: boolean;
  isKycEnabled?: boolean;
  kycStatus?: KycStatusResponse | null;
  isLoadingKycStatus?: boolean;
}

const ApplicationTableRowComponent: FC<ApplicationTableRowProps> = ({
  programId,
  communityUID,
  application,
  showAIScoreColumn,
  showInternalAIScoreColumn,
  showAppReviewersColumn,
  showMilestoneReviewersColumn,
  showStatusActions,
  programReviewers,
  milestoneReviewers,
  onAddProgramReviewer,
  isAddingProgramReviewer = false,
  onAddMilestoneReviewer,
  isAddingMilestoneReviewer = false,
  onApplicationSelect,
  onApplicationHover,
  onStatusChange,
  onReviewerAssignmentChange,
  isUpdatingStatus = false,
  isKycEnabled = false,
  kycStatus = null,
  isLoadingKycStatus = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [evaluationType, setEvaluationType] = useState<EvaluationType>("external");

  const projectDisplayName = application.resolvedProjectName || application.referenceNumber;

  const handleAIScoreClick = (e: React.MouseEvent, type: EvaluationType) => {
    e.stopPropagation();
    setEvaluationType(type);
    setIsModalOpen(true);
  };

  const getEvaluationData = () => {
    if (evaluationType === "external") {
      return application.aiEvaluation?.evaluation ?? null;
    }
    return application.internalAIEvaluation?.evaluation ?? null;
  };

  return (
    <>
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
        <td className="p-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
          {application.referenceNumber}
        </td>
        <td className="p-4 text-sm text-gray-900 dark:text-white">
          <div className="max-w-xs truncate" title={projectDisplayName}>
            {projectDisplayName}
          </div>
        </td>
        <td className="p-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
          {application.applicantEmail}
        </td>
        <td className="p-4 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <ApplicationStatusBadge status={application.status} />
            {application.status === "approved" && application.postApprovalCompleted && (
              <span
                title="Post-approval form completed"
                className="inline-flex items-center text-emerald-600 dark:text-emerald-400"
              >
                <ClipboardDocumentCheckIcon className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
          </div>
        </td>
        {isKycEnabled && (
          <td className="p-4 whitespace-nowrap">
            {isLoadingKycStatus ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <KycStatusBadge status={kycStatus ?? null} showValidityInLabel={false} />
            )}
          </td>
        )}
        {showAIScoreColumn && (
          <td className="p-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-center">
            {application.aiEvaluation?.evaluation ? (
              <button
                type="button"
                onClick={(e) => handleAIScoreClick(e, "external")}
                className="font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded"
              >
                {formatAIScore(application)}
              </button>
            ) : (
              <span className="font-medium">{formatAIScore(application)}</span>
            )}
          </td>
        )}
        {showInternalAIScoreColumn && (
          <td className="p-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-center">
            {application.internalAIEvaluation?.evaluation ? (
              <button
                type="button"
                onClick={(e) => handleAIScoreClick(e, "internal")}
                className="font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded"
              >
                {formatInternalAIScore(application)}
              </button>
            ) : (
              <span className="font-medium">{formatInternalAIScore(application)}</span>
            )}
          </td>
        )}
        <td className="p-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
          {formatDate(application.createdAt)}
        </td>
        <td className="p-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
          {formatDate(application.updatedAt)}
        </td>
        {showAppReviewersColumn && (
          <td className="p-4 text-sm">
            {/* biome-ignore lint/a11y/noStaticElementInteractions: This div only stops event propagation, interactivity is handled by the dropdown */}
            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <ReviewerAssignmentDropdown
                programId={programId}
                communityUID={communityUID}
                applicationId={application.referenceNumber}
                availableReviewers={programReviewers}
                assignedReviewerAddresses={application.appReviewers || []}
                reviewerType={ReviewerType.APP}
                onAssignmentChange={onReviewerAssignmentChange}
                onAddReviewer={onAddProgramReviewer}
                isAddingReviewer={isAddingProgramReviewer}
              />
            </div>
          </td>
        )}
        {showMilestoneReviewersColumn && (
          <td className="p-4 text-sm">
            {/* biome-ignore lint/a11y/noStaticElementInteractions: This div only stops event propagation, interactivity is handled by the dropdown */}
            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <ReviewerAssignmentDropdown
                programId={programId}
                communityUID={communityUID}
                applicationId={application.referenceNumber}
                availableReviewers={milestoneReviewers}
                assignedReviewerAddresses={application.milestoneReviewers || []}
                reviewerType={ReviewerType.MILESTONE}
                onAssignmentChange={onReviewerAssignmentChange}
                onAddReviewer={onAddMilestoneReviewer}
                isAddingReviewer={isAddingMilestoneReviewer}
              />
            </div>
          </td>
        )}
        {showStatusActions && onStatusChange && (
          <td className="p-4 whitespace-nowrap text-sm">
            <TableStatusActionButtons
              applicationId={application.referenceNumber}
              currentStatus={application.status as FundingApplicationStatusV2}
              onStatusChange={onStatusChange}
              isUpdating={isUpdatingStatus}
            />
          </td>
        )}
      </tr>
      <AIEvaluationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        evaluationType={evaluationType}
        evaluation={getEvaluationData()}
        projectTitle={projectDisplayName}
      />
    </>
  );
};

export const ApplicationTableRow = React.memo(ApplicationTableRowComponent);
ApplicationTableRow.displayName = "ApplicationTableRow";
