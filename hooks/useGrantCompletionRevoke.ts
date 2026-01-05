import { GAP } from "@show-karma/karma-gap-sdk";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGap } from "@/hooks/useGap";
import { useOffChainRevoke } from "@/hooks/useOffChainRevoke";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { useOwnerStore, useProjectStore } from "@/store";
import { useGrantStore } from "@/store/grant";
import { useStepper } from "@/store/modals/txStepper";
import type { Grant } from "@/types/v2/grant";
import type { Project as ProjectResponse } from "@/types/v2/project";
import fetchData from "@/utilities/fetchData";
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
  const { gap } = useGap();
  const { setupChainAndWallet } = useSetupChainAndWallet();
  const { changeStepperStep, setIsStepper } = useStepper();
  const projectIdOrSlug = project?.details?.slug || project?.uid || "";
  const { refetch: refetchGrants } = useProjectGrants(projectIdOrSlug);
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
        // No wallet connection needed for off-chain revocation
        setIsStepper(true);
        await performOffChainRevoke({
          uid: grant.completed.uid as `0x${string}`,
          chainID: chainID,
          checkIfExists: checkIfCompletionExists,
          onSuccess: () => {
            changeStepperStep("indexed");
            setIsStepper(false);
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
        setIsRevoking(false);
        return;
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
          await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, grantInstance.chainID), "POST", {});
        }
        changeStepperStep("indexing");

        await checkIfCompletionExists(() => {
          changeStepperStep("indexed");
        });
        await refetchGrants();
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
            setIsStepper(false);
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
          await refetchGrants();
          await refreshGrant();
        } else {
          // Both methods failed - throw the original error
          throw onChainError;
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.ERROR;

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
