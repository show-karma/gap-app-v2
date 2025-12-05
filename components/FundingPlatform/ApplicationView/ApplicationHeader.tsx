"use client";

import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { FC, ReactNode } from "react";
import type { IFundingApplication, ProgramWithFormSchema } from "@/types/funding-platform";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import { getProjectTitle } from "../helper/getProjecTitle";

const statusColors: Record<string, string> = {
  pending:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  under_review:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  revision_requested:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  approved:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  rejected:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  resubmitted:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
};

const statusIcons: Record<string, typeof ClockIcon> = {
  pending: ClockIcon,
  under_review: ClockIcon,
  revision_requested: ExclamationTriangleIcon,
  approved: CheckCircleIcon,
  rejected: XMarkIcon,
  resubmitted: ClockIcon,
};

const formatStatus = (status: string): string => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export interface ApplicationHeaderProps {
  application: IFundingApplication;
  program?: ProgramWithFormSchema;
  /** Status action buttons (Approve, Reject, etc.) */
  statusActions?: ReactNode;
  /** More actions dropdown */
  moreActions?: ReactNode;
  /** When true, removes bottom border and rounding to connect with tabs below */
  connectedToTabs?: boolean;
}

export const ApplicationHeader: FC<ApplicationHeaderProps> = ({
  application,
  program: _program,
  statusActions,
  moreActions,
  connectedToTabs = false,
}) => {
  const StatusIcon = statusIcons[application.status] || ClockIcon;
  const projectTitle = getProjectTitle(application);
  const hasActions = statusActions || moreActions;

  return (
    <div
      className={cn(
        "bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700",
        connectedToTabs ? "rounded-t-lg border-b-0" : "rounded-lg"
      )}
    >
      <div className="p-6">
        {/* Top row: Title, Status Badge, and More Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words">
              {projectTitle}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono break-all">
              {application.referenceNumber}
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
            {/* Status Badge */}
            <output
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs sm:text-sm font-medium whitespace-nowrap",
                statusColors[application.status] || "bg-gray-100 text-gray-800 border-gray-200"
              )}
              aria-label={`Application status: ${formatStatus(application.status)}`}
            >
              <StatusIcon className="w-4 h-4" aria-hidden="true" />
              <span>{formatStatus(application.status)}</span>
            </output>

            {/* More Actions - always visible */}
            {moreActions && <div className="flex-shrink-0">{moreActions}</div>}
          </div>
        </div>

        {/* Metadata row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
          {application.applicantEmail && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 dark:text-gray-500">Submitted by:</span>
              <span className="text-gray-900 dark:text-gray-200">{application.applicantEmail}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 dark:text-gray-500">Submitted:</span>
            <span className="text-gray-900 dark:text-gray-200">
              {formatDate(application.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 dark:text-gray-500">Last updated:</span>
            <span className="text-gray-900 dark:text-gray-200">
              {formatDate(application.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions row - only if there are status actions */}
      {hasActions && statusActions && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">{statusActions}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationHeader;
