"use client";

import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { Button } from "@/components/Utilities/Button";
import { Can } from "@/src/core/rbac/components/can";
import { Permission } from "@/src/core/rbac/types";
import type { ApplicationReportAction, FundingApplicationStatusV2 } from "@/types/funding-platform";

// Maps the table transition's targetStatus to the action name the
// applications-report endpoint returns in `availableActions`. Used only when
// the optional `availableActions` prop is provided — otherwise the existing
// <Can permission={...}> gate handles authorization.
const TARGET_STATUS_TO_ACTION: Record<string, ApplicationReportAction> = {
  under_review: "review",
  revision_requested: "request_revision",
  approved: "approve",
  rejected: "reject",
};

// Define status transition configuration for table view
interface TableStatusTransition {
  targetStatus: FundingApplicationStatusV2;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  permission: Permission;
}

// Configuration for allowed status transitions in table view with required permissions
const TABLE_STATUS_TRANSITIONS: Record<FundingApplicationStatusV2, TableStatusTransition[]> = {
  pending: [
    {
      targetStatus: "under_review",
      label: "Review",
      className:
        "px-2 py-1 text-sm border bg-transparent text-purple-600 font-medium border-purple-200 dark:border-purple-700 dark:text-purple-400",
      permission: Permission.APPLICATION_REVIEW,
    },
  ],
  under_review: [
    {
      targetStatus: "revision_requested",
      label: "Request Revision",
      className:
        "px-2 py-1 text-sm dark:text-white border bg-transparent border-gray-200 font-medium dark:border-gray-700",
      permission: Permission.APPLICATION_CHANGE_STATUS,
    },
    {
      targetStatus: "approved",
      label: "Approve",
      icon: CheckIcon,
      className:
        "px-2 py-1 text-sm border bg-transparent text-green-600 font-medium border-green-200 dark:border-green-700 dark:text-green-400 flex items-center gap-1",
      permission: Permission.APPLICATION_APPROVE,
    },
    {
      targetStatus: "rejected",
      label: "Reject",
      icon: XMarkIcon,
      className:
        "px-2 py-1 text-sm border bg-transparent text-red-600 font-medium border-red-200 dark:border-red-700 dark:text-red-400 flex items-center gap-1",
      permission: Permission.APPLICATION_REJECT,
    },
  ],
  revision_requested: [
    {
      targetStatus: "under_review",
      label: "Review",
      className:
        "px-2 py-1 text-sm border bg-transparent text-purple-600 font-medium border-purple-200 dark:border-purple-700 dark:text-purple-400",
      permission: Permission.APPLICATION_REVIEW,
    },
  ],
  resubmitted: [
    {
      targetStatus: "under_review",
      label: "Review",
      className:
        "px-2 py-1 text-sm border bg-transparent text-purple-600 font-medium border-purple-200 dark:border-purple-700 dark:text-purple-400",
      permission: Permission.APPLICATION_REVIEW,
    },
  ],
  approved: [],
  rejected: [],
};

interface TableStatusActionButtonProps {
  transition: TableStatusTransition;
  applicationId: string;
  onStatusChange: (applicationId: string, status: string, e: React.MouseEvent) => void;
  disabled?: boolean;
}

// Individual table status action button component
const TableStatusActionButton: FC<TableStatusActionButtonProps> = ({
  transition,
  applicationId,
  onStatusChange,
  disabled = false,
}) => {
  const Icon = transition.icon;

  return (
    <Button
      onClick={(e) => onStatusChange(applicationId, transition.targetStatus, e)}
      variant="secondary"
      className={transition.className}
      disabled={disabled}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {transition.label}
    </Button>
  );
};

interface TableStatusActionButtonsProps {
  applicationId: string;
  currentStatus: FundingApplicationStatusV2;
  onStatusChange: (applicationId: string, status: string, e: React.MouseEvent) => void;
  isUpdating?: boolean;
  // When provided, overrides the <Can permission={...}> gate. Used by the
  // cross-program applications-report, where authorization is computed
  // server-side per-row (caller's role in *that row's* program) and surfaced
  // as a list of permitted actions. Leave undefined for per-program use cases
  // where the RBAC context is already program-scoped.
  availableActions?: ApplicationReportAction[];
}

// Main component that renders appropriate status action buttons for table rows
// Wraps each button with permission checks using the RBAC system
export const TableStatusActionButtons: FC<TableStatusActionButtonsProps> = ({
  applicationId,
  currentStatus,
  onStatusChange,
  isUpdating = false,
  availableActions,
}) => {
  const availableTransitions = TABLE_STATUS_TRANSITIONS[currentStatus] || [];

  // Don't show actions for final states
  if (["approved", "rejected"].includes(currentStatus)) {
    return null;
  }

  if (availableTransitions.length === 0) {
    return null;
  }

  if (availableActions) {
    const allowed = new Set(availableActions);
    const allowedTransitions = availableTransitions.filter((t) =>
      allowed.has(TARGET_STATUS_TO_ACTION[t.targetStatus])
    );
    if (allowedTransitions.length === 0) return null;
    return (
      <div className="flex gap-1">
        {allowedTransitions.map((transition) => (
          <TableStatusActionButton
            key={transition.targetStatus}
            transition={transition}
            applicationId={applicationId}
            onStatusChange={onStatusChange}
            disabled={isUpdating}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      {availableTransitions.map((transition) => (
        <Can key={transition.targetStatus} permission={transition.permission}>
          <TableStatusActionButton
            transition={transition}
            applicationId={applicationId}
            onStatusChange={onStatusChange}
            disabled={isUpdating}
          />
        </Can>
      ))}
    </div>
  );
};
