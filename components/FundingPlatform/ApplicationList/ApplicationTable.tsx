"use client";

import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import React, { type FC } from "react";
import SortableTableHeader from "@/components/Utilities/SortableTableHeader";
import type { IApplicationFilters } from "@/services/fundingPlatformService";
import type { MilestoneReviewer } from "@/services/milestone-reviewers.service";
import type { ProgramReviewer } from "@/services/program-reviewers.service";
import type { IFundingApplication } from "@/types/funding-platform";
import { ApplicationTableRow } from "./ApplicationTableRow";

interface ApplicationTableProps {
  applications: IFundingApplication[];
  sortBy?: IApplicationFilters["sortBy"];
  sortOrder?: IApplicationFilters["sortOrder"];
  onSortChange?: (sortBy: string) => void;
  showAIScoreColumn: boolean;
  showInternalAIScoreColumn: boolean;
  showAppReviewersColumn: boolean;
  showMilestoneReviewersColumn: boolean;
  showStatusActions: boolean;
  programReviewers: ProgramReviewer[];
  milestoneReviewers: MilestoneReviewer[];
  isLoadingProgramReviewers: boolean;
  isProgramReviewersError: boolean;
  isLoadingMilestoneReviewers: boolean;
  isMilestoneReviewersError: boolean;
  onApplicationSelect?: (application: IFundingApplication) => void;
  onApplicationHover?: (applicationId: string) => void;
  onStatusChange?: (applicationId: string, status: string, e: React.MouseEvent) => void;
  onReviewerAssignmentChange?: () => void;
  isUpdatingStatus?: boolean;
}

const ApplicationTableComponent: FC<ApplicationTableProps> = ({
  applications,
  sortBy,
  sortOrder,
  onSortChange,
  showAIScoreColumn,
  showInternalAIScoreColumn,
  showAppReviewersColumn,
  showMilestoneReviewersColumn,
  showStatusActions,
  programReviewers,
  milestoneReviewers,
  isLoadingProgramReviewers,
  isProgramReviewersError,
  isLoadingMilestoneReviewers,
  isMilestoneReviewersError,
  onApplicationSelect,
  onApplicationHover,
  onStatusChange,
  onReviewerAssignmentChange,
  isUpdatingStatus = false,
}) => {
  return (
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead className="bg-gray-50 dark:bg-zinc-900">
        <tr>
          <SortableTableHeader
            label="Application ID"
            sortKey="referenceNumber"
            currentSortKey={sortBy}
            currentSortDirection={sortOrder}
            onSort={onSortChange}
          />
          <SortableTableHeader
            label="Project Title"
            sortKey="projectTitle"
            currentSortKey={sortBy}
            currentSortDirection={sortOrder}
            onSort={onSortChange}
          />
          <SortableTableHeader
            label="Applicant Email"
            sortKey="applicantEmail"
            currentSortKey={sortBy}
            currentSortDirection={sortOrder}
            onSort={onSortChange}
          />
          <SortableTableHeader
            label="Status"
            sortKey="status"
            currentSortKey={sortBy}
            currentSortDirection={sortOrder}
            onSort={onSortChange}
          />
          {showAIScoreColumn && (
            <SortableTableHeader
              label="AI Score"
              sortKey="aiEvaluationScore"
              currentSortKey={sortBy}
              currentSortDirection={sortOrder}
              onSort={onSortChange}
            />
          )}
          {showInternalAIScoreColumn && (
            <SortableTableHeader
              label="Internal AI Score"
              sortKey="internalAIEvaluationScore"
              currentSortKey={sortBy}
              currentSortDirection={sortOrder}
              onSort={onSortChange}
            />
          )}
          <SortableTableHeader
            label="Created Date"
            sortKey="createdAt"
            currentSortKey={sortBy}
            currentSortDirection={sortOrder}
            onSort={onSortChange}
          />
          <SortableTableHeader
            label="Last Update"
            sortKey="updatedAt"
            currentSortKey={sortBy}
            currentSortDirection={sortOrder}
            onSort={onSortChange}
          />
          {showAppReviewersColumn && (
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              aria-label="Application Reviewers"
            >
              <div className="flex items-center gap-2">
                <span>App Reviewers</span>
                {isLoadingProgramReviewers && (
                  <span className="inline-block" aria-hidden="true">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  </span>
                )}
                {isProgramReviewersError && (
                  <ExclamationCircleIcon
                    className="h-4 w-4 text-yellow-500"
                    title="Failed to load reviewers. The column may not display correctly."
                    aria-label="Error loading reviewers"
                  />
                )}
              </div>
            </th>
          )}
          {showMilestoneReviewersColumn && (
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              aria-label="Milestone Reviewers"
            >
              <div className="flex items-center gap-2">
                <span>Milestone Reviewers</span>
                {isLoadingMilestoneReviewers && (
                  <span className="inline-block" aria-hidden="true">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  </span>
                )}
                {isMilestoneReviewersError && (
                  <ExclamationCircleIcon
                    className="h-4 w-4 text-yellow-500"
                    title="Failed to load reviewers. The column may not display correctly."
                    aria-label="Error loading reviewers"
                  />
                )}
              </div>
            </th>
          )}
          {showStatusActions && (
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          )}
        </tr>
      </thead>
      <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
        {applications.map((application) => (
          <ApplicationTableRow
            key={application.referenceNumber}
            application={application}
            showAIScoreColumn={showAIScoreColumn}
            showInternalAIScoreColumn={showInternalAIScoreColumn}
            showAppReviewersColumn={showAppReviewersColumn}
            showMilestoneReviewersColumn={showMilestoneReviewersColumn}
            showStatusActions={showStatusActions}
            programReviewers={programReviewers}
            milestoneReviewers={milestoneReviewers}
            onApplicationSelect={onApplicationSelect}
            onApplicationHover={onApplicationHover}
            onStatusChange={onStatusChange}
            onReviewerAssignmentChange={onReviewerAssignmentChange}
            isUpdatingStatus={isUpdatingStatus}
          />
        ))}
      </tbody>
    </table>
  );
};

export const ApplicationTable = React.memo(ApplicationTableComponent);
ApplicationTable.displayName = "ApplicationTable";
