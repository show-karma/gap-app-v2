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
import { updateMilestoneVerification, type MappedGrantMilestone, type ProjectGrantMilestonesResponse } from "@/services/milestones";
import type { GAP } from "@show-karma/karma-gap-sdk";

interface UseMilestoneCompletionVerificationParams {
  projectId: string;
  programId: string;
  onSuccess?: () => void;
}

/**
 * Polls for milestone completion or verification with retry logic
 */
async function pollForMilestoneUpdate<T>(
  checkFn: () => Promise<T | null>,
  maxRetries: number = 1000,
  retryDelay: number = 1500
): Promise<T> {
  let retries = maxRetries;

  while (retries > 0) {
    try {
      const result = await checkFn();
      if (result) {
        return result;
      }
    } catch (pollError) {
      console.error("Error during polling:", pollError);
    }

    retries -= 1;
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }

  throw new Error("Polling timed out - please refresh the page to check status");
}

/**
 * Retries an async operation with exponential backoff
 */
async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  onError?: (error: any, attempt: number) => void
): Promise<T | null> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      if (onError) {
        onError(error, attempt);
      }

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return null;
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

  const setupChainAndWallet = async (data: ProjectGrantMilestonesResponse) => {
    const { success, chainId: actualChainId, gapClient } = await ensureCorrectChain({
      targetChainId: data.project.chainID,
      currentChainId: chain?.id,
      switchChainAsync,
    });

    if (!success || !gapClient) {
      setIsVerifying(false);
      setIsStepper(false);
      return null;
    }

    const { walletClient, error: walletError } = await safeGetWalletClient(actualChainId);
    if (walletError || !walletClient) {
      throw new Error("Failed to connect to wallet", { cause: walletError });
    }

    const walletSigner = await walletClientToSigner(walletClient);

    return { gapClient, walletSigner };
  };

  const fetchMilestoneInstance = async (
    gapClient: GAP,
    data: ProjectGrantMilestonesResponse,
    milestone: MappedGrantMilestone
  ) => {
    const fetchedProject = await gapClient.fetch.projectById(data.project.uid);
    if (!fetchedProject) {
      throw new Error("Failed to fetch project data");
    }

    const grantInstance = fetchedProject.grants.find(
      (g) => g.details?.programId === programId
    );

    if (!grantInstance) {
      console.error("Grant not found. Expected programId:", programId);
      console.error("Available grants:", fetchedProject.grants.map((g) => ({
        uid: g.uid,
        programId: g.details?.programId,
        chainID: g.chainID
      })));
      throw new Error("Grant not found");
    }

    const milestoneInstance = grantInstance.milestones?.find(
      (m) => m.uid.toLowerCase() === milestone.uid.toLowerCase()
    );

    if (!milestoneInstance) {
      console.error("Milestone not found. Expected UID:", milestone.uid);
      console.error("Available milestones:", grantInstance.milestones?.map((m) => ({
        uid: m.uid,
        title: m.data?.title
      })));
      throw new Error("Milestone not found");
    }

    return { milestoneInstance, grantInstance };
  };

  const completeMilestoneOnChain = async (
    milestoneInstance: any,
    milestone: MappedGrantMilestone,
    walletSigner: any,
    gapClient: GAP,
    data: ProjectGrantMilestonesResponse
  ): Promise<boolean> => {
    if (milestoneInstance.completed) {
      return true;
    }

    const completionReason = milestone.fundingApplicationCompletion?.completionText || "Milestone marked as complete";

    const completionData = sanitizeObject({
      reason: completionReason,
      proofOfWork: "",
      completionPercentage: 100,
      type: "completed",
      deliverables: [],
    });

    toast.loading("Completing milestone...", {
      id: `milestone-${milestone.uid}`,
    });

    await milestoneInstance
      .complete(walletSigner, completionData, changeStepperStep)
      .then(async (result: any) => {
        changeStepperStep("indexing");

        const txHash = result?.tx[0]?.hash;
        if (txHash) {
          await fetchData(
            INDEXER.ATTESTATION_LISTENER(txHash, milestoneInstance.chainID),
            "POST",
            {}
          );
        }

        await pollForMilestoneUpdate(async () => {
          const updatedProject = await gapClient.fetch.projectById(data.project.uid);
          const updatedGrant = updatedProject?.grants.find(
            (g) => g.details?.programId === programId
          );
          const updatedMilestone = updatedGrant?.milestones.find(
            (m: any) => m.uid === milestone.uid
          );

          return updatedMilestone?.completed ? updatedMilestone : null;
        });

        changeStepperStep("indexed");
        toast.success("Milestone completed successfully!", {
          id: `milestone-${milestone.uid}`,
        });
      })
      .catch((error: any) => {
        toast.remove(`milestone-${milestone.uid}`);
        throw error;
      });

    return true;
  };

  const verifyMilestoneOnChain = async (
    milestoneInstance: any,
    milestone: MappedGrantMilestone,
    walletSigner: any,
    gapClient: GAP,
    data: ProjectGrantMilestonesResponse,
    verificationComment: string
  ): Promise<boolean> => {
    await milestoneInstance
      .verify(
        walletSigner,
        sanitizeObject({
          reason: verificationComment || "",
        }),
        changeStepperStep
      )
      .then(async (res: any) => {
        changeStepperStep("indexing");

        const txHash = res?.tx[0]?.hash;
        if (txHash) {
          await fetchData(
            INDEXER.ATTESTATION_LISTENER(txHash, milestoneInstance.chainID),
            "POST",
            {}
          );
        }

        await pollForMilestoneUpdate(async () => {
          const updatedProject = await gapClient.fetch.projectById(data.project.uid);
          const updatedGrant = updatedProject?.grants.find(
            (g) => g.details?.programId === programId
          );
          const updatedMilestone = updatedGrant?.milestones.find(
            (m: any) => m.uid === milestone.uid
          );

          const alreadyVerified = updatedMilestone?.verified?.find(
            (v: any) => v.attester?.toLowerCase() === address?.toLowerCase()
          );

          return alreadyVerified ? updatedMilestone : null;
        });

        changeStepperStep("indexed");
      });

    return true;
  };

  const updateDatabaseVerification = async (
    milestone: MappedGrantMilestone,
    verificationComment: string
  ) => {
    if (!milestone.fundingApplicationCompletion) {
      toast.success("Milestone verified successfully on-chain!");
      return;
    }

    const dbUpdateSuccess = await retryWithExponentialBackoff(
      () => updateMilestoneVerification(
        milestone.fundingApplicationCompletion!.referenceNumber,
        milestone.fundingApplicationCompletion!.milestoneFieldLabel,
        milestone.fundingApplicationCompletion!.milestoneTitle,
        verificationComment
      ),
      3,
      (error, attempt) => {
        console.error(`Failed to update verification in database (attempt ${attempt}/3):`, error);
      }
    );

    if (dbUpdateSuccess !== null) {
      toast.success("Milestone verified successfully!");
    } else {
      toast.error("Verification successful on-chain but failed to update database after 3 attempts");
    }
  };

  const verifyMilestone = async (
    milestone: MappedGrantMilestone,
    data: ProjectGrantMilestonesResponse,
    verificationComment: string
  ) => {
    // Validation
    if (!address || !data) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!milestone.uid) {
      toast.error("Cannot verify milestone without UID");
      return;
    }

    setIsVerifying(true);
    setIsStepper(true);

    try {
      changeStepperStep("preparing");

      // Step 1: Setup chain and wallet
      const chainSetup = await setupChainAndWallet(data);
      if (!chainSetup) return;

      const { gapClient, walletSigner } = chainSetup;

      // Step 2: Fetch milestone instance
      const { milestoneInstance } = await fetchMilestoneInstance(gapClient, data, milestone);

      // Step 3: Complete milestone (if needed)
      const completionConfirmed = await completeMilestoneOnChain(
        milestoneInstance,
        milestone,
        walletSigner,
        gapClient,
        data
      );

      // Step 4: Verify milestone
      const verificationConfirmed = await verifyMilestoneOnChain(
        milestoneInstance,
        milestone,
        walletSigner,
        gapClient,
        data,
        verificationComment
      );

      // Ensure both operations succeeded
      if (!completionConfirmed || !verificationConfirmed) {
        throw new Error(
          `Cannot update database: ${!completionConfirmed ? "Completion" : "Verification"} was not confirmed on-chain`
        );
      }

      // Step 5: Update database
      await updateDatabaseVerification(milestone, verificationComment);

      // Success callback
      onSuccess?.();
    } catch (error: any) {
      console.error("Error verifying milestone:", error);

      // Check if user cancelled
      if (error?.message?.includes("User rejected") || error?.code === 4001) {
        toast.error("Verification cancelled");
      } else {
        toast.error("Failed to verify milestone");
        errorManager("Error verifying milestone", error, {
          milestoneUID: milestone.uid,
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
