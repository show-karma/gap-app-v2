"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { sanitizeObject } from "@/utilities/sanitize";

interface UseCompleteOnChainMilestoneParams {
  projectUID: string;
  programId: string;
}

interface CompleteVars {
  milestone: GrantMilestoneWithCompletion;
  reason: string;
}

const normalizeProgramId = (id: string): string => (id.includes("_") ? id.split("_")[0] : id);

export function useCompleteOnChainMilestone({
  projectUID,
  programId,
}: UseCompleteOnChainMilestoneParams) {
  const queryClient = useQueryClient();
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { setupChainAndWallet, isSmartWalletReady } = useSetupChainAndWallet();
  const { startAttestation, showSuccess, showError, changeStepperStep, dismiss } =
    useAttestationToast();
  const [completingUID, setCompletingUID] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ milestone, reason }: CompleteVars) => {
      setCompletingUID(milestone.uid);
      startAttestation("Completing milestone...");

      const setup = await setupChainAndWallet({
        targetChainId: Number(milestone.chainId),
        currentChainId: chain?.id,
        switchChainAsync,
      });
      if (!setup) {
        throw new Error("Failed to switch chain or connect wallet");
      }

      const { gapClient, walletSigner } = setup;

      const fetchedProject = await gapClient.fetch.projectById(projectUID as `0x${string}`);
      if (!fetchedProject) {
        throw new Error("Project not found on-chain");
      }

      const normalizedTarget = normalizeProgramId(programId);
      const grantInstance = fetchedProject.grants.find((g) => {
        const stored = g.details?.programId;
        return stored ? normalizeProgramId(stored) === normalizedTarget : false;
      });
      if (!grantInstance) {
        throw new Error("Grant not found for this program");
      }

      const milestoneInstance = grantInstance.milestones?.find(
        (m) => m.uid?.toLowerCase() === milestone.uid.toLowerCase()
      );
      if (!milestoneInstance) {
        throw new Error("Milestone not found on-chain");
      }

      const completionData = sanitizeObject({
        reason,
        proofOfWork: "",
        type: "completed",
      });

      const result = await milestoneInstance.complete(
        walletSigner,
        completionData,
        changeStepperStep
      );

      changeStepperStep("indexing");
      const txHash = result?.tx?.[0]?.hash;
      if (txHash) {
        await fetchData(
          INDEXER.ATTESTATION_LISTENER(txHash, Number(milestone.chainId)),
          "POST",
          {}
        );
      }
      changeStepperStep("indexed");
    },
    onSuccess: async () => {
      showSuccess("Milestone completed successfully!");
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(projectUID, programId),
      });
    },
    onError: (error: unknown) => {
      const err = error as { message?: string; code?: number };
      if (err?.message?.includes("User rejected") || err?.code === 4001) {
        toast.error("Completion cancelled");
      } else {
        showError("Failed to complete milestone");
        errorManager("Error completing on-chain milestone from funding application", error, {
          projectUID,
          programId,
        });
      }
    },
    onSettled: () => {
      setCompletingUID(null);
      dismiss();
    },
  });

  return {
    completeMilestone: mutation.mutateAsync,
    isPending: mutation.isPending,
    completingUID,
    isGaslessReady: isSmartWalletReady,
  };
}
