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
 * On-chain milestone deletion (revocation of the `Milestone` attestation
 * via `MilestoneCanceled`) is not yet wired into the SDK + indexer
 * pipeline — that work is tracked under the Phase 3 follow-up (DEV-234).
 *
 * Until the attestation flow ships, this hook fails fast with a clear
 * "not available yet" error rather than silently pretending success.
 * The earlier behaviour (return success without doing anything) showed
 * the milestone disappear from the UI optimistically and then reappear
 * on the next refetch, which was indistinguishable from a backend bug.
 *
 * Callers should keep the integration in place — once the on-chain
 * delete attestation lands, the mutationFn body is the only thing that
 * needs to change.
 */
export const DELETE_MILESTONE_NOT_AVAILABLE_MESSAGE =
  "Milestone deletion is being migrated to on-chain attestations and isn't available yet. Reach out to the team if you need a milestone removed.";

export const useDeleteMilestone = ({
  projectId,
  programId,
  onSuccess,
}: UseDeleteMilestoneParams) => {
  const queryClient = useQueryClient();
  const { showError } = useAttestationToast();

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (_milestone: GrantMilestoneWithCompletion) => {
      throw new Error(DELETE_MILESTONE_NOT_AVAILABLE_MESSAGE);
    },
    onMutate: async (milestone) => {
      // Snapshot the previous value so the (now always-firing) onError
      // restores the cache cleanly — without this the consumer would
      // see the row vanish before the toast appears.
      const queryKey = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(projectId, programId);
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<ProjectGrantMilestonesResponse | null>(
        queryKey
      );
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
    onSuccess: () => {
      // Unreachable while mutationFn always throws — kept so the wiring
      // is correct the moment the on-chain delete attestation lands.
      onSuccess?.();
    },
    onError: (error: Error, milestone, context) => {
      const queryKey = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(projectId, programId);
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      showError(error?.message || "Failed to delete milestone");
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
