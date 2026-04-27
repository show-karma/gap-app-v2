"use client";

import { type FC, useCallback, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import InviteReviewerModal, {
  type InvitedReviewer,
} from "@/components/FundingPlatform/ApplicationView/InviteReviewerModal";
import { type DropdownItem, MultiSelectDropdown } from "@/components/Utilities/MultiSelectDropdown";
import { ReviewerType, useReviewerAssignment } from "@/hooks/useReviewerAssignment";
import type { AddMilestoneReviewerRequest } from "@/services/milestone-reviewers.service";
import type { AddReviewerRequest } from "@/services/program-reviewers.service";

/**
 * Shared base interface for reviewer types
 * Both ProgramReviewer and MilestoneReviewer share these common properties
 */
export interface ReviewerBase {
  publicAddress?: string;
  name: string;
  email: string;
  telegram?: string;
  assignedAt: string;
  assignedBy?: string;
}

interface ReviewerAssignmentDropdownProps {
  programId: string;
  applicationId: string;
  availableReviewers: ReviewerBase[];
  assignedReviewerAddresses: string[];
  reviewerType: ReviewerType;
  onAssignmentChange?: () => void;
  onAddReviewer: (
    data: AddReviewerRequest | AddMilestoneReviewerRequest
  ) => Promise<InvitedReviewer>;
  isAddingReviewer?: boolean;
}

export const ReviewerAssignmentDropdown: FC<ReviewerAssignmentDropdownProps> = ({
  programId,
  applicationId,
  availableReviewers,
  assignedReviewerAddresses,
  reviewerType,
  onAssignmentChange,
  onAddReviewer,
  isAddingReviewer = false,
}) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Use custom hook for assignment logic
  const { assignReviewers, isLoading } = useReviewerAssignment({
    applicationId,
    reviewerType,
    onAssignmentChange,
  });

  // Convert reviewers to dropdown items
  // Normalize wallet addresses to lowercase for consistent comparison.
  // Assignment APIs accept wallet-address identifiers only.
  const dropdownItems: DropdownItem[] = useMemo(
    () =>
      availableReviewers
        .filter((reviewer): reviewer is ReviewerBase & { publicAddress: string } =>
          Boolean(reviewer.publicAddress)
        )
        .map((reviewer) => ({
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

  const reviewerActionLabel =
    reviewerType === ReviewerType.APP ? "Add application reviewer" : "Add milestone reviewer";

  const handleInvited = useCallback(
    async (reviewer: InvitedReviewer) => {
      if (!reviewer.publicAddress) {
        const reviewerLabel = reviewer.name || reviewer.email;
        toast.success(
          `${reviewerLabel} was invited. They'll appear in the reviewer list once they sign in, then you can assign them to this application.`
        );
        return;
      }

      const nextAssignedAddresses = Array.from(
        new Set([...normalizedAssignedAddresses, reviewer.publicAddress.toLowerCase()])
      );

      await assignReviewers(nextAssignedAddresses);
    },
    [assignReviewers, normalizedAssignedAddresses]
  );

  return (
    <>
      <MultiSelectDropdown
        items={dropdownItems}
        selectedIds={normalizedAssignedAddresses}
        onChange={assignReviewers}
        placeholder={isLoading ? "Updating..." : `Select ${reviewerType} reviewers...`}
        searchPlaceholder="Search reviewers..."
        className="min-w-[200px]"
        disabled={isLoading || isAddingReviewer}
        isLoading={isLoading || isAddingReviewer}
        emptyActionLabel={reviewerActionLabel}
        onEmptyAction={() => setIsInviteModalOpen(true)}
      />
      <InviteReviewerModal
        programId={programId}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        reviewerType={reviewerType}
        onInviteReviewer={onAddReviewer}
        isInviting={isAddingReviewer}
        onInvited={handleInvited}
      />
    </>
  );
};
