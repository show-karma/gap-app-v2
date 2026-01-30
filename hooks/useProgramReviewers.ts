import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "react-hot-toast";
import { programReviewersService } from "@/services/program-reviewers.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Comprehensive hook for managing program reviewers
 * Includes query and mutations for add/remove operations
 */
export function useProgramReviewers(programId: string) {
  const queryClient = useQueryClient();

  // Query for fetching program reviewers
  const query = useQuery({
    queryKey: QUERY_KEYS.REVIEWERS.PROGRAM(programId),
    queryFn: async () => {
      return programReviewersService.getReviewers(programId);
    },
    enabled: !!programId,
  });

  // Mutation for adding a program reviewer
  // Uses email-based identification - wallet is generated via Privy
  const addMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const validation = programReviewersService.validateReviewerData({
        loginEmail: data.loginEmail,
        name: data.name,
        notificationEmail: data.notificationEmail,
        telegram: data.telegram,
      });

      if (!validation.valid) {
        throw new Error(validation.errors.join(", "));
      }

      return programReviewersService.addReviewer(programId, {
        loginEmail: data.loginEmail,
        name: data.name,
        notificationEmail: data.notificationEmail || undefined,
        telegram: data.telegram || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REVIEWERS.PROGRAM(programId),
      });
      toast.success("Program reviewer added successfully");
    },
    onError: (error) => {
      console.error("Error adding program reviewer:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add program reviewer";
      toast.error(errorMessage);
    },
  });

  // Mutation for removing a program reviewer
  // Accepts loginEmail (new) or publicAddress (legacy) as identifier
  const removeMutation = useMutation({
    mutationFn: async (identifier: string) => {
      return programReviewersService.removeReviewer(programId, identifier);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REVIEWERS.PROGRAM(programId),
      });
      toast.success("Program reviewer removed successfully");
    },
    onError: (error) => {
      console.error("Error removing program reviewer:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to remove program reviewer";
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
