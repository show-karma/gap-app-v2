"use client";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { type FC, memo } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import type { FundingApplicationStatusV2, IStatusHistoryEntry } from "@/types/funding-platform";
import { renderRelativeTime } from "@/utilities/formatRelativeTime";
import { cn } from "@/utilities/tailwind";

interface StatusPresentation {
  icon: typeof ClockIcon;
  color: string;
  label: string;
}

const TIMELINE_STATUS_CONFIG: Record<FundingApplicationStatusV2, StatusPresentation> = {
  pending: {
    icon: ClockIcon,
    color: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900",
    label: "Pending Review",
  },
  under_review: {
    icon: ClockIcon,
    color: "text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900",
    label: "Under Review",
  },
  revision_requested: {
    icon: ExclamationTriangleIcon,
    color: "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900",
    label: "Revision Requested",
  },
  approved: {
    icon: CheckCircleIcon,
    color: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900",
    label: "Approved",
  },
  rejected: {
    icon: XCircleIcon,
    color: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900",
    label: "Declined",
  },
  resubmitted: {
    icon: ArrowPathIcon,
    color: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900",
    label: "Resubmitted",
  },
};

const getStatusPresentation = (status: string): StatusPresentation =>
  TIMELINE_STATUS_CONFIG[status as FundingApplicationStatusV2] ?? TIMELINE_STATUS_CONFIG.pending;

interface TimelineStatusItemProps {
  status: IStatusHistoryEntry;
  /** Marks this row as the application's live status (ring + emphasized copy). */
  isCurrent: boolean;
}

/**
 * One "Status changed to …" row of the activity timeline. Shared by the
 * application Comments tab and the milestone/grant review surfaces.
 */
export const TimelineStatusItem: FC<TimelineStatusItemProps> = memo(({ status, isCurrent }) => {
  const { icon: StatusIcon, color, label } = getStatusPresentation(status.status);

  return (
    <div className="flex space-x-3">
      <div className="flex-shrink-0">
        <span
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center",
            color,
            isCurrent && "ring-4 ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
          )}
        >
          <StatusIcon className="h-5 w-5" />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <p
              className={cn(
                "text-sm font-medium",
                isCurrent ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"
              )}
            >
              Status changed to {label}
              {isCurrent && (
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  (Current)
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {renderRelativeTime(status.timestamp)}
            </p>
          </div>
        </div>
        {status.reason && (
          <div className="mt-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reason:</p>
            <MarkdownPreview
              components={{
                p: ({ children }) => <p className="text-sm">{children}</p>,
              }}
              source={status.reason}
              className="text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
});

TimelineStatusItem.displayName = "TimelineStatusItem";
