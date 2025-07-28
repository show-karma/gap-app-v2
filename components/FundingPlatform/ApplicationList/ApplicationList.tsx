"use client";

import { FC, useState, useEffect, useMemo } from "react";
import { Button } from "@/components/Utilities/Button";
import {
  IApplicationListProps,
  IFundingApplication,
} from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";
import { format, isValid, parseISO } from "date-fns";
import { ArrowDownTrayIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { CheckIcon } from "@heroicons/react/24/outline";

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
}

const statusColors = {
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  revision_requested:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  withdrawn: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const formatStatus = (status: string): string => {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Safely format a date string, handling invalid dates gracefully
 */
const formatDate = (
  dateString: string | Date | undefined | null,
  formatString: string = "MMM dd, yyyy HH:mm"
): string => {
  try {
    // Handle null/undefined cases
    if (!dateString) {
      return "No date";
    }

    let date: Date;

    if (typeof dateString === "string") {
      // Try parsing as ISO string first
      date = parseISO(dateString);

      // If that fails, try regular Date constructor
      if (!isValid(date)) {
        date = new Date(dateString);
      }
    } else {
      date = dateString;
    }

    // Check if the date is valid
    if (!isValid(date)) {
      return "Invalid date";
    }

    return format(date, formatString);
  } catch (error) {
    return "Invalid date";
  }
};

const ApplicationList: FC<IApplicationListComponentProps> = ({
  programId,
  chainID,
  applications,
  isLoading = false,
  onApplicationSelect,
  onStatusChange,
  showStatusActions = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Filter and sort applications
  const filteredAndSortedApplications = useMemo(() => {
    let filtered = applications;

    return filtered;
  }, [applications]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedApplications.length / pageSize);
  const paginatedApplications = filteredAndSortedApplications.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleStatusChange = async (
    applicationId: string,
    newStatus: string
  ) => {
    if (onStatusChange) {
      try {
        setIsUpdatingStatus(true);
        await onStatusChange(applicationId, newStatus);
        setIsUpdatingStatus(false);
      } catch (error) {
        console.error("Failed to update status:", error);
        setIsUpdatingStatus(false);
      }
    }
  };

  const getStatusBadge = (status: string) => (
    <span
      className={cn(
        "px-2 py-1 rounded-full text-xs font-medium",
        statusColors[status as keyof typeof statusColors] ||
          "bg-gray-100 text-gray-800"
      )}
    >
      {formatStatus(status)}
    </span>
  );

  const getRatingBadge = (rating?: number) => {
    if (!rating) return null;

    const color =
      rating >= 8
        ? "bg-green-100 text-green-800"
        : rating >= 6
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";

    return (
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", color)}>
        {rating}/10
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading applications...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full space-y-6 px-4 py-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Funding Applications
          </h2>
        </div>

        <div className="flex flex-row gap-4 items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {filteredAndSortedApplications.length} application(s) found
          </p>
        </div>
      </div> */}

      {/* Filters */}
      {/* <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by reference number, address, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="revision_requested">Revision Requested</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="withdrawn">Withdrawn</option>
        </select>

        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split("-");
            setSortBy(field as "date" | "status" | "rating");
            setSortOrder(order as "asc" | "desc");
          }}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
        >
          <option value="date-desc">Latest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="status-asc">Status A-Z</option>
          <option value="status-desc">Status Z-A</option>
          <option value="rating-desc">Highest Rating</option>
          <option value="rating-asc">Lowest Rating</option>
        </select>
      </div> */}

      {/* Applications List */}
      {paginatedApplications.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            {applications.length === 0
              ? "No applications found."
              : "No applications match your filters."}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedApplications.map((application) => (
            <div
              key={application.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onApplicationSelect?.(application)}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                {/* Application Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {application.referenceNumber}
                    </h3>
                    {getStatusBadge(application.status)}
                    {getRatingBadge(
                      application.aiEvaluation?.systemEvaluation?.rating ||
                        application.aiEvaluation?.detailedEvaluation?.rating
                    )}
                    
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    From: {application.applicantEmail}
                  </p>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Submitted: {formatDate(application.createdAt)}
                  </p>

                  {(application.aiEvaluation?.systemEvaluation?.reasoning ||
                    application.aiEvaluation?.detailedEvaluation
                      ?.reasoning) && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      AI Summary:{" "}
                      {application.aiEvaluation?.systemEvaluation?.reasoning ||
                        application.aiEvaluation?.detailedEvaluation?.reasoning}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {showStatusActions && onStatusChange && application.status !== "withdrawn" && (
                  <div className="flex flex-wrap gap-2">
                    {application.status !== "revision_requested" && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(application.id, "revision_requested");
                        }}
                        variant="secondary"
                        className="w-fit px-3 py-1 border bg-transparent border-gray-200 font-medium dark:border-gray-700 flex flex-row gap-2"
                        disabled={isUpdatingStatus}
                      >
                        Request Revision
                      </Button>
                    )}
                    {application.status !== "approved" && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(application.id, "approved");
                        }}
                        variant="secondary"
                        className="w-fit px-3 py-1 border bg-transparent text-green-500 font-medium border-green-200 dark:border-green-700 flex flex-row gap-2"
                        disabled={isUpdatingStatus}
                      >
                        <CheckIcon className="w-4 h-4" />
                        Approve
                      </Button>
                    )}
                    {application.status !== "rejected" && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(application.id, "rejected");
                        }}
                        variant="secondary"
                        className="w-fit px-3 py-1 border bg-transparent text-red-500 font-medium border-red-200 dark:border-red-700 flex flex-row gap-2"
                        disabled={isUpdatingStatus}
                      >
                        <XMarkIcon className="w-4 h-4" />
                        Reject
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(
              currentPage * pageSize,
              filteredAndSortedApplications.length
            )}{" "}
            of {filteredAndSortedApplications.length} applications
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              variant="secondary"
              className="text-xs px-3 py-1"
            >
              Previous
            </Button>

            <span className="flex items-center px-3 py-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              variant="secondary"
              className="text-xs px-3 py-1"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationList;
