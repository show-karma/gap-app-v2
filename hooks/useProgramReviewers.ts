import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { programReviewersService } from "@/services/program-reviewers.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { getReviewerErrorMessage } from "@/utilities/reviewerErrors";

/**
 * Comprehensive hook for managing program reviewers
 * Includes query and mutations for add/remove operations
 */
export function useProgramReviewers(programId: string) {
  const queryClient = useQueryClient();
  const { authenticated } = useAuth();

  // Query for fetching program reviewers
  const query = useQuery({
    queryKey: QUERY_KEYS.REVIEWERS.PROGRAM(programId),
    queryFn: async () => {
      return programReviewersService.getReviewers(programId);
    },
    enabled: !!programId && authenticated,
  });

  // Mutation for adding a program reviewer
  const addMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const validation = programReviewersService.validateReviewerData({
        name: data.name,
        email: data.email,
        telegram: data.telegram,
        slack: data.slack,
      });

      if (!validation.valid) {
        throw new Error(validation.errors.join(", "));
      }

      return programReviewersService.addReviewer(programId, validation.sanitized);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REVIEWERS.PROGRAM(programId),
      });
      toast.success("Program reviewer added successfully");
    },
    onError: (error) => {
      toast.error(getReviewerErrorMessage(error, "Failed to add program reviewer"));
    },
  });

  // Mutation for removing a program reviewer by email
  const removeMutation = useMutation({
    mutationFn: async (email: string) => {
      return programReviewersService.removeReviewer(programId, email);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REVIEWERS.PROGRAM(programId),
      });
      toast.success("Program reviewer removed successfully");
    },
    onError: (error) => {
      toast.error(getReviewerErrorMessage(error, "Failed to remove program reviewer"));
    },
  });

  // Mutation for updating reviewer contact (telegram/slack) by email
  const updateContactMutation = useMutation({
    mutationFn: async (patch: { email: string; telegram?: string; slack?: string }) => {
      return programReviewersService.updateReviewerContact(programId, patch);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REVIEWERS.PROGRAM(programId),
      });
      toast.success("Program reviewer updated successfully");
    },
    onError: (error) => {
      toast.error(getReviewerErrorMessage(error, "Failed to update program reviewer"));
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

      // Update contact mutation
      updateReviewerContact: updateContactMutation.mutateAsync,
      isUpdatingContact: updateContactMutation.isPending,
    }),
    [query, addMutation, removeMutation, updateContactMutation]
  );
}
