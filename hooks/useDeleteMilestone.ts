import { useMutation, useQueryClient } from "@tanstack/react-query";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useAuth } from "@/hooks/useAuth";
import { useMixpanel } from "@/hooks/useMixpanel";
import type {
  GrantMilestoneWithCompletion,
  ProjectGrantMilestonesResponse,
} from "@/services/milestones";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseDeleteMilestoneParams {
  projectId: string;
  programId: string;
  onSuccess?: () => void;
}

interface DeleteMilestoneResponse {
  milestoneUID: string;
  revocationSuccess: boolean;
  revocationTxHash?: string;
}

export const useDeleteMilestone = ({
  projectId,
  programId,
  onSuccess,
}: UseDeleteMilestoneParams) => {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useAttestationToast();
  const { address } = useAuth();
  const { mixpanel } = useMixpanel();

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (milestone: GrantMilestoneWithCompletion) => {
      if (!milestone.chainId) {
        throw new Error("Cannot delete milestone: missing chainId");
      }
      if (!programId) {
        throw new Error("Cannot delete milestone: missing programId");
      }

      // The on-chain attester for the revocation is always the Karma admin
      // wallet, so the only audit trail of who *requested* the delete lives
      // in product analytics. Tracking before the network call captures
      // intent even if the request fails downstream.
      mixpanel.reportEvent({
        event: "milestone:delete:requested",
        properties: {
          requestedBy: address,
          milestoneUID: milestone.uid,
          milestoneTitle: milestone.title,
          programId,
          chainID: milestone.chainId,
        },
      });

      const apiClient = createAuthenticatedApiClient(envVars.NEXT_PUBLIC_GAP_INDEXER_URL, 60000);

      const response = await apiClient.delete<DeleteMilestoneResponse>(
        INDEXER.MILESTONE.ON_CHAIN_DELETE(milestone.uid),
        { data: { chainID: milestone.chainId } }
      );

      if (!response.data.revocationSuccess) {
        throw new Error(
          "On-chain milestone revocation failed. Please retry; if it persists, contact support."
        );
      }

      return response.data;
    },
    onMutate: async (milestone) => {
      const queryKey = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(projectId, programId);
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<ProjectGrantMilestonesResponse | null>(
        queryKey
      );
      queryClient.setQueryData<ProjectGrantMilestonesResponse | null>(queryKey, (oldData) => {
        if (!oldData?.grantMilestones || !Array.isArray(oldData.grantMilestones)) {
          return oldData;
        }
        return {
          ...oldData,
          grantMilestones: oldData.grantMilestones.filter((m) => m?.uid !== milestone.uid),
        };
      });
      return { previousData };
    },
    onSuccess: (data, milestone) => {
      mixpanel.reportEvent({
        event: "milestone:delete:success",
        properties: {
          requestedBy: address,
          milestoneUID: milestone.uid,
          programId,
          chainID: milestone.chainId,
          revocationTxHash: data.revocationTxHash,
        },
      });
      showSuccess("Milestone deleted");
      onSuccess?.();
    },
    onError: (error: Error, milestone, context) => {
      const queryKey = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(projectId, programId);
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      mixpanel.reportEvent({
        event: "milestone:delete:failed",
        properties: {
          requestedBy: address,
          milestoneUID: milestone.uid,
          programId,
          chainID: milestone.chainId,
          error: error?.message,
        },
      });
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
