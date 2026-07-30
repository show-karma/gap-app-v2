import { GapContract } from "@show-karma/karma-gap-sdk/core/class/contract/GapContract";
import { MilestoneCompleted } from "@show-karma/karma-gap-sdk/core/class/types/attestations";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useMixpanel } from "@/hooks/useMixpanel";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import type {
  GrantMilestoneWithCompletion,
  ProjectGrantMilestonesResponse,
} from "@/services/milestones";
import { notifyIndexer } from "@/utilities/indexer-notification";
import { requireMilestoneRecipient } from "@/utilities/milestones/attestationIdentity";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { sanitizeObject } from "@/utilities/sanitize";

// Thrown when wallet/chain setup does not complete (user aborted, or a
// preparation failure). `setupChainAndWallet` already surfaces the reason
// centrally, so onError must roll back the optimistic update WITHOUT
// re-toasting or re-reporting it.
class ChainSetupAbortedError extends Error {
  constructor() {
    super("Wallet setup was cancelled");
    this.name = "ChainSetupAbortedError";
  }
}

interface UseMilestoneCancellationParams {
  projectId: string;
  programId: string;
  onSuccess?: () => void;
}

interface CancelArgs {
  milestone: GrantMilestoneWithCompletion;
  reason?: string;
}

interface UncancelArgs {
  milestone: GrantMilestoneWithCompletion;
}

export const useMilestoneCancellation = ({
  projectId,
  programId,
  onSuccess,
}: UseMilestoneCancellationParams) => {
  const queryClient = useQueryClient();
  const { address, chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { setupChainAndWallet } = useSetupChainAndWallet();
  const { showError, showSuccess, showLoading, dismiss } = useAttestationToast();
  const { mixpanel } = useMixpanel();

  const queryKey = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(projectId, programId);

  const notifyAndInvalidate = async (txHash: string | null | undefined, chainId: number) => {
    // Best-effort nudge — the indexer's own chain listener picks the tx up
    // regardless, so a failure must not abort a flow whose tx already landed.
    // `notifyIndexer` REPORTS that failure; the inline swallow it replaced left
    // a failed nudge completely invisible.
    await notifyIndexer({ txHash: txHash ?? undefined, chainId });

    await queryClient.invalidateQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey: ["reportMilestones"] });
    await queryClient.invalidateQueries({ queryKey: ["pendingVerificationMilestones"] });
  };

  const cancelMutation = useMutation({
    mutationFn: async ({ milestone, reason }: CancelArgs) => {
      if (
        milestone.completionDetails ||
        milestone.verificationDetails ||
        milestone.fundingApplicationCompletion
      ) {
        throw new Error(
          "This milestone has already been completed or verified and cannot be cancelled."
        );
      }
      if (milestone.status === "cancelled" || milestone.cancellation != null) {
        throw new Error("This milestone is already cancelled.");
      }
      // The on-chain recipient comes straight from the V2 milestone payload —
      // validated BEFORE the wallet is touched, so a legacy row without one
      // stops here instead of prompting for a signature it can't use.
      const recipient = requireMilestoneRecipient(milestone);

      showLoading("Cancelling milestone...");

      const setup = await setupChainAndWallet({
        targetChainId: +milestone.chainId,
        currentChainId: chain?.id,
        switchChainAsync,
      });
      if (!setup) throw new ChainSetupAbortedError();

      const { gapClient, walletSigner } = setup;
      const schema = gapClient.findSchema("MilestoneCompleted");

      const cancellationAttestation = new MilestoneCompleted({
        data: sanitizeObject({ type: "cancelled", reason: reason || "", proofOfWork: "" }),
        refUID: milestone.uid as Hex,
        schema,
        recipient,
      });

      const payload = await cancellationAttestation.payloadFor(0);
      const result = await GapContract.multiAttest(walletSigner, [payload]);
      const txHash = result?.tx?.[0]?.hash;

      await notifyAndInvalidate(txHash, milestone.chainId);
      return { txHash };
    },
    onMutate: async ({ milestone, reason }: CancelArgs) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<ProjectGrantMilestonesResponse | null>(
        queryKey
      );
      queryClient.setQueryData<ProjectGrantMilestonesResponse | null>(queryKey, (old) => {
        if (!old?.grantMilestones) return old;
        return {
          ...old,
          grantMilestones: old.grantMilestones.map((m) =>
            m.uid === milestone.uid
              ? {
                  ...m,
                  status: "cancelled",
                  cancellation: {
                    uid: "",
                    cancelledBy: address || "",
                    cancelledAt: null,
                    reason: reason || null,
                  },
                }
              : m
          ),
        };
      });
      return { previousData };
    },
    onSuccess: (_result, { milestone }) => {
      mixpanel.reportEvent({
        event: "milestone:cancel:success",
        properties: { requestedBy: address, milestoneUID: milestone.uid, programId },
      });
      showSuccess("Milestone cancelled");
      onSuccess?.();
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previousData) queryClient.setQueryData(queryKey, context.previousData);
      dismiss();
      if (error instanceof ChainSetupAbortedError) return;
      showError(error.message || "Failed to cancel milestone");
      errorManager("Failed to cancel milestone", error);
    },
  });

  const uncancelMutation = useMutation({
    mutationFn: async ({ milestone }: UncancelArgs) => {
      const cancellationUID = milestone.cancellation?.uid;
      if (!cancellationUID) {
        throw new Error("No active cancellation found to revoke. Refresh and try again.");
      }
      showLoading("Un-cancelling milestone...");

      const setup = await setupChainAndWallet({
        targetChainId: +milestone.chainId,
        currentChainId: chain?.id,
        switchChainAsync,
      });
      if (!setup) throw new ChainSetupAbortedError();
      const { gapClient, walletSigner } = setup;
      const schema = gapClient.findSchema("MilestoneCompleted");

      const result = await GapContract.multiRevoke(walletSigner, [
        {
          schema: schema.uid as Hex,
          data: [{ uid: cancellationUID as Hex, value: 0n }],
        },
      ]);
      const txHash = result?.tx?.[0]?.hash;

      await notifyAndInvalidate(txHash, milestone.chainId);
      return { txHash };
    },
    onMutate: async ({ milestone }: UncancelArgs) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<ProjectGrantMilestonesResponse | null>(
        queryKey
      );
      queryClient.setQueryData<ProjectGrantMilestonesResponse | null>(queryKey, (old) => {
        if (!old?.grantMilestones) return old;
        return {
          ...old,
          grantMilestones: old.grantMilestones.map((m) =>
            m.uid === milestone.uid ? { ...m, status: "pending", cancellation: null } : m
          ),
        };
      });
      return { previousData };
    },
    onSuccess: (_result, { milestone }) => {
      mixpanel.reportEvent({
        event: "milestone:uncancel:success",
        properties: { requestedBy: address, milestoneUID: milestone.uid, programId },
      });
      showSuccess("Milestone restored");
      onSuccess?.();
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previousData) queryClient.setQueryData(queryKey, context.previousData);
      dismiss();
      if (error instanceof ChainSetupAbortedError) return;
      showError(error.message || "Failed to un-cancel milestone");
      errorManager("Failed to un-cancel milestone", error);
    },
  });

  return {
    cancelMilestone: cancelMutation.mutateAsync,
    uncancelMilestone: uncancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
    isUncancelling: uncancelMutation.isPending,
  };
};
