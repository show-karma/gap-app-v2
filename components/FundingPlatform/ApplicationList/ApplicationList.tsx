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
import StatusChangeModal from "../ApplicationView/StatusChangeModal";

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
  under_review: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  revision_requested:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  withdrawn: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const formatStatus = (status: string): string => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [pendingApplicationId, setPendingApplicationId] = useState<string>("");

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

  const handleStatusChangeClick = (
    applicationId: string,
    newStatus: string
  ) => {
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
    <div className="flex flex-col w-full space-y-6 px-4 py-4 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
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

                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    From: {application.applicantEmail}
                  </p>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Submitted: {formatDate(application.createdAt)}
                  </p>


                </div>

                {/* Actions */}
                {showStatusActions &&
                  onStatusChange &&
                  application.status !== "withdrawn" && (
                    <div className="flex flex-wrap gap-2">
                      {/* For pending status: only show Under Review button */}
                      {application.status === "pending" && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChangeClick(application.id, "under_review");
                          }}
                          variant="secondary"
                          className="w-fit px-3 py-1 border bg-transparent text-purple-500 font-medium border-purple-200 dark:border-purple-700 flex flex-row gap-2"
                          disabled={isUpdatingStatus}
                        >
                          Start Review
                        </Button>
                      )}

                      {/* For under_review status: show all action buttons */}
                      {application.status === "under_review" && (
                        <>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChangeClick(
                                application.id,
                                "revision_requested"
                              );
                            }}
                            variant="secondary"
                            className="w-fit px-3 py-1 dark:text-white border bg-transparent border-gray-200 font-medium dark:border-gray-700 flex flex-row gap-2"
                            disabled={isUpdatingStatus}
                          >
                            Request Revision
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChangeClick(application.id, "approved");
                            }}
                            variant="secondary"
                            className="w-fit px-3 py-1 border bg-transparent text-green-500 font-medium border-green-200 dark:border-green-700 flex flex-row gap-2"
                            disabled={isUpdatingStatus}
                          >
                            <CheckIcon className="w-4 h-4" />
                            Approve
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChangeClick(application.id, "rejected");
                            }}
                            variant="secondary"
                            className="w-fit px-3 py-1 border bg-transparent text-red-500 font-medium border-red-200 dark:border-red-700 flex flex-row gap-2"
                            disabled={isUpdatingStatus}
                          >
                            <XMarkIcon className="w-4 h-4" />
                            Reject
                          </Button>
                        </>
                      )}

                      {/* For other statuses: show available actions except current status */}
                      {!["pending", "under_review"].includes(application.status) && (
                        <>
                          {!["revision_requested", "approved", "rejected"].includes(application.status) && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChangeClick(
                                  application.id,
                                  "revision_requested"
                                );
                              }}
                              variant="secondary"
                              className="w-fit px-3 py-1 dark:text-white border bg-transparent border-gray-200 font-medium dark:border-gray-700 flex flex-row gap-2"
                              disabled={isUpdatingStatus}
                            >
                              Request Revision
                            </Button>
                          )}
                          {application.status !== "approved" && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChangeClick(application.id, "approved");
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
                                handleStatusChangeClick(application.id, "rejected");
                              }}
                              variant="secondary"
                              className="w-fit px-3 py-1 border bg-transparent text-red-500 font-medium border-red-200 dark:border-red-700 flex flex-row gap-2"
                              disabled={isUpdatingStatus}
                            >
                              <XMarkIcon className="w-4 h-4" />
                              Reject
                            </Button>
                          )}
                        </>
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
        isReasonRequired={pendingStatus === "revision_requested"}
      />
    </div>
  );
};

export default ApplicationList;
