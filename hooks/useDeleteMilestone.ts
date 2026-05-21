import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import axios from "axios";
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

interface BackendErrorBody {
  message?: string;
}

const SUPPORT_HINT = "If this looks wrong, contact support.";
const REVOCATION_RETRY_MESSAGE =
  "On-chain milestone revocation failed. Please retry; if it persists, contact support.";

// Backend exception message prefixes from
// app/modules/v2/services/milestone-on-chain-delete/write/milestone-on-chain-delete.write.service.ts.
// If the backend rewords these, the matching test cases here will fail in CI.
const BACKEND_409_ALREADY_COMPLETED = "Cannot delete milestone that is already completed";
const BACKEND_409_ALREADY_REVOKED = "Milestone is already revoked";
const BACKEND_409_NOT_FOUND = "Milestone not found";
const BACKEND_500_INSUFFICIENT_FUNDS = "insufficient funds";

export class MilestoneRevocationFailedError extends Error {
  milestoneTitle: string;

  constructor(milestoneTitle: string) {
    super(REVOCATION_RETRY_MESSAGE);
    this.name = "MilestoneRevocationFailedError";
    this.milestoneTitle = milestoneTitle;
  }
}

function asAxiosError(error: unknown): AxiosError<BackendErrorBody> | undefined {
  return axios.isAxiosError<BackendErrorBody>(error) ? error : undefined;
}

export function deleteMilestoneErrorMessage(error: unknown, milestoneTitle: string): string {
  if (error instanceof MilestoneRevocationFailedError) {
    return error.message;
  }

  const axiosError = asAxiosError(error);
  const status = axiosError?.response?.status;
  const raw = axiosError?.response?.data?.message ?? "";

  if (status === 409) {
    if (raw.startsWith(BACKEND_409_ALREADY_COMPLETED)) {
      return `"${milestoneTitle}" already has a completion and can't be deleted. Reject the completion first.`;
    }
    if (raw.startsWith(BACKEND_409_ALREADY_REVOKED)) {
      return `"${milestoneTitle}" is already deleted on-chain. Refresh the page to update the list.`;
    }
    if (raw.startsWith(BACKEND_409_NOT_FOUND)) {
      return `"${milestoneTitle}" was not found on-chain. It may have been removed already — refresh the page.`;
    }
    return raw || `"${milestoneTitle}" can't be deleted right now. ${SUPPORT_HINT}`;
  }

  if (status === 403) {
    return "You don't have permission to delete this milestone.";
  }

  if (status === 503) {
    return "The indexer couldn't read the milestone right now. Try again in a moment.";
  }

  if (status === 500 && raw.toLowerCase().includes(BACKEND_500_INSUFFICIENT_FUNDS)) {
    return "Karma admin wallet is out of gas on this chain. We've been alerted.";
  }

  if (raw) return raw;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to delete milestone.";
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
        throw new MilestoneRevocationFailedError(milestone.title);
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

      const axiosError = asAxiosError(error);
      const status = axiosError?.response?.status;
      const backendMessage = axiosError?.response?.data?.message;
      const userMessage = deleteMilestoneErrorMessage(error, milestone.title);

      mixpanel.reportEvent({
        event: "milestone:delete:failed",
        properties: {
          requestedBy: address,
          milestoneUID: milestone.uid,
          programId,
          chainID: milestone.chainId,
          // Stable axios prose keeps Mixpanel funnel grouping intact; `userMessage` ships the human copy.
          error: error?.message,
          userMessage,
          backendStatus: status,
          backendMessage,
        },
      });
      showError(userMessage);

      const isUserActionable = status === 403 || status === 409;
      if (!isUserActionable) {
        errorManager(`Failed to delete milestone "${milestone.title}"`, error, {
          milestoneUID: milestone.uid,
          milestoneTitle: milestone.title,
          backendStatus: status,
          backendMessage,
        });
      }
    },
  });

  return {
    deleteMilestone: deleteMilestoneMutation.mutate,
    deleteMilestoneAsync: deleteMilestoneMutation.mutateAsync,
    isDeleting: deleteMilestoneMutation.isPending,
    error: deleteMilestoneMutation.error,
  };
};
