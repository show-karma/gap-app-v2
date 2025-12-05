"use client";

import type { FC } from "react";
import { Button } from "@/components/ui/button";

type ApplicationStatus =
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
}

const STATUS_TRANSITIONS: Record<ApplicationStatus, StatusTransition[]> = {
  pending: [
    {
      targetStatus: "under_review",
      label: "Start Review",
      variant: "default",
    },
  ],
  resubmitted: [
    {
      targetStatus: "under_review",
      label: "Start Review",
      variant: "default",
    },
  ],
  under_review: [
    {
      targetStatus: "approved",
      label: "Approve",
      className:
        "border border-emerald-600 text-emerald-700 bg-green-100 hover:bg-green-200 dark:text-white dark:bg-emerald-900 dark:hover:bg-emerald-800",
    },
    {
      targetStatus: "revision_requested",
      label: "Request Revision",
      variant: "outline",
      className: "border border-border",
    },
    {
      targetStatus: "rejected",
      label: "Reject",
      className:
        "border border-red-600 text-red-700 bg-red-100 hover:bg-red-200 dark:text-white dark:bg-red-900 dark:hover:bg-red-800",
    },
  ],
  revision_requested: [
    {
      targetStatus: "under_review",
      label: "Review",
      variant: "default",
    },
  ],
  approved: [],
  rejected: [],
};

export interface HeaderActionsProps {
  currentStatus: ApplicationStatus;
  onStatusChange: (status: string) => void;
  isUpdating?: boolean;
}

export const HeaderActions: FC<HeaderActionsProps> = ({
  currentStatus,
  onStatusChange,
  isUpdating = false,
}) => {
  const availableTransitions = STATUS_TRANSITIONS[currentStatus] || [];

  if (availableTransitions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {availableTransitions.map((transition) => (
        <Button
          key={transition.targetStatus}
          onClick={() => onStatusChange(transition.targetStatus)}
          variant={transition.variant || "default"}
          className={transition.className || ""}
          disabled={isUpdating}
          size="sm"
        >
          {transition.label}
        </Button>
      ))}
    </div>
  );
};

export default HeaderActions;
