"use client";

import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { PAGES } from "@/utilities/pages";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import {
  IGrantResponse,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import Link from "next/link";
import type { FC } from "react";
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
import toast from "react-hot-toast";
import type { Address } from "viem";
import { useOffChainRevoke } from "@/hooks/useOffChainRevoke";
import { Spinner } from "@/components/ui/spinner";
import { getAttestation } from "@/services/attestations";

interface GrantCompleteProps {
  project: IProjectResponse;
  grant: IGrantResponse;
  text?: string;
}

export const GrantCompleteButton: FC<GrantCompleteProps> = ({
  grant,
  project,
  text = "Mark as Complete",
}) => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const isAuthorized = isOwner || isProjectAdmin || isCommunityAdmin;
  const [isRevoking, setIsRevoking] = useState(false);
  const { chain, address } = useAccount();
  const { switchChainAsync } = useWallet();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const { isProjectOwner } = useProjectStore();
  const { isOwner: isContractOwner } = useOwnerStore();
  const isOnChainAuthorized = isProjectOwner || isContractOwner;
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

  const revokeGrantCompletion = async () => {
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

      const checkIfCompletionExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            const fetchedProject = await refreshProject();
            // If project doesn't exist or has no grants, consider completion as removed
            if (!fetchedProject || !fetchedProject.grants) {
              return true;
            }
            const foundGrant = fetchedProject.grants.find(
              (g) => g.uid === grant.uid
            );
            // If grant doesn't exist, consider completion as removed
            // Otherwise check if completion exists
            return !foundGrant?.completed;
          },
          () => {
            callbackFn?.();
          }
        );
      };

      // Check if we should use on-chain revocation
      let shouldUseOnChain = false;
      if (isOnChainAuthorized) {
        // Get signer address first
        let signerAddress: Address;
        if (walletSigner && typeof walletSigner.getAddress === "function") {
          signerAddress = await walletSigner.getAddress();
        } else if (address) {
          signerAddress = address;
        } else {
          throw new Error("Unable to get signer address");
        }

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
          // Verify revocable status
          if (grantInstance.completed.schema?.revocable !== true) {
            throw new Error("Grant completion is not revocable");
          }

          // Verify not already revoked
          if (grantInstance.completed.revoked === true) {
            throw new Error("Grant completion already revoked");
          }

          // Use grantInstance.completed.schema directly (as recommended by SDK)
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

          // Use the schema UID directly from schemaToUse after validation
          const schemaUID = schemaToUse.uid;
          if (!schemaUID) {
            throw new Error("Grant completion schema UID not found");
          }

          const revocationPayload = [
            {
              schemaId: schemaUID,
              uid: grantInstance.completed.uid,
            },
          ];

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

  if (grant.completed) {
    return (
      <button
        onClick={revokeGrantCompletion}
        disabled={isRevoking || !isAuthorized}
        aria-label="Revoke grant completion"
        aria-busy={isRevoking}
        aria-disabled={isRevoking || !isAuthorized}
        className="group relative flex flex-row items-center justify-center gap-2 rounded-md border border-emerald-600 bg-green-100 px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:border-red-600 hover:bg-red-100 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={isAuthorized ? "Click to revoke grant completion" : undefined}
      >
        {isRevoking ? (
          <>
            <Spinner className="h-5 w-5" />
            <span>Revoking...</span>
          </>
        ) : (
          <>
            <span className="group-hover:hidden">Marked as complete</span>
            <span className="hidden group-hover:inline">Revoke completion</span>
            <div className="h-5 w-5">
              <CheckCircleIcon className="h-5 w-5 group-hover:hidden" />
              <XCircleIcon className="h-5 w-5 hidden group-hover:block" />
            </div>
          </>
        )}
      </button>
    );
  }
  if (!isAuthorized || !project) return null;
  return (
    <Link
      href={PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
        project.details?.data.slug || project.uid,
        grant.uid,
        "complete-grant"
      )}
      className="hover:opacity-75 flex flex-row items-center justify-center gap-2 rounded-md  bg-[#17B26A] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#17B26A]"
    >
      {text}
      <div className="h-5 w-5">
        <CheckCircleIcon className="h-5 w-5" />
      </div>
    </Link>
  );
};
