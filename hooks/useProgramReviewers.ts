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

  // Mutation for removing a program reviewer
  const removeMutation = useMutation({
    mutationFn: async (publicAddress: string) => {
      return programReviewersService.removeReviewer(programId, publicAddress);
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
