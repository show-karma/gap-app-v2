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
import { retryUntilConditionMet } from "@/utilities/retries";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGrantStore } from "@/store/grant";
import { useProjectStore } from "@/store";
import toast from "react-hot-toast";
import type { Address } from "viem";
import { useOffChainRevoke } from "@/hooks/useOffChainRevoke";
import { getAttestation } from "@/services/attestations";
import type {
  IGrantResponse,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import {
  createCheckIfCompletionExists,
  getSignerAddress,
  validateGrantCompletion,
  buildRevocationPayload,
} from "@/utilities/grantCompletionHelpers";

interface UseGrantCompletionRevokeProps {
  grant: IGrantResponse;
  project: IProjectResponse;
  isOnChainAuthorized: boolean;
}

export const useGrantCompletionRevoke = ({
  grant,
  project,
  isOnChainAuthorized,
}: UseGrantCompletionRevokeProps) => {
  const [isRevoking, setIsRevoking] = useState(false);
  const { chain, address } = useAccount();
  const { switchChainAsync } = useWallet();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const { refreshGrant } = useGrantStore();
  const { performOffChainRevoke } = useOffChainRevoke();

  // Fetch attestation attester from backend database
  const fetchAttestationAttester = async (
    attestationUID: string,
    chainId: number
  ): Promise<Address> => {
    const attestation = await getAttestation(attestationUID, chainId);

    if (!attestation?.attester) {
      throw new Error(
        `Attestation not found or missing attester for UID: ${attestationUID}`
      );
    }

    return attestation.attester;
  };

  const revokeCompletion = async () => {
    if (!grant.completed || !project) {
      return;
    }

    setIsRevoking(true);
    let gapClient = gap;

    try {
      const {
        success,
        chainId: actualChainId,
        gapClient: newGapClient,
      } = await ensureCorrectChain({
        targetChainId: grant.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsRevoking(false);
        return;
      }

      gapClient = newGapClient;

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

      // Validate chainID before proceeding
      const chainID = grantInstance.completed.chainID || grantInstance.chainID;
      if (!chainID) {
        throw new Error("Chain ID not found for grant completion");
      }

      const checkIfCompletionExists = createCheckIfCompletionExists(
        grant.uid,
        refreshProject
      );

      // Check if we should use on-chain revocation
      let shouldUseOnChain = false;
      if (isOnChainAuthorized) {
        const signerAddress = await getSignerAddress(walletSigner, address);

        // Check attester early - if it doesn't match, skip on-chain attempt
        const attestationAttester = await fetchAttestationAttester(
          grantInstance.completed.uid,
          chainID
        );

        if (attestationAttester.toLowerCase() === signerAddress.toLowerCase()) {
          // Attester matches - we can proceed with on-chain revocation
          shouldUseOnChain = true;
        }
      }

      if (!shouldUseOnChain) {
        // Use off-chain revocation (either not authorized or attester doesn't match)
        await performOffChainRevoke({
          uid: grantInstance.completed.uid as `0x${string}`,
          chainID: chainID,
          checkIfExists: checkIfCompletionExists,
          onSuccess: async () => {
            await refreshGrant();
          },
          toastMessages: {
            success: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.SUCCESS,
            loading: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.LOADING,
          },
        });
      } else {
        // Proceed with on-chain revocation - set stepper now that we know it will work
        setIsStepper(true);
        try {
          validateGrantCompletion(grantInstance.completed);

          const schemaToUse = grantInstance.completed.schema;

          if (!schemaToUse) {
            throw new Error("Grant completion schema not found");
          }

          // Validate that the schema has the multiRevoke method
          if (typeof schemaToUse.multiRevoke !== "function") {
            throw new Error(
              "Grant completion schema does not support multiRevoke"
            );
          }

          const revocationPayload = buildRevocationPayload(
            schemaToUse.uid,
            grantInstance.completed.uid
          );

          const res = await schemaToUse.multiRevoke(
            walletSigner,
            revocationPayload,
            changeStepperStep
          );

          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;

          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, grantInstance.chainID),
              "POST",
              {}
            );
          }

          await checkIfCompletionExists(() => {
            changeStepperStep("indexed");
          });
          await refreshGrant();
        } catch (onChainError: unknown) {
          // On-chain revocation failed - fallback to off-chain revoke
          setIsStepper(false); // Reset stepper since we're falling back

          const success = await performOffChainRevoke({
            uid: grantInstance.completed.uid as `0x${string}`,
            chainID: chainID,
            checkIfExists: checkIfCompletionExists,
            onSuccess: async () => {
              changeStepperStep("indexed");
              await refreshGrant();
            },
            toastMessages: {
              success: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.SUCCESS,
              loading: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.LOADING,
            },
          });

          if (!success) {
            // Both methods failed - throw the original error to maintain expected behavior
            throw onChainError;
          }
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
