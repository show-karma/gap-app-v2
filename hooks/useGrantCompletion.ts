import { useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { useWallet } from "@/hooks/useWallet";
import { useStepper } from "@/store/modals/txStepper";
import type { GrantResponse } from "@/types/v2/grant";
import { pollForGrantCompletion } from "@/utilities/attestation-polling";
// Import the utilities we created
import { setupChainAndWallet } from "@/utilities/chain-wallet-setup";
import { getSDKGrantInstance } from "@/utilities/grant-helpers";
import { notifyIndexerForGrant } from "@/utilities/indexer-notification";
import { MESSAGES } from "@/utilities/messages";
import { sanitizeObject } from "@/utilities/sanitize";

interface UseGrantCompletionParams {
  onComplete?: () => void;
}

interface UseGrantCompletionReturn {
  completeGrant: (grant: GrantResponse, project: { uid: string }) => Promise<void>;
  isCompleting: boolean;
}

/**
 * Hook for handling grant completion workflow
 * Uses reusable utilities for chain setup, polling, and indexer notification
 *
 * @param params - Hook parameters
 * @returns Object with completeGrant function and isCompleting state
 *
 * @example
 * ```typescript
 * const { completeGrant, isCompleting } = useGrantCompletion({
 *   onComplete: () => {
 *     console.log('Grant completed!');
 *     refetch();
 *   },
 * });
 *
 * // In your component
 * const handleComplete = () => {
 *   completeGrant(grant, project);
 * };
 * ```
 */
export const useGrantCompletion = ({
  onComplete,
}: UseGrantCompletionParams): UseGrantCompletionReturn => {
  const [isCompleting, setIsCompleting] = useState(false);
  const { chain, address } = useAccount();
  const { switchChainAsync } = useWallet();
  const { changeStepperStep, setIsStepper } = useStepper();

  const completeGrant = async (grant: GrantResponse, project: { uid: string }) => {
    if (!address || !project || !grant) {
      toast.error("Please connect your wallet");
      return;
    }

    setIsCompleting(true);
    setIsStepper(true);

    try {
      changeStepperStep("preparing");

      // Step 1: Setup chain and wallet (using utility)
      const setup = await setupChainAndWallet({
        targetChainId: grant.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!setup) {
        toast.error("Please switch to the correct network and try again");
        return;
      }

      const { gapClient, walletSigner } = setup;

      // Step 2: Fetch SDK grant instance for attestation (using utility)
      const grantInstance = await getSDKGrantInstance({
        gapClient,
        projectUid: project.uid,
        grantUid: grant.uid,
      });

      // Step 3: Execute grant completion
      const sanitizedGrantComplete = sanitizeObject({
        title: "",
        text: "",
      });

      const result = await grantInstance.complete(
        walletSigner,
        sanitizedGrantComplete,
        changeStepperStep
      );

      changeStepperStep("indexing");

      // Step 4: Notify indexer (using utility)
      const txHash = result?.tx[0]?.hash ?? undefined;
      await notifyIndexerForGrant(txHash, grant.chainID, project.uid);

      // Step 5: Poll for completion (using utility)
      await pollForGrantCompletion({
        gapClient,
        projectUid: project.uid,
        grantUid: grant.uid,
      });

      changeStepperStep("indexed");
      toast.success(MESSAGES.GRANT.MARK_AS_COMPLETE.SUCCESS);
      onComplete?.();
    } catch (error: any) {
      console.error("Error completing grant:", error);

      // User cancelled
      if (error?.message?.includes("User rejected") || error?.code === 4001) {
        toast.error("Grant completion cancelled");
      } else {
        toast.error(MESSAGES.GRANT.MARK_AS_COMPLETE.ERROR);
        errorManager("Error completing grant", error, {
          grantUID: grant.uid,
          address,
        });
      }
    } finally {
      setIsCompleting(false);
      setIsStepper(false);
    }
  };

  return {
    completeGrant,
    isCompleting,
  };
};
