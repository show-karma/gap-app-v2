"use client";

import { FC, Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { IFundingApplication } from "@/types/funding-platform";
import { Button } from "@/components/Utilities/Button";
import { cn } from "@/utilities/tailwind";
import StatusHistoryTimeline from "./StatusHistoryTimeline";
import StatusChangeModal from "./StatusChangeModal";
import CommentsTimeline from "./CommentsTimeline";
import fundingPlatformService from "@/services/fundingPlatformService";
import { Spinner } from "@/components/Utilities/Spinner";
import { formatDate } from "@/utilities/formatDate";

interface ApplicationDetailSidesheetProps {
  application: IFundingApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (
    applicationId: string,
    status: string,
    note?: string
  ) => void;
  showStatusActions?: boolean;
}

const statusColors = {
  pending: "bg-blue-100 text-blue-800 border-blue-200",
  under_review: "bg-purple-100 text-purple-800 border-purple-200",
  revision_requested: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  withdrawn: "bg-zinc-100 text-gray-800 border-gray-200",
};

const statusIcons = {
  pending: ClockIcon,
  under_review: ClockIcon,
  revision_requested: ExclamationTriangleIcon,
  approved: CheckCircleIcon,
  rejected: XMarkIcon,
  withdrawn: XMarkIcon,
};

const formatStatus = (status: string): string => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};


