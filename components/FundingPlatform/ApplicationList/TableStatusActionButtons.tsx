"use client"

import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline"
import type { FC } from "react"
import { Button } from "@/components/Utilities/Button"

// Define the possible application statuses
type ApplicationStatus = "pending" | "under_review" | "revision_requested" | "approved" | "rejected"

// Define status transition configuration for table view
interface TableStatusTransition {
  targetStatus: ApplicationStatus
  label: string
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}

// Configuration for allowed status transitions in table view
const TABLE_STATUS_TRANSITIONS: Record<ApplicationStatus, TableStatusTransition[]> = {
  pending: [
    {
      targetStatus: "under_review",
      label: "Review",
      className:
        "px-2 py-1 text-sm border bg-transparent text-purple-600 font-medium border-purple-200 dark:border-purple-700 dark:text-purple-400",
    },
  ],
  under_review: [
    {
      targetStatus: "revision_requested",
      label: "Request Revision",
      className:
        "px-2 py-1 text-sm dark:text-white border bg-transparent border-gray-200 font-medium dark:border-gray-700",
    },
    {
      targetStatus: "approved",
      label: "Approve",
      icon: CheckIcon,
      className:
        "px-2 py-1 text-sm border bg-transparent text-green-600 font-medium border-green-200 dark:border-green-700 dark:text-green-400 flex items-center gap-1",
    },
    {
      targetStatus: "rejected",
      label: "Reject",
      icon: XMarkIcon,
      className:
        "px-2 py-1 text-sm border bg-transparent text-red-600 font-medium border-red-200 dark:border-red-700 dark:text-red-400 flex items-center gap-1",
    },
  ],
  revision_requested: [
    {
      targetStatus: "under_review",
      label: "Review",
      className:
        "px-2 py-1 text-sm border bg-transparent text-purple-600 font-medium border-purple-200 dark:border-purple-700 dark:text-purple-400",
    },
  ],
  approved: [],
  rejected: [],
}

interface TableStatusActionButtonProps {
  transition: TableStatusTransition
  applicationId: string
  onStatusChange: (applicationId: string, status: string, e: React.MouseEvent) => void
  disabled?: boolean
}

// Individual table status action button component
const TableStatusActionButton: FC<TableStatusActionButtonProps> = ({
  transition,
  applicationId,
  onStatusChange,
  disabled = false,
}) => {
  const Icon = transition.icon

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
  )
}

interface TableStatusActionButtonsProps {
  applicationId: string
  currentStatus: ApplicationStatus
  onStatusChange: (applicationId: string, status: string, e: React.MouseEvent) => void
  isUpdating?: boolean
}

// Main component that renders appropriate status action buttons for table rows
export const TableStatusActionButtons: FC<TableStatusActionButtonsProps> = ({
  applicationId,
  currentStatus,
  onStatusChange,
  isUpdating = false,
}) => {
  const availableTransitions = TABLE_STATUS_TRANSITIONS[currentStatus] || []

  // Don't show actions for final states
  if (["approved", "rejected"].includes(currentStatus)) {
    return null
  }

  if (availableTransitions.length === 0) {
    return null
  }

  return (
    <div className="flex gap-1">
      {availableTransitions.map((transition) => (
        <TableStatusActionButton
          key={transition.targetStatus}
          transition={transition}
          applicationId={applicationId}
          onStatusChange={onStatusChange}
          disabled={isUpdating}
        />
      ))}
    </div>
  )
}
