"use client";

import type { FC } from "react";
import { getAllowedStatusTransitions } from "@/components/FundingPlatform/statusTransitions";
import { Button } from "@/components/ui/button";
import { Can } from "@/src/core/rbac/components/can";
import { Permission } from "@/src/core/rbac/types";

export type ApplicationStatus =
  | "pending"
  | "under_review"
  | "revision_requested"
  | "approved"
  | "rejected"
  | "resubmitted";

interface StatusTransition {
  targetStatus: ApplicationStatus;
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  permission: Permission;
}

// Presentation only (label/style/permission + display order). Which transitions
// are actually offered comes from the shared adjacency in `statusTransitions`.
const STATUS_TRANSITION_ACTIONS: Record<ApplicationStatus, StatusTransition[]> = {
  pending: [
    {
      targetStatus: "under_review",
      label: "Start Review",
      variant: "default",
      permission: Permission.APPLICATION_REVIEW,
    },
  ],
  resubmitted: [
    {
      targetStatus: "under_review",
      label: "Start Review",
      variant: "default",
      permission: Permission.APPLICATION_REVIEW,
    },
  ],
  under_review: [
    {
      targetStatus: "approved",
      label: "Approve",
      className:
        "border border-emerald-600 text-emerald-700 bg-green-100 hover:bg-green-200 dark:text-white dark:bg-emerald-900 dark:hover:bg-emerald-800",
      permission: Permission.APPLICATION_APPROVE,
    },
    {
      targetStatus: "revision_requested",
      label: "Request Revision",
      variant: "outline",
      className: "border border-border",
      permission: Permission.APPLICATION_CHANGE_STATUS,
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
      permission: Permission.APPLICATION_REVIEW,
    },
  ],
  approved: [],
  rejected: [],
};

export interface HeaderActionsProps {
  currentStatus: ApplicationStatus;
  onStatusChange: (status: ApplicationStatus) => void;
  isUpdating?: boolean;
}

export const HeaderActions: FC<HeaderActionsProps> = ({
  currentStatus,
  onStatusChange,
  isUpdating = false,
}) => {
  const allowedTargets = getAllowedStatusTransitions(currentStatus);
  const availableTransitions = (STATUS_TRANSITION_ACTIONS[currentStatus] || []).filter(
    (transition) => allowedTargets.includes(transition.targetStatus)
  );

  if (availableTransitions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {availableTransitions.map((transition) => (
        <Can key={transition.targetStatus} permission={transition.permission}>
          <Button
            onClick={() => onStatusChange(transition.targetStatus)}
            variant={transition.variant || "default"}
            className={transition.className || ""}
            disabled={isUpdating}
            size="sm"
          >
            {transition.label}
          </Button>
        </Can>
      ))}
    </div>
  );
};

export default HeaderActions;
