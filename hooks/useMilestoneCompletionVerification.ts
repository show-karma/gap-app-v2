import { useState } from "react";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";
import { useStepper } from "@/store/modals/txStepper";
import { useWallet } from "@/hooks/useWallet";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import { sanitizeObject } from "@/utilities/sanitize";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { errorManager } from "@/components/Utilities/errorManager";
import { updateMilestoneVerification, type MappedMilestone, type ProjectGrantMilestonesResponse } from "@/services/milestones";

interface UseMilestoneCompletionVerificationParams {
  projectId: string;
  programId: string;
  onSuccess?: () => void;
}

/**
 * Hook for handling milestone completion and verification workflow
 */
export const useMilestoneCompletionVerification = ({
  projectId,
  programId,
  onSuccess,
}: UseMilestoneCompletionVerificationParams) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const { address, chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { changeStepperStep, setIsStepper } = useStepper();

  const verifyMilestone = async (
    milestone: MappedMilestone,
    data: ProjectGrantMilestonesResponse,
    verificationComment: string
  ) => {
    if (!address || !data) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!milestone.onChainMilestoneUID) {
      toast.error("Cannot verify milestone without on-chain UID");
      return;
    }

    setIsVerifying(true);
    setIsStepper(true);

    try {
      changeStepperStep("preparing");

      // Switch to correct chain
      const { success, chainId: actualChainId, gapClient } = await ensureCorrectChain({
        targetChainId: data.grant.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success || !gapClient) {
        setIsVerifying(false);
        setIsStepper(false);
        return;
      }

      // Get wallet signer
      const { walletClient, error: walletError } = await safeGetWalletClient(actualChainId);
      if (walletError || !walletClient) {
        throw new Error("Failed to connect to wallet", { cause: walletError });
      }

      const walletSigner = await walletClientToSigner(walletClient);

      // Fetch project to get milestone instance (we need the SDK class instance, not just data)
      const fetchedProject = await gapClient.fetch.projectById(data.project.uid);
      if (!fetchedProject) {
        throw new Error("Failed to fetch project data");
      }

      // Find grant and milestone instances using UIDs from the data we already have
      const grantInstance = fetchedProject.grants.find(
        (g) => g.uid.toLowerCase() === data.grant.uid.toLowerCase()
      );
      if (!grantInstance) {
        throw new Error("Grant not found");
      }

      const milestoneInstance = grantInstance.milestones?.find(
        (m) => m.uid.toLowerCase() === milestone.onChainMilestoneUID.toLowerCase()
      );

      if (!milestoneInstance) {
        throw new Error("Milestone not found");
      }

      // Track success of each step to ensure we only update DB if both succeed
      let completionConfirmed = false;
      let verificationConfirmed = false;

      // Step 1: Complete milestone if not already completed
      if (!milestoneInstance.completed) {
        const completionData = sanitizeObject({
          reason: milestone.completion?.completionText || "Milestone marked as complete",
          proofOfWork: "",
          completionPercentage: 100,
          type: "completed",
          deliverables: [],
        });

        toast.loading("Completing milestone...", {
          id: `milestone-${milestone.onChainMilestoneUID}`,
        });

        await milestoneInstance
          .complete(walletSigner, completionData, changeStepperStep)
          .then(async (result) => {
            changeStepperStep("indexing");

            // Notify indexer
            const txHash = result?.tx[0]?.hash;
            if (txHash) {
              await fetchData(
                INDEXER.ATTESTATION_LISTENER(txHash, milestoneInstance.chainID),
                "POST",
                {}
              );
            }

            // Wait for completion to be indexed
            let retries = 1000;
            let isCompleted = false;

            while (retries > 0 && !isCompleted) {
              try {
                const updatedProject = await gapClient.fetch.projectById(data.project.uid);
                const updatedGrant = updatedProject?.grants.find(
                  (g) => g.uid === data.grant.uid
                );
                const updatedMilestone = updatedGrant?.milestones.find(
                  (m: any) => m.uid === milestone.onChainMilestoneUID
                );

                if (updatedMilestone?.completed) {
                  isCompleted = true;
                  completionConfirmed = true; // Mark completion as confirmed on-chain
                  changeStepperStep("indexed");
                  toast.success("Milestone completed successfully!", {
                    id: `milestone-${milestone.onChainMilestoneUID}`,
                  });
                }
              } catch (pollError) {
                console.error("Error polling for completion:", pollError);
              }

              retries -= 1;
              // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }

            if (!isCompleted) {
              throw new Error("Completion indexing timed out - please refresh the page to check status");
            }
          })
          .catch((error) => {
            toast.remove(`milestone-${milestone.onChainMilestoneUID}`);
            throw error;
          });
      } else {
        // Milestone is already completed on-chain
        completionConfirmed = true;
      }

      // Step 2: Verify milestone on-chain
      await milestoneInstance
        .verify(
          walletSigner,
          sanitizeObject({
            reason: verificationComment || "",
          }),
          changeStepperStep
        )
        .then(async (res) => {
          changeStepperStep("indexing");

          // Notify indexer about transaction
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, milestoneInstance.chainID),
              "POST",
              {}
            );
          }

          // Poll for verification to be indexed
          let retries = 1000;
          let isVerified = false;

          while (retries > 0 && !isVerified) {
            try {
              // Re-fetch project to check if verification is indexed
              const updatedProject = await gapClient.fetch.projectById(data.project.uid);
              const updatedGrant = updatedProject?.grants.find(
                (g) => g.uid === data.grant.uid
              );
              const updatedMilestone = updatedGrant?.milestones.find(
                (m: any) => m.uid === milestone.onChainMilestoneUID
              );

              const alreadyVerified = updatedMilestone?.verified?.find(
                (v: any) => v.attester?.toLowerCase() === address?.toLowerCase()
              );

              if (alreadyVerified) {
                isVerified = true;
                verificationConfirmed = true; // Mark verification as confirmed on-chain
                changeStepperStep("indexed");
              }
            } catch (pollError) {
              console.error("Error polling for verification:", pollError);
            }

            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }

          if (!isVerified) {
            throw new Error("Verification indexing timed out - please refresh the page to check status");
          }
        });

      // Step 3: Call backend API to update milestone_completions table
      // ONLY if both on-chain operations were confirmed successful
      if (!completionConfirmed || !verificationConfirmed) {
        throw new Error(
          `Cannot update database: ${!completionConfirmed ? "Completion" : "Verification"} was not confirmed on-chain`
        );
      }

      // Step 3: Update database (only if funding application exists)
      if (data.fundingApplication) {
        // Retry logic with exponential backoff for database update
        const maxRetries = 3;
        let attempt = 0;
        let dbUpdateSuccess = false;

        while (attempt < maxRetries && !dbUpdateSuccess) {
          try {
            await updateMilestoneVerification(
              data.fundingApplication.referenceNumber,
              milestone.milestoneFieldLabel,
              milestone.milestoneTitle,
              verificationComment
            );
            dbUpdateSuccess = true;
            toast.success("Milestone verified successfully!");
          } catch (apiError) {
            attempt += 1;
            console.error(`Failed to update verification in database (attempt ${attempt}/${maxRetries}):`, apiError);

            if (attempt < maxRetries) {
              // Exponential backoff: 1s, 2s, 4s
              const delay = Math.pow(2, attempt - 1) * 1000;
              await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
              // Final attempt failed
              toast.error("Verification successful on-chain but failed to update database after 3 attempts");
            }
          }
        }
      } else {
        // No funding application - verification only on-chain
        toast.success("Milestone verified successfully on-chain!");
      }

      // Call success callback
      onSuccess?.();
    } catch (error: any) {
      console.error("Error verifying milestone:", error);

      // Check if user cancelled
      if (error?.message?.includes("User rejected") || error?.code === 4001) {
        toast.error("Verification cancelled");
      } else {
        toast.error("Failed to verify milestone");
        errorManager("Error verifying milestone", error, {
          milestoneUID: milestone.onChainMilestoneUID,
          grantUID: data.grant.uid,
          address,
        });
      }
    } finally {
      setIsVerifying(false);
      setIsStepper(false);
    }
  };

  return {
    verifyMilestone,
    isVerifying,
  };
};
