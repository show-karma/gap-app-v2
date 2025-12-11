import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { applicationReviewersService } from "@/services/application-reviewers.service";

/**
 * Enum for reviewer types
 */
export enum ReviewerType {
  APP = "app",
  MILESTONE = "milestone",
}

const REVIEWER_TYPE_LABELS: Record<ReviewerType, string> = {
  [ReviewerType.APP]: "App",
  [ReviewerType.MILESTONE]: "Milestone",
};

// Type guard for API error response
interface ApiErrorResponse {
  response?: {
    status?: number;
    data?: {
      message?: string;
      details?: Array<{ field: string; message: string }>;
    };
  };
}

/**
 * Extract user-friendly error message from API error response
 */
const getErrorMessage = (error: unknown): string => {
  // Check if it's an API error with response structure
  if (error && typeof error === "object" && "response" in error) {
    const apiError = error as ApiErrorResponse;

    // Handle 422 validation errors with detailed messages
    if (apiError.response?.status === 422 && apiError.response?.data?.details) {
      const detailMessages = apiError.response.data.details.map((detail) => detail.message);
      return detailMessages.join("; ") || apiError.response.data.message || "Validation failed";
    }

    // Handle other API errors with message
    if (apiError.response?.data?.message) {
      return apiError.response.data.message;
    }
  }

  // Fallback to Error message or default
  return error instanceof Error ? error.message : "Failed to update reviewers";
};

interface UseReviewerAssignmentOptions {
  applicationId: string;
  reviewerType: ReviewerType;
  onAssignmentChange?: () => void;
}

/**
 * Custom hook for handling reviewer assignment logic
 * Separates assignment concerns from UI component
 */
export const useReviewerAssignment = ({
  applicationId,
  reviewerType,
  onAssignmentChange,
}: UseReviewerAssignmentOptions) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const assignReviewers = async (selectedAddresses: string[]) => {
    setIsLoading(true);
    try {
      const request =
        reviewerType === ReviewerType.APP
          ? { appReviewerAddresses: selectedAddresses }
          : { milestoneReviewerAddresses: selectedAddresses };

      await applicationReviewersService.assignReviewers(applicationId, request);

      // Invalidate application queries using specific query key prefixes
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          if (!Array.isArray(key) || key.length === 0) return false;
          const firstKey = key[0] as string;
          return (
            firstKey === "applications" ||
            firstKey === "funding-application" ||
            firstKey === "application-by-reference"
          );
        },
      });

      const reviewerLabel = REVIEWER_TYPE_LABELS[reviewerType];
      toast.success(`${reviewerLabel} reviewers updated successfully`);
      onAssignmentChange?.();
    } catch (error) {
      console.error("Failed to update reviewers:", error);
      toast.error(getErrorMessage(error));
      // Error is already handled via toast, no need to re-throw
    } finally {
      setIsLoading(false);
    }
  };

  return {
    assignReviewers,
    isLoading,
  };
};
