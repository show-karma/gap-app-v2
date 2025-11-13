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

      const contract = await GAP.getMulticall(walletSigner);

      const revocationPayload = buildRevocationPayload(
        schemaToUse.uid,
        grantInstance.completed.uid
      );

      const tx = await contract.multiRevoke(revocationPayload);

      changeStepperStep("indexing");

      // Note: multiRevoke returns a transaction object with hash property
      // If the SDK structure changes to { tx: [{ hash }] }, update accordingly
      const txHash = tx?.hash || (tx as any)?.tx?.[0]?.hash;
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
      toast.success(MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.SUCCESS);
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
