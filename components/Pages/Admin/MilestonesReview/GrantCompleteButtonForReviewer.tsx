"use client";

import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import type { IGrantResponse, IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useState } from "react";
import { useGap } from "@/hooks/useGap";
import { useAccount } from "wagmi";
import { useWallet } from "@/hooks/useWallet";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { sanitizeObject } from "@/utilities/sanitize";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { useStepper } from "@/store/modals/txStepper";
import toast from "react-hot-toast";
import { Hex } from "viem";
import type { FC } from "react";

interface GrantCompleteButtonForReviewerProps {
  project: IProjectResponse;
  grant: IGrantResponse;
  text?: string;
  onComplete?: () => void;
}

export const GrantCompleteButtonForReviewer: FC<GrantCompleteButtonForReviewerProps> = ({
  grant,
  project,
  text = "Mark grant as complete",
  onComplete,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { gap } = useGap();
  const { chain, address } = useAccount();
  const { switchChainAsync } = useWallet();
  const { changeStepperStep, setIsStepper } = useStepper();

  // Show "Marked as complete" if grant is already completed
  if (grant.completed) {
    return (
      <div className="flex flex-row items-center justify-center gap-2 rounded-md border border-emerald-600 bg-green-100 px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:bg-green-100">
        Marked as complete
        <div className="h-5 w-5">
          <CheckCircleIcon className="h-5 w-5" />
        </div>
      </div>
    );
  }

  // Only show button if grant is not completed
  if (!project) return null;

  const handleMarkAsComplete = async () => {
    if (!gap || !project || !grant) return;

    setIsLoading(true);
    setIsStepper(true);

    try {
      let gapClient = gap;
      let actualChainId: number;

      // Step 1: Ensure correct chain
      try {
        const { success, chainId, gapClient: newGapClient } = await ensureCorrectChain({
          targetChainId: grant.chainID,
          currentChainId: chain?.id,
          switchChainAsync,
        });

        if (!success) {
          toast.error("Please switch to the correct network and try again");
          setIsLoading(false);
          setIsStepper(false);
          return;
        }

        actualChainId = chainId;
        gapClient = newGapClient;
      } catch (error) {
        errorManager("Failed to switch to correct chain", error, {
          targetChainId: grant.chainID,
          currentChainId: chain?.id,
        });
        toast.error("Failed to switch networks. Please switch manually in your wallet.");
        setIsLoading(false);
        setIsStepper(false);
        return;
      }

      // Step 2: Connect wallet
      let walletClient;
      try {
        const result = await safeGetWalletClient(actualChainId);
        if (result.error || !result.walletClient || !gapClient) {
          throw new Error("Failed to connect to wallet", { cause: result.error });
        }
        walletClient = result.walletClient;
      } catch (error) {
        errorManager("Wallet connection failed", error, { chainId: actualChainId });
        toast.error("Failed to connect wallet. Please check that your wallet is unlocked.");
        setIsLoading(false);
        setIsStepper(false);
        return;
      }

      // Step 3: Execute transaction
      try {
        const walletSigner = await walletClientToSigner(walletClient);
        const fetchedProject = await gapClient.fetch.projectById(project.uid);
        
        if (!fetchedProject) {
          const errorMsg = "Failed to fetch project data. The project may have been deleted or you may not have permission to access it.";
          errorManager(
            "Project not found when completing grant",
            new Error(errorMsg),
            { projectUID: project.uid, grantUID: grant.uid, address }
          );
          toast.error(errorMsg);
          setIsLoading(false);
          setIsStepper(false);
          return;
        }

        const grantInstance = fetchedProject.grants.find(
          (g) => g.uid.toLowerCase() === grant.uid.toLowerCase()
        );

        if (!grantInstance) {
          const errorMsg = "Grant not found in project. Please refresh the page and try again.";
          errorManager(
            "Grant instance not found in fetched project",
            new Error(errorMsg),
            {
              projectUID: project.uid,
              grantUID: grant.uid,
              availableGrants: fetchedProject.grants.map(g => g.uid),
              address
            }
          );
          toast.error(errorMsg);
          setIsLoading(false);
          setIsStepper(false);
          return;
        }

        // Complete grant with minimal data (no form fields required for milestone reviewers)
        const sanitizedGrantComplete = sanitizeObject({
          title: "",
          text: "",
        });

        changeStepperStep("preparing");
        await grantInstance
          .complete(walletSigner, sanitizedGrantComplete, changeStepperStep)
          .then(async (res) => {
            const maxRetries = 40; // 60 seconds total (40 * 1.5s)
            let retries = maxRetries;
            changeStepperStep("indexing");
            const txHash = res?.tx[0]?.hash;
            
            if (txHash) {
              await fetchData(
                INDEXER.ATTESTATION_LISTENER(txHash, grant.chainID as number),
                "POST",
                {}
              );
            }

            while (retries > 0) {
              const fetchedProject = await gapClient!.fetch
                .projectById(project.uid as Hex)
                .catch((err) => {
                  errorManager("Error polling for grant completion", err, {
                    grantUID: grant.uid,
                    retriesRemaining: retries
                  });
                  return null;
                });

              const completedGrant = fetchedProject?.grants?.find(
                (g) => g.uid === grant.uid
              );

              if (completedGrant && completedGrant.completed) {
                changeStepperStep("indexed");
                toast.success(MESSAGES.GRANT.MARK_AS_COMPLETE.SUCCESS);
                setIsLoading(false);
                setIsStepper(false);
                onComplete?.();
                return;
              }

              retries -= 1;
              if (retries > 0) {
                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                await new Promise((resolve) => setTimeout(resolve, 1500));
              }
            }

            // If we get here, polling timed out
            errorManager(
              "Grant completion indexing timed out",
              new Error(`Grant not indexed after ${maxRetries} attempts`),
              { grantUID: grant.uid, txHash }
            );
            toast.error("Grant completion is taking longer than expected. Please refresh the page in a moment to see if it completed.");
            setIsLoading(false);
            setIsStepper(false);
          });
      } catch (error: any) {
        errorManager(
          MESSAGES.GRANT.MARK_AS_COMPLETE.ERROR,
          error,
          { grantUID: grant.uid, address },
          { error: MESSAGES.GRANT.MARK_AS_COMPLETE.ERROR }
        );
        toast.error(MESSAGES.GRANT.MARK_AS_COMPLETE.ERROR);
        setIsLoading(false);
        setIsStepper(false);
      }
    } catch (error) {
      errorManager("Unexpected error completing grant", error, {
        grantUID: grant.uid,
        address
      });
      toast.error("An unexpected error occurred. Please try again.");
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  return (
    <Button
      onClick={handleMarkAsComplete}
      disabled={isLoading}
      className="hover:opacity-75 flex flex-row items-center justify-center gap-2 rounded-md bg-[#17B26A] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#17B26A] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? "Completing..." : text}
      <div className="h-5 w-5">
        <CheckCircleIcon className="h-5 w-5" />
      </div>
    </Button>
  );
};

