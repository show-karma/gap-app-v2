"use client";

import { type FC, useMemo } from "react";
import { type DropdownItem, MultiSelectDropdown } from "@/components/Utilities/MultiSelectDropdown";
import { type ReviewerType, useReviewerAssignment } from "@/hooks/useReviewerAssignment";

/**
 * Shared base interface for reviewer types
 * Both ProgramReviewer and MilestoneReviewer share these common properties
 */
export interface ReviewerBase {
  publicAddress: string;
  name: string;
  email: string;
  telegram?: string;
  assignedAt: string;
  assignedBy?: string;
}

interface ReviewerAssignmentDropdownProps {
  applicationId: string;
  availableReviewers: ReviewerBase[];
  assignedReviewerAddresses: string[];
  reviewerType: ReviewerType;
  onAssignmentChange?: () => void;
}

export const ReviewerAssignmentDropdown: FC<ReviewerAssignmentDropdownProps> = ({
  applicationId,
  availableReviewers,
  assignedReviewerAddresses,
  reviewerType,
  onAssignmentChange,
}) => {
  // Use custom hook for assignment logic
  const { assignReviewers, isLoading } = useReviewerAssignment({
    applicationId,
    reviewerType,
    onAssignmentChange,
  });

  // Convert reviewers to dropdown items
  // Normalize addresses to lowercase for consistent comparison (backend normalizes addresses)
  const dropdownItems: DropdownItem[] = useMemo(
    () =>
      availableReviewers.map((reviewer) => ({
        id: reviewer.publicAddress.toLowerCase(),
        label: reviewer.name || reviewer.email || reviewer.publicAddress,
        value: reviewer,
      })),
    [availableReviewers]
  );

  // Normalize assigned addresses for comparison
  const normalizedAssignedAddresses = useMemo(
    () => assignedReviewerAddresses.map((addr) => addr.toLowerCase()),
    [assignedReviewerAddresses]
  );

  return (
    <MultiSelectDropdown
      items={dropdownItems}
      selectedIds={normalizedAssignedAddresses}
      onChange={assignReviewers}
      placeholder={isLoading ? "Updating..." : `Select ${reviewerType} reviewers...`}
      searchPlaceholder="Search reviewers..."
      className="min-w-[200px]"
      disabled={isLoading}
      isLoading={isLoading}
    />
  );
};
