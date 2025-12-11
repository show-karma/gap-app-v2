"use client";

import { useQueryClient } from "@tanstack/react-query";
import { type FC, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { type DropdownItem, MultiSelectDropdown } from "@/components/Utilities/MultiSelectDropdown";
import { applicationReviewersService } from "@/services/application-reviewers.service";
import type { MilestoneReviewer } from "@/services/milestone-reviewers.service";
import type { ProgramReviewer } from "@/services/program-reviewers.service";

interface ReviewerAssignmentDropdownProps {
  applicationId: string;
  availableReviewers: ProgramReviewer[] | MilestoneReviewer[];
  assignedReviewerAddresses: string[];
  reviewerType: "app" | "milestone";
  onAssignmentChange?: () => void;
}

export const ReviewerAssignmentDropdown: FC<ReviewerAssignmentDropdownProps> = ({
  applicationId,
  availableReviewers,
  assignedReviewerAddresses,
  reviewerType,
  onAssignmentChange,
}) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

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

  // Extract error message from API error response
  const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === "object" && "response" in error) {
      const apiError = error as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            details?: Array<{ field: string; message: string }>;
          };
        };
      };

      // Handle 422 validation errors with detailed messages
      if (apiError.response?.status === 422 && apiError.response?.data?.details) {
        return (
          apiError.response.data.details.map((detail) => detail.message).join("; ") ||
          apiError.response.data.message ||
          "Validation failed"
        );
      }

      if (apiError.response?.data?.message) {
        return apiError.response.data.message;
      }
    }

    return error instanceof Error ? error.message : "Failed to update reviewers";
  };

  const handleReviewerChange = async (selectedAddresses: string[]) => {
    setIsLoading(true);
    try {
      const request =
        reviewerType === "app"
          ? { appReviewerAddresses: selectedAddresses }
          : { milestoneReviewerAddresses: selectedAddresses };

      await applicationReviewersService.assignReviewers(applicationId, request);

      // Invalidate all application queries to refresh the data
      const applicationQueryKeys = [
        "applications",
        "funding-application",
        "application-by-reference",
      ];
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) && key.length > 0 && applicationQueryKeys.includes(key[0] as string)
          );
        },
      });

      toast.success(
        `${reviewerType === "app" ? "App" : "Milestone"} reviewers updated successfully`
      );
      onAssignmentChange?.();
    } catch (error) {
      console.error("Failed to update reviewers:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MultiSelectDropdown
      items={dropdownItems}
      selectedIds={normalizedAssignedAddresses}
      onChange={handleReviewerChange}
      placeholder={
        isLoading
          ? "Updating..."
          : `Select ${reviewerType === "app" ? "app" : "milestone"} reviewers...`
      }
      searchPlaceholder="Search reviewers..."
      className="min-w-[200px]"
      disabled={isLoading}
      isLoading={isLoading}
    />
  );
};
