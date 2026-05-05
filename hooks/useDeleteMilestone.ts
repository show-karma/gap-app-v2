import { useMutation, useQueryClient } from "@tanstack/react-query";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import type {
  GrantMilestoneWithCompletion,
  ProjectGrantMilestonesResponse,
} from "@/services/milestones";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseDeleteMilestoneParams {
  projectId: string;
  programId: string;
  onSuccess?: () => void;
}

/**
 * Hook for deleting milestones with proper React Query mutation/query relationship
 */
export const useDeleteMilestone = ({
  projectId,
  programId,
  onSuccess,
}: UseDeleteMilestoneParams) => {
  const queryClient = useQueryClient();
  const { startAttestation, showSuccess, showError } = useAttestationToast();

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (milestone: GrantMilestoneWithCompletion) => {
      startAttestation("Deleting milestone...");

      // Deletion uses on-chain milestoneUID
      // TODO: Implement on-chain milestone deletion via attestation
      // For now, we'll just return success without calling the backend
      // This will be replaced with the on-chain deletion flow

      return { milestone, result: { milestoneRemoved: true } };
    },
    onMutate: async (milestone) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      const queryKey = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(projectId, programId);
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueryData<ProjectGrantMilestonesResponse | null>(
        queryKey
      );

      // Optimistically update the cache to remove the deleted milestone
      queryClient.setQueryData<ProjectGrantMilestonesResponse | null>(queryKey, (oldData) => {
        if (!oldData || !oldData.grantMilestones || !Array.isArray(oldData.grantMilestones)) {
          return oldData;
        }

        return {
          ...oldData,
          grantMilestones: oldData.grantMilestones.filter((m) => m?.uid !== milestone.uid),
        };
      });

      return { previousData };
    },
    onSuccess: (data, _milestone, _context) => {
      const { milestone: deletedMilestone, result } = data;

      showSuccess(`Milestone "${deletedMilestone.title}" deleted successfully`);

      // Invalidate and refetch to ensure consistency
      const queryKey = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(projectId, programId);
      queryClient.invalidateQueries({ queryKey });

      onSuccess?.();
    },
    onError: (error: any, milestone, context) => {
      // Rollback optimistic update on error
      const queryKey = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(projectId, programId);
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      const errorMessage =
        error?.response?.data?.message || error?.message || "Failed to delete milestone";

      showError(errorMessage);

      errorManager(`Failed to delete milestone "${milestone.title}"`, error, {
        milestoneUID: milestone.uid,
        milestoneTitle: milestone.title,
      });
    },
  });

  return {
    deleteMilestone: deleteMilestoneMutation.mutate,
    deleteMilestoneAsync: deleteMilestoneMutation.mutateAsync,
    isDeleting: deleteMilestoneMutation.isPending,
    error: deleteMilestoneMutation.error,
  };
};
