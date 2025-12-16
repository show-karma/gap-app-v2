import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  const reviewerLabel = REVIEWER_TYPE_LABELS[reviewerType];

  const mutation = useMutation({
    mutationFn: async (selectedAddresses: string[]) => {
      const request =
        reviewerType === ReviewerType.APP
          ? { appReviewerAddresses: selectedAddresses }
          : { milestoneReviewerAddresses: selectedAddresses };

      return applicationReviewersService.assignReviewers(applicationId, request);
    },
    onSuccess: async () => {
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

      toast.success(`${reviewerLabel} reviewers updated successfully`);
      onAssignmentChange?.();
    },
    onError: (error) => {
      console.error("Failed to update reviewers:", error);
      toast.error(getErrorMessage(error));
    },
  });

  return {
    assignReviewers: async (selectedAddresses: string[]) => {
      try {
        await mutation.mutateAsync(selectedAddresses);
      } catch (error) {
        // Error is already handled in onError callback, just prevent unhandled rejection
        // The error toast is shown via onError handler
      }
    },
    isLoading: mutation.isPending,
  };
};
