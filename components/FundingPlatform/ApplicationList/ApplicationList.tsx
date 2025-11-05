"use client";

import { FC, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import {
  IApplicationListProps,
  IFundingApplication,
} from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";
import StatusChangeModal from "../ApplicationView/StatusChangeModal";
import { getProjectTitle } from "../helper/getProjecTitle";
import { formatDate } from "@/utilities/formatDate";
import SortableTableHeader from "@/components/ui/SortableTableHeader";
import { IApplicationFilters } from "@/services/fundingPlatformService";
import { TableStatusActionButtons } from "./TableStatusActionButtons";
import { formatAIScore } from "../helper/getAIScore";

interface IApplicationListComponentProps extends IApplicationListProps {
  applications: IFundingApplication[];
  isLoading?: boolean;
  onStatusChange?: (
    applicationId: string,
    status: string,
    note?: string
  ) => Promise<void>;
  onExport?: () => void;
  showStatusActions?: boolean;
  sortBy?: IApplicationFilters['sortBy'];
  sortOrder?: IApplicationFilters['sortOrder'];
  onSortChange?: (sortBy: string) => void;
}

const statusColors = {
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  under_review: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  revision_requested:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const formatStatus = (status: string): string => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const ApplicationList: FC<IApplicationListComponentProps> = ({
  applications,
  isLoading = false,
  onApplicationSelect,
  onApplicationHover,
  onStatusChange,
  showStatusActions = false,
  sortBy,
  sortOrder,
  onSortChange,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [pendingApplicationId, setPendingApplicationId] = useState<string>("");

  // Show all applications (no internal pagination for infinite scroll)
  const paginatedApplications = applications;

  const handleStatusChangeClick = (
    applicationId: string,
    newStatus: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setPendingApplicationId(applicationId);
    setPendingStatus(newStatus);
    setStatusModalOpen(true);
  };

  const handleStatusChangeConfirm = async (reason?: string) => {
    if (onStatusChange && pendingApplicationId && pendingStatus) {
      try {
        setIsUpdatingStatus(true);
        await onStatusChange(pendingApplicationId, pendingStatus, reason);
        setIsUpdatingStatus(false);
        setStatusModalOpen(false);
        setPendingStatus("");
        setPendingApplicationId("");
      } catch (error) {
        console.error("Failed to update status:", error);
        setIsUpdatingStatus(false);
      }
    }
  };

  const getStatusBadge = (status: string) => (
    <span
      className={cn(
        "inline-flex px-2 py-1 rounded-full text-xs font-medium",
        statusColors[status as keyof typeof statusColors] ||
        "bg-gray-100 text-gray-800"
      )}
    >
      {formatStatus(status)}
    </span>
  );

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
                <SortableTableHeader
                  label="AI Score"
                  sortKey="aiEvaluationScore"
                  currentSortKey={sortBy}
                  currentSortDirection={sortOrder}
                  onSort={onSortChange}
                />
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
                {showStatusActions && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedApplications.map((application) => (
                <tr
                  key={application.referenceNumber}
                  className="hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                  onClick={(e) => {
                    // Open in new tab for application details
                    if (onApplicationSelect) {
                      e.preventDefault();
                      const currentPath = window.location.pathname;
                      const newPath = `${currentPath}/${application.referenceNumber}`;
                      window.open(newPath, '_blank');
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
                  <td className="px-4 py-4 whitespace-nowrap">
                    {getStatusBadge(application.status)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-center">
                    <span className="font-medium">
                      {formatAIScore(application)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(application.createdAt)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(application.updatedAt)}
                  </td>
                  {showStatusActions && onStatusChange && (
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <TableStatusActionButtons
                        applicationId={application.referenceNumber}
                        currentStatus={application.status as any}
                        onStatusChange={handleStatusChangeClick}
                        isUpdating={isUpdatingStatus}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
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
        }}
        onConfirm={handleStatusChangeConfirm}
        status={pendingStatus}
        isSubmitting={isUpdatingStatus}
      />
    </div>
  );
};

export default ApplicationList;