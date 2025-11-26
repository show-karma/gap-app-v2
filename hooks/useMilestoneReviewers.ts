import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "react-hot-toast";
import { milestoneReviewersService } from "@/services/milestone-reviewers.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Comprehensive hook for managing milestone reviewers
 * Includes query and mutations for add/remove operations
 */
export function useMilestoneReviewers(programId: string, chainID: number) {
  const queryClient = useQueryClient();

  // Query for fetching milestone reviewers
  const query = useQuery({
    queryKey: QUERY_KEYS.REVIEWERS.MILESTONE(programId, chainID),
    queryFn: async () => {
      return milestoneReviewersService.getReviewers(programId, chainID);
    },
    enabled: !!programId && !!chainID,
  });

  // Mutation for adding a milestone reviewer
  const addMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const validation = milestoneReviewersService.validateReviewerData({
        publicAddress: data.publicAddress,
        name: data.name,
        email: data.email,
        telegram: data.telegram,
      });

      if (!validation.valid) {
        throw new Error(validation.errors.join(", "));
      }

      return milestoneReviewersService.addReviewer(programId, chainID, {
        publicAddress: data.publicAddress,
        name: data.name,
        email: data.email,
        telegram: data.telegram,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REVIEWERS.MILESTONE(programId, chainID),
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

  // Mutation for removing a milestone reviewer
  const removeMutation = useMutation({
    mutationFn: async (publicAddress: string) => {
      return milestoneReviewersService.removeReviewer(programId, chainID, publicAddress);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REVIEWERS.MILESTONE(programId, chainID),
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