const ApplicationDetailSidesheet: FC<ApplicationDetailSidesheetProps> = ({
  application: initialApplication,
  isOpen,
  onClose,
  onStatusChange,
  showStatusActions = false,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [application, setApplication] = useState<IFundingApplication | null>(initialApplication);
  const [isLoadingApplication, setIsLoadingApplication] = useState(false);

  // Fetch fresh application data with retry logic
  const fetchApplicationData = async (applicationId: string, expectedStatus?: string, retries = 3) => {
    try {
      setIsLoadingApplication(true);
      const freshData = await fundingPlatformService.applications.getApplication(applicationId);

      // If we're expecting a specific status and it doesn't match, retry
      if (expectedStatus && freshData.status !== expectedStatus && retries > 0) {
        setTimeout(() => {
          fetchApplicationData(applicationId, expectedStatus, retries - 1);
        }, 1000);
        return;
      }

      setApplication(freshData);
      setIsLoadingApplication(false);
    } catch (error) {
      console.error("Failed to fetch application data:", error);
      setIsLoadingApplication(false);
    }
  };

  // Update application when prop changes (new application selected)
  useEffect(() => {
    if (initialApplication) {
      setApplication(initialApplication);
    }
  }, [initialApplication]);

  if (!application) return null;

  const StatusIcon =
    statusIcons[application.status as keyof typeof statusIcons] || ClockIcon;

  const handleStatusChangeClick = (newStatus: string) => {
    setPendingStatus(newStatus);
    setStatusModalOpen(true);
  };

  const handleStatusChangeConfirm = async (reason?: string) => {
    if (onStatusChange && pendingStatus) {
      try {
        setIsUpdatingStatus(true);

        // Optimistically update the status immediately for better UX
        const newStatusEntry = {
          status: pendingStatus as any,
          timestamp: new Date().toISOString(),
          reason: reason
        };

        setApplication(prev => prev ? {
          ...prev,
          status: pendingStatus as any,
          statusHistory: [...(prev.statusHistory || []), newStatusEntry]
        } : null);

        await onStatusChange(application.id, pendingStatus, reason);

        // Close modal
        setStatusModalOpen(false);

        // Store the expected status for verification
        const expectedStatus = pendingStatus;
        setPendingStatus("");

        // Add a small delay then fetch with retry logic to get server-accurate data
        setTimeout(async () => {
          // Fetch fresh data after status update, with expected status for verification
          await fetchApplicationData(application.id, expectedStatus);
          setIsUpdatingStatus(false);
        }, 1000); // 1 second initial delay

      } catch (error) {
        console.error("Failed to update status:", error);
        setIsUpdatingStatus(false);
        // Revert optimistic update on error
        fetchApplicationData(application.id);
      }
    }
  };

  const getCurrentRevisionReason = () => {
    if (
      application.status === "revision_requested" &&
      application.statusHistory
    ) {
      const revisionEntry = application.statusHistory
        .filter((h) => h.status === "revision_requested")
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];
      return revisionEntry?.reason;
    }
    return null;
  };

  const renderApplicationData = () => {
    if (
      !application.applicationData ||
      Object.keys(application.applicationData).length === 0
    ) {
      return <p className="text-gray-500 dark:text-gray-400">No application data available</p>;
    }

    return (
      <div className="space-y-4">
        {Object.entries(application.applicationData).map(([key, value]) => (
          <div key={key} className="border-b border-gray-100 dark:border-gray-700 pb-3">
            <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {key.replace(/^field_\d+/, "Field").replace(/_/g, " ")}
            </dt>
            <dd className="text-sm text-gray-900 dark:text-gray-100">
              {Array.isArray(value) ? (
                // Check if array contains milestone objects
                value.length > 0 && typeof value[0] === "object" && "title" in value[0] ? (
                  <div className="space-y-2">
                    {value.map((milestone: any, index) => (
                      <div key={index} className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <h5 className="font-medium text-gray-900 dark:text-gray-100">
                              {milestone.title}
                            </h5>
                            {milestone.dueDate && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                Due: {formatDate(new Date(milestone.dueDate))}
                              </span>
                            )}
                          </div>
                          {milestone.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {milestone.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Regular array items
                  <div className="flex flex-wrap gap-1">
                    {value.map((item, index) => (
                      <span
                        key={index}
                        className="inline-block bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs"
                      >
                        {String(item)}
                      </span>
                    ))}
                  </div>
                )
              ) : typeof value === "boolean" ? (
                <span>{value ? "Yes" : "No"}</span>
              ) : typeof value === "object" && value !== null ? (
                <pre className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded text-xs overflow-x-auto">
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                <span>{String(value)}</span>
              )}
            </dd>
          </div>
        ))}
      </div>
    );
  };

  const renderAIEvaluation = () => {
    if (!application.aiEvaluation?.evaluation) {
      return (
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
          <ClockIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">AI evaluation pending</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            The application will be automatically evaluated by AI shortly after
            submission.
          </p>
        </div>
      );
    }

    // Parse the AI evaluation data
    const parseEvaluation = (evaluationStr: string) => {
      try {
        return JSON.parse(evaluationStr);
      } catch (error) {
        console.error("Failed to parse evaluation JSON:", error);
        return null;
      }
    };

    const parsedEvaluation = parseEvaluation(application.aiEvaluation.evaluation);

    if (!parsedEvaluation) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to parse evaluation data. Please try again.
          </p>
        </div>
      );
    }

    const getScoreProgressColor = (score: number) => {
      if (score >= 8) return "bg-green-500";
      if (score >= 6) return "bg-yellow-500";
      if (score >= 4) return "bg-blue-500";
      return "bg-red-500";
    };

    const getStatusBadgeClasses = (status: string | undefined) => {
      if (!status) return "bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200";

      switch (status.toLowerCase()) {
        case "complete":
          return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
        case "incomplete":
          return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300";
        case "rejected":
          return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
        default:
          return "bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200";
      }
    };

    const getPriorityBadgeClasses = (priority: string | undefined) => {
      if (!priority) return "bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200";

      switch (priority.toLowerCase()) {
        case "high":
          return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
        case "medium":
          return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300";
        case "low":
          return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
        default:
          return "bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200";
      }
    };

    const getScoreIcon = (score: number) => {
      if (score >= 8) return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      if (score >= 4) return <ExclamationTriangleIcon className="w-5 h-5 text-blue-500" />;
      return <XMarkIcon className="w-5 h-5 text-red-500" />;
    };

    return (
      <div className="space-y-4">
        {/* Score and Status Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getScoreIcon(parsedEvaluation.final_score || 0)}
              <span className="font-semibold text-gray-900 dark:text-white">
                Score: {parsedEvaluation.final_score || 0}/10
              </span>
            </div>
            {parsedEvaluation.evaluation_status && (
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium",
                  getStatusBadgeClasses(parsedEvaluation.evaluation_status)
                )}
              >
                {parsedEvaluation.evaluation_status.charAt(0).toUpperCase() +
                  parsedEvaluation.evaluation_status.slice(1)}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                getScoreProgressColor(parsedEvaluation.final_score || 0)
              )}
              style={{ width: `${(parsedEvaluation.final_score || 0) * 10}%` }}
            />
          </div>
        </div>

        {/* Disqualification Reason */}
        {parsedEvaluation.disqualification_reason && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <h4 className="text-sm font-semibold mb-2 text-red-700 dark:text-red-300">
              Disqualification Reason
            </h4>
            <p className="text-sm text-red-600 dark:text-red-400">
              {parsedEvaluation.disqualification_reason}
            </p>
          </div>
        )}

        {/* Evaluation Summary */}
        {parsedEvaluation.evaluation_summary && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Evaluation Summary
            </h4>

            {/* Strengths */}
            {parsedEvaluation.evaluation_summary.strengths?.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 uppercase tracking-wider">
                  Strengths
                </h5>
                <ul className="space-y-1.5">
                  {parsedEvaluation.evaluation_summary.strengths.map(
                    (strength: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{strength}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            {/* Concerns */}
            {parsedEvaluation.evaluation_summary.concerns?.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-2 uppercase tracking-wider">
                  Concerns
                </h5>
                <ul className="space-y-1.5">
                  {parsedEvaluation.evaluation_summary.concerns.map(
                    (concern: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{concern}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            {/* Risk Factors */}
            {parsedEvaluation.evaluation_summary.risk_factors?.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 uppercase tracking-wider">
                  Risk Factors
                </h5>
                <ul className="space-y-1.5">
                  {parsedEvaluation.evaluation_summary.risk_factors.map(
                    (risk: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <XMarkIcon className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{risk}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Improvement Recommendations */}
        {parsedEvaluation.improvement_recommendations?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Improvement Recommendations
            </h4>
            <div className="space-y-3">
              {parsedEvaluation.improvement_recommendations.map(
                (rec: any, index: number) => (
                  <div
                    key={index}
                    className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                  >
                    {rec.priority && (
                      <div className="mb-2">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
                            getPriorityBadgeClasses(rec.priority)
                          )}
                        >
                          {rec.priority.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {rec.recommendation}
                    </p>
                    {rec.impact && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <strong>Impact:</strong> {rec.impact}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Additional Notes */}
        {parsedEvaluation.additional_notes && (
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Additional Notes
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {parsedEvaluation.additional_notes}
            </p>
          </div>
        )}

        {/* Metadata */}
        {parsedEvaluation.reviewer_confidence && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Reviewer Confidence:{" "}
              <span className="font-medium">
                {parsedEvaluation.reviewer_confidence.charAt(0).toUpperCase() +
                  parsedEvaluation.reviewer_confidence.slice(1)}
              </span>
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-500"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-500"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-zinc-500 dark:bg-zinc-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-500 sm:duration-700"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-500 sm:duration-700"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto relative w-screen max-w-2xl">
                    <Transition.Child
                      as={Fragment}
                      enter="ease-in-out duration-500"
                      enterFrom="opacity-0"
                      enterTo="opacity-100"
                      leave="ease-in-out duration-500"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <div className="absolute left-0 top-0 -ml-8 flex pr-2 pt-4 sm:-ml-10 sm:pr-4">
                        <button
                          type="button"
                          className="relative rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                          onClick={onClose}
                        >
                          <span className="absolute -inset-2.5" />
                          <span className="sr-only">Close panel</span>
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                    </Transition.Child>

                    <div className="flex h-full flex-col overflow-y-scroll bg-white dark:bg-zinc-900 shadow-xl">
                      {/* Header */}
                      <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-6 sm:px-6">
                        <div className="flex items-start justify-between space-x-3">
                          <div className="space-y-1">
                            <Dialog.Title className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                              Application Details
                            </Dialog.Title>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {application.referenceNumber}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <div
                              className={cn(
                                "flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium",
                                statusColors[
                                application.status as keyof typeof statusColors
                                ] || "bg-zinc-100 text-gray-800 border-gray-200"
                              )}
                            >
                              <StatusIcon className="w-4 h-4" />
                              <span>{formatStatus(application.status)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 px-4 py-6 sm:px-6 relative">
                        {/* Loading overlay */}
                        {isLoadingApplication && (
                          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
                            <div className="flex flex-col items-center space-y-2">
                              <Spinner />
                              <p className="text-sm text-gray-600 dark:text-gray-400">Refreshing data...</p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-8">
                          {/* Basic Information */}
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                              Basic Information
                            </h3>
                            <dl className="space-y-3">
                              <div>
                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                  Applicant Email
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                  {application.applicantEmail}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                  Submitted
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                  {formatDate(application.createdAt)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                  Reference Number
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">
                                  {application.referenceNumber}
                                </dd>
                              </div>
                            </dl>
                          </div>

                          {/* Application Data */}
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                              Application Details
                            </h3>
                            {renderApplicationData()}
                          </div>

                          {/* AI Evaluation */}
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                              AI Evaluation
                            </h3>
                            {renderAIEvaluation()}
                          </div>

                          {/* Current Revision Reason */}
                          {getCurrentRevisionReason() && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                              <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-300 mb-2">
                                Revision Requested
                              </h3>
                              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                                {getCurrentRevisionReason()}
                              </p>
                            </div>
                          )}

                          {/* Status History */}
                          {application.statusHistory &&
                            (application.statusHistory.length > 0 || application.id) && (
                              <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                  Comments & Activity
                                </h3>
                                <CommentsTimeline
                                  applicationId={application.id}
                                  comments={[]}
                                  statusHistory={application.statusHistory}
                                  currentStatus={application.status}
                                  isAdmin={showStatusActions}
                                />
                              </div>
                            )}
                        </div>
                      </div>

                      {/* Actions */}
                      {showStatusActions && onStatusChange && (
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-4 sm:px-6">
                          <div className="flex flex-col space-y-2">
                            {/* For pending status: only show Under Review button */}
                            {application.status === "pending" && (
                              <div className="flex space-x-3">
                                <Button
                                  onClick={() => handleStatusChangeClick("under_review")}
                                  variant="primary"
                                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                                  disabled={isUpdatingStatus}
                                >
                                  Start Review
                                </Button>
                              </div>
                            )}

                            {/* For under_review status: show all action buttons */}
                            {application.status === "under_review" && (
                              <div className="flex space-x-3">
                                <Button
                                  onClick={() =>
                                    handleStatusChangeClick("revision_requested")
                                  }
                                  variant="secondary"
                                  className="flex-1"
                                  disabled={isUpdatingStatus}
                                >
                                  Request Revision
                                </Button>
                                <Button
                                  onClick={() => handleStatusChangeClick("approved")}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                  disabled={isUpdatingStatus}
                                >
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => handleStatusChangeClick("rejected")}
                                  className="flex-1 bg-red-600 hover:bg-red-700"
                                  disabled={isUpdatingStatus}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}

                            {/* For other statuses: show available actions except current status */}
                            {!["pending", "under_review", 'approved', 'rejected'].includes(application.status) && (
                              <div className="flex space-x-3">
                                {!["revision_requested"].includes(application.status) && (
                                  <Button
                                    onClick={() =>
                                      handleStatusChangeClick("revision_requested")
                                    }
                                    variant="secondary"
                                    className="flex-1"
                                    disabled={isUpdatingStatus}
                                  >
                                    Request Revision
                                  </Button>
                                )}
                                {application.status !== "approved" && (
                                  <Button
                                    onClick={() => handleStatusChangeClick("approved")}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    disabled={isUpdatingStatus}
                                  >
                                    Approve
                                  </Button>
                                )}
                                {application.status !== "rejected" && (
                                  <Button
                                    onClick={() => handleStatusChangeClick("rejected")}
                                    className="flex-1 bg-red-600 hover:bg-red-700"
                                    disabled={isUpdatingStatus}
                                  >
                                    Reject
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>

                          {application.status === "revision_requested" && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              The applicant can update their submission.
                            </p>
                          )}

                          {application.status === "withdrawn" && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                              This application has been withdrawn by the
                              applicant.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false);
          setPendingStatus("");
        }}
        onConfirm={handleStatusChangeConfirm}
        status={pendingStatus}
        isSubmitting={isUpdatingStatus}
        isReasonRequired={pendingStatus === "revision_requested"}
      />
    </>
  );
};

export default ApplicationDetailSidesheet;
