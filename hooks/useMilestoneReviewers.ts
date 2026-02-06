import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { milestoneReviewersService } from "@/services/milestone-reviewers.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Comprehensive hook for managing milestone reviewers
 * Includes query and mutations for add/remove operations
 */
export function useMilestoneReviewers(programId: string) {
  const queryClient = useQueryClient();
  const { authenticated } = useAuth();

  // Query for fetching milestone reviewers
  // Only fetch when authenticated since this endpoint requires authorization
  const query = useQuery({
    queryKey: QUERY_KEYS.REVIEWERS.MILESTONE(programId),
    queryFn: async () => {
      return milestoneReviewersService.getReviewers(programId);
    },
    enabled: !!programId && authenticated,
  });

  // Mutation for adding a milestone reviewer
  // Uses email-based identification - wallet is generated via Privy
  const addMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const validation = milestoneReviewersService.validateReviewerData({
        email: data.email,
        name: data.name,
        telegram: data.telegram,
      });

      if (!validation.valid) {
        throw new Error(validation.errors.join(", "));
      }

      return milestoneReviewersService.addReviewer(programId, {
        email: data.email,
        name: data.name,
        telegram: data.telegram || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REVIEWERS.MILESTONE(programId),
      });
      toast.success("Milestone reviewer added successfully");
    },
    onError: (error) => {
      console.error("Error adding milestone reviewer:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add milestone reviewer";
      toast.error(errorMessage);
    },
  });

  // Mutation for removing a milestone reviewer by email
  const removeMutation = useMutation({
    mutationFn: async (identifier: string) => {
      return milestoneReviewersService.removeReviewer(programId, identifier);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REVIEWERS.MILESTONE(programId),
      });
      toast.success("Milestone reviewer removed successfully");
    },
    onError: (error) => {
      console.error("Error removing milestone reviewer:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to remove milestone reviewer";
      toast.error(errorMessage);
    },
  });

  return useMemo(
    () => ({
      // Query data and state
      data: query.data,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
      refetch: query.refetch,

      // Add mutation
      addReviewer: addMutation.mutateAsync,
      isAdding: addMutation.isPending,

      // Remove mutation
      removeReviewer: removeMutation.mutateAsync,
      isRemoving: removeMutation.isPending,
    }),
    [query, addMutation, removeMutation]
  );
}
