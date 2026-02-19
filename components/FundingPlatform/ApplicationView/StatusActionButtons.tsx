"use client";

import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { Can } from "@/src/core/rbac/components/can";
import { Permission } from "@/src/core/rbac/types";

// Define the possible application statuses
type ApplicationStatus =
  | "pending"
  | "under_review"
  | "revision_requested"
  | "approved"
  | "rejected"
  | "resubmitted";

// Define status transition configuration
interface StatusTransition {
  targetStatus: ApplicationStatus;
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  permission: Permission;
}

// Configuration for allowed status transitions with required permissions
const STATUS_TRANSITIONS: Record<ApplicationStatus, StatusTransition[]> = {
  pending: [
    {
      targetStatus: "under_review",
      label: "Start Review",
      variant: "default",
      className: "",
      permission: Permission.APPLICATION_REVIEW,
    },
  ],
  resubmitted: [
    {
      targetStatus: "under_review",
      label: "Start Review",
      variant: "default",
      className: "",
      permission: Permission.APPLICATION_REVIEW,
    },
  ],
  under_review: [
    {
      targetStatus: "revision_requested",
      label: "Request Revision",
      variant: "outline",
      className: "border border-border",
      permission: Permission.APPLICATION_CHANGE_STATUS,
    },
    {
      targetStatus: "approved",
      label: "Approve",
      className:
        "border border-emerald-600 text-emerald-700 bg-green-100 hover:bg-green-200 dark:text-white dark:bg-emerald-900 dark:hover:bg-emerald-800",
      permission: Permission.APPLICATION_APPROVE,
    },
    {
      targetStatus: "rejected",
      label: "Reject",
      className:
        "border border-red-600 text-red-700 bg-red-100 hover:bg-red-200 dark:text-white dark:bg-red-900 dark:hover:bg-red-800",
      permission: Permission.APPLICATION_REJECT,
    },
  ],
  revision_requested: [
    {
      targetStatus: "under_review",
      label: "Review",
      variant: "default",
      className: "",
      permission: Permission.APPLICATION_REVIEW,
    },
  ],
  approved: [],
  rejected: [],
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
  disabled = false,
}) => {
  return (
    <Button
      onClick={() => onStatusChange(transition.targetStatus)}
      variant={transition.variant || "default"}
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
// Wraps each button with permission checks using the RBAC system
export const StatusActionButtons: FC<StatusActionButtonsProps> = ({
  currentStatus,
  onStatusChange,
  isUpdating = false,
}) => {
  const availableTransitions = STATUS_TRANSITIONS[currentStatus] || [];

  if (availableTransitions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex space-x-3">
        {availableTransitions.map((transition) => (
          <Can key={transition.targetStatus} permission={transition.permission}>
            <StatusActionButton
              transition={transition}
              onStatusChange={onStatusChange}
              disabled={isUpdating}
            />
          </Can>
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
