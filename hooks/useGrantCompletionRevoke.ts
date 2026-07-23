import { GAP } from "@show-karma/karma-gap-sdk";
import { useState } from "react";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useOffChainRevoke } from "@/hooks/useOffChainRevoke";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { useOwnerStore, useProjectStore } from "@/store";
import { useGrantStore } from "@/store/grant";
import type { Grant } from "@/types/v2/grant";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { api } from "@/utilities/api/client";
import {
  buildRevocationPayload,
  createCheckIfCompletionExists,
  validateGrantCompletion,
} from "@/utilities/grantCompletionHelpers";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";

interface UseGrantCompletionRevokeProps {
  grant: Grant;
  project: ProjectResponse;
}

/**
 * Hook for revoking grant completion attestations
 *
 * @remarks
 * Supports dual revocation paths:
 * - On-chain: For project/contract owners via multiRevoke contract
 * - Off-chain: Fallback for unauthorized users via API
 *
 * @param grant - Grant with completion to revoke
 * @param project - Parent project
 * @returns Revocation function and loading state
 */
export const useGrantCompletionRevoke = ({ grant, project }: UseGrantCompletionRevokeProps) => {
  const [isRevoking, setIsRevoking] = useState(false);
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { setupChainAndWallet } = useSetupChainAndWallet();
  const { startAttestation, showSuccess, showError, showLoading, changeStepperStep, dismiss } =
    useAttestationToast();
  const projectIdOrSlug = project?.details?.slug || project?.uid || "";
  const { refetch: refetchGrants } = useProjectGrants(projectIdOrSlug);
  const refreshGrant = useGrantStore((state) => state.refreshGrant);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isOnChainAuthorized = isProjectOwner || isContractOwner;
  const { performOffChainRevoke } = useOffChainRevoke();

  const revokeCompletion = async () => {
    if (!grant.completed || !project) {
      return;
    }

    setIsRevoking(true);
    startAttestation("Revoking grant completion...");

    try {
      // Validate chainID before proceeding
      const chainID = grant.chainID;
      if (!chainID) {
        throw new Error(
          `Chain ID not found for grant ${grant.uid}. Cannot proceed with revocation.`
        );
      }

      // Validate grant completion UID exists
      if (!grant.completed.uid) {
        throw new Error("Grant completion UID not found");
      }

      const checkIfCompletionExists = createCheckIfCompletionExists(grant.uid, projectIdOrSlug);

      if (!isOnChainAuthorized) {
        // Use off-chain revocation for users without on-chain authorization
        // No wallet connection needed for off-chain revocation. A failure now
        // throws (handled by the outer catch), so we no longer refetch and
        // report success after a rejected revoke.
        await performOffChainRevoke({
          uid: grant.completed.uid as `0x${string}`,
          chainID: chainID,
          checkIfExists: checkIfCompletionExists,
          toastMessages: {
            success: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.SUCCESS,
            loading: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.LOADING,
          },
        });
        changeStepperStep("indexed");
        await refetchGrants();
        await refreshGrant();
        return;
      }

      // On-chain path requires wallet connection
      const setup = await setupChainAndWallet({
        targetChainId: chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!setup) {
        throw new Error("WALLET_SETUP_FAILED");
      }

      const { gapClient, walletSigner } = setup;
      const instanceProject = await gapClient.fetch.projectById(project?.uid);
      const grantInstance = instanceProject?.grants.find(
        (item) => item.uid.toLowerCase() === grant.uid.toLowerCase()
      );

      if (!grantInstance || !grantInstance.completed) {
        throw new Error("Grant completion not found");
      }

      // Authorized AND attester matches - proceed with on-chain revocation
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

        changeStepperStep("confirmed");

        const txHash = res?.transactionHash as `0x${string}`;
        if (txHash) {
          await api.post(INDEXER.ATTESTATION_LISTENER(txHash, grantInstance.chainID), {});
        }
        changeStepperStep("indexing");

        await checkIfCompletionExists(() => {
          changeStepperStep("indexed");
        });
        await refetchGrants();
        await refreshGrant();
        showSuccess(MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.SUCCESS);
      } catch (onChainError) {
        // Fallback to off-chain revocation if on-chain fails
        dismiss(); // Reset toast since we're falling back

        showLoading("On-chain revocation unavailable. Attempting off-chain revocation...");

        try {
          await performOffChainRevoke({
            uid: grantInstance.completed.uid as `0x${string}`,
            chainID: chainID,
            checkIfExists: checkIfCompletionExists,
            toastMessages: {
              success: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.SUCCESS,
              loading: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.LOADING,
            },
          });
          // Only reached when the off-chain revoke was accepted.
          changeStepperStep("indexed");
          await refetchGrants();
          await refreshGrant();
        } catch {
          // Both methods failed — surface the ORIGINAL on-chain error so its
          // context isn't lost behind the off-chain fallback's message.
          throw onChainError;
        }
      }
    } catch (error: unknown) {
      // Setup failures have already been surfaced by setupChainAndWallet —
      // skip the duplicate generic toast.
      if (error instanceof Error && error.message === "WALLET_SETUP_FAILED") {
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.ERROR;

      showError(errorMessage);
      errorManager(MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.ERROR, error, {
        error: errorMessage,
      });
    } finally {
      setIsRevoking(false);
      dismiss();
    }
  };

  return {
    revokeCompletion,
    isRevoking,
  };
};
