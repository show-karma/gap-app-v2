"use client";

import { FC } from "react";
import { Button } from "@/components/Utilities/Button";

// Define the possible application statuses
type ApplicationStatus = "pending" | "under_review" | "revision_requested" | "approved" | "rejected" | "resubmitted";

// Define status transition configuration
interface StatusTransition {
  targetStatus: ApplicationStatus;
  label: string;
  variant?: "primary" | "secondary";
  className?: string;
}

// Configuration for allowed status transitions
const STATUS_TRANSITIONS: Record<ApplicationStatus, StatusTransition[]> = {
  pending: [
    {
      targetStatus: "under_review",
      label: "Start Review",
      variant: "primary",
      className: "bg-primary-500 text-white hover:bg-primary-600 dark:text-white dark:bg-primary-900 dark:hover:bg-primary-800"
    }
  ],
  resubmitted: [
    {
      targetStatus: "under_review",
      label: "Start Review",
      variant: "primary",
      className: "bg-primary-500 text-white hover:bg-primary-600 dark:text-white dark:bg-primary-900 dark:hover:bg-primary-800"
    }
  ],
  under_review: [
    {
      targetStatus: "revision_requested",
      label: "Request Revision",
      variant: "secondary",
      className: 'dark:text-white dark:bg-zinc-900 dark:hover:bg-zinc-800'
    },
    {
      targetStatus: "approved",
      label: "Approve",
      className: "border border-emerald-600 text-emerald-700 bg-green-100 hover:bg-green-200 dark:text-white dark:bg-emerald-900 dark:hover:bg-emerald-800"
    },
    {
      targetStatus: "rejected",
      label: "Reject",
      className: "border border-red-600 text-red-700 bg-red-100 hover:bg-red-200 dark:text-white dark:bg-red-900 dark:hover:bg-red-800"
    }
  ],
  revision_requested: [
    {
      targetStatus: "under_review",
      label: "Review",
      variant: "primary",
      className: "bg-primary-500 text-white hover:bg-primary-600 dark:text-white dark:bg-primary-900 dark:hover:bg-primary-800"
    }
  ],
  approved: [],
  rejected: []
};

interface StatusActionButtonProps {
  transition: StatusTransition;
  onStatusChange: (status: ApplicationStatus) => void;
  disabled?: boolean;
}

// Individual status action button component
const StatusActionButton: FC<StatusActionButtonProps> = ({
  transition,
  onStatusChange,
  disabled = false
}) => {
  return (
    <Button
      onClick={() => onStatusChange(transition.targetStatus)}
      variant={transition.variant}
      className={`flex-1 text-center items-center justify-center ${transition.className || ""}`}
      disabled={disabled}
    >
      {transition.label}
    </Button>
  );
};

interface StatusActionButtonsProps {
  currentStatus: ApplicationStatus;
  onStatusChange: (status: string) => void;
  isUpdating?: boolean;
}

// Main component that renders appropriate status action buttons
export const StatusActionButtons: FC<StatusActionButtonsProps> = ({
  currentStatus,
  onStatusChange,
  isUpdating = false
}) => {
  const availableTransitions = STATUS_TRANSITIONS[currentStatus] || [];

  if (availableTransitions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex space-x-3">
        {availableTransitions.map((transition) => (
          <StatusActionButton
            key={transition.targetStatus}
            transition={transition}
            onStatusChange={onStatusChange}
            disabled={isUpdating}
          />
        ))}
      </div>

      {currentStatus === "revision_requested" && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          The applicant can update their submission.
        </p>
      )}
    </div>
  );
};