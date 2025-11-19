import { useState } from "react";
import { useAccount } from "wagmi";
import { useWallet } from "@/hooks/useWallet";
import { useGap } from "@/hooks/useGap";
import { useStepper } from "@/store/modals/txStepper";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGrantStore } from "@/store/grant";
import { useProjectStore } from "@/store";
import { useOwnerStore } from "@/store";
import { useOffChainRevoke } from "@/hooks/useOffChainRevoke";
import toast from "react-hot-toast";
import type {
  IGrantResponse,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { GAP } from "@show-karma/karma-gap-sdk";
import {
  createCheckIfCompletionExists,
  validateGrantCompletion,
  buildRevocationPayload,
} from "@/utilities/grantCompletionHelpers";

interface UseGrantCompletionRevokeProps {
  grant: IGrantResponse;
  project: IProjectResponse;
}

export const useGrantCompletionRevoke = ({
  grant,
  project,
}: UseGrantCompletionRevokeProps) => {
  const [isRevoking, setIsRevoking] = useState(false);
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const { refreshGrant } = useGrantStore();
  const { isProjectOwner } = useProjectStore();
  const { isOwner: isContractOwner } = useOwnerStore();
  const isOnChainAuthorized = isProjectOwner || isContractOwner;
  const { performOffChainRevoke } = useOffChainRevoke();

  const revokeCompletion = async () => {
    if (!grant.completed || !project) {
      return;
    }

    setIsRevoking(true);

    try {
      // Validate chainID before proceeding
      const chainID = grant.completed.chainID || grant.chainID;
      if (!chainID) {
        throw new Error(`Chain ID not found for grant ${grant.uid}. Cannot proceed with revocation.`);
      }

      // Validate grant completion UID exists
      if (!grant.completed.uid) {
        throw new Error("Grant completion UID not found");
      }

      const checkIfCompletionExists = createCheckIfCompletionExists(
        grant.uid,
        refreshProject
      );

      if (!isOnChainAuthorized) {
        // Use off-chain revocation for users without on-chain authorization
        // No wallet connection needed for off-chain revocation
        setIsStepper(true);
        await performOffChainRevoke({
          uid: grant.completed.uid as `0x${string}`,
          chainID: chainID,
          checkIfExists: checkIfCompletionExists,
          onSuccess: () => {
            changeStepperStep("indexed");
          },
          onError: (error) => {
            setIsStepper(false);
            console.error("Off-chain revocation failed:", error);
          },
          toastMessages: {
            success: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.SUCCESS,
            loading: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.LOADING,
          },
        });
        await refreshGrant();
        return;
      }

      // On-chain path requires wallet connection
      const {
        success,
        chainId: actualChainId,
        gapClient: newGapClient,
      } = await ensureCorrectChain({
        targetChainId: chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsRevoking(false);
        return;
      }

      const gapClient = newGapClient;

      const { walletClient, error } = await safeGetWalletClient(actualChainId);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }

      const walletSigner = await walletClientToSigner(walletClient);
      const instanceProject = await gapClient.fetch.projectById(project?.uid);
      const grantInstance = instanceProject?.grants.find(
        (item) => item.uid.toLowerCase() === grant.uid.toLowerCase()
      );

      if (!grantInstance || !grantInstance.completed) {
        throw new Error("Grant completion not found");
      }

      // Authorized AND attester matches - proceed with on-chain revocation
      setIsStepper(true);
      validateGrantCompletion(grantInstance.completed);

      const schemaToUse = grantInstance.completed.schema;

      if (!grantInstance.completed.schema) {
        throw new Error("Grant completion schema not found");
      }

      if (typeof schemaToUse.multiRevoke !== "function") {
        throw new Error("Grant completion schema does not support multiRevoke");
      }

      try {
        const revocationPayload = buildRevocationPayload(
          schemaToUse.uid,
          grantInstance.completed.uid
        );
        
        const multicallContract = await GAP.getMulticall(walletSigner);
        const tx = await multicallContract.multiRevoke(revocationPayload);
        const res = await tx.wait();

        changeStepperStep("pending");

        const txHash = res?.transactionHash as `0x${string}`;
        if (txHash) {
          await fetchData(
            INDEXER.ATTESTATION_LISTENER(txHash, grantInstance.chainID),
            "POST",
            {}
          );
        }
        changeStepperStep("indexing");

        await checkIfCompletionExists(() => {
          changeStepperStep("indexed");
        });
        await refreshGrant();
        toast.success(MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.SUCCESS);
      } catch (onChainError: any) {
        // Fallback to off-chain revocation if on-chain fails
        setIsStepper(false); // Reset stepper since we're falling back

        toast("On-chain revocation unavailable. Attempting off-chain revocation...");

        const success = await performOffChainRevoke({
          uid: grantInstance.completed.uid as `0x${string}`,
          chainID: chainID,
          checkIfExists: checkIfCompletionExists,
          onSuccess: () => {
            changeStepperStep("indexed");
          },
          onError: (error) => {
            setIsStepper(false);
            console.error("Fallback off-chain revocation failed:", error);
          },
          toastMessages: {
            success: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.SUCCESS,
            loading: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.LOADING,
          },
        });

        if (success) {
          await refreshGrant();
        } else {
          // Both methods failed - throw the original error
          throw onChainError;
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.ERROR;

      toast.error(errorMessage);
      errorManager(MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.ERROR, error, {
        error: errorMessage,
      });
    } finally {
      setIsRevoking(false);
      setIsStepper(false);
    }
  };

  return {
    revokeCompletion,
    isRevoking,
  };
};
