import type { GAP } from "@show-karma/karma-gap-sdk";
import { GapContract } from "@show-karma/karma-gap-sdk/core/class/contract/GapContract";
import { MilestoneCompleted } from "@show-karma/karma-gap-sdk/core/class/types/attestations";
import { useState } from "react";
import toast from "react-hot-toast";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { useWallet } from "@/hooks/useWallet";
import {
  type MappedGrantMilestone,
  type ProjectGrantMilestonesResponse,
  updateMilestoneVerification,
} from "@/services/milestones";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { sanitizeObject } from "@/utilities/sanitize";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";

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
  retryDelay: number = 1500,
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

  throw new Error(
    "Polling timed out - please refresh the page to check status",
  );
}

/**
 * Retries an async operation with exponential backoff
 */
async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  onError?: (error: any, attempt: number) => void,
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
    const {
      success,
      chainId: actualChainId,
      gapClient,
    } = await ensureCorrectChain({
      targetChainId: data.project.chainID,
      currentChainId: chain?.id,
      switchChainAsync,
    });

    if (!success || !gapClient) {
      setIsVerifying(false);
      setIsStepper(false);
      return null;
    }

    const { walletClient, error: walletError } =
      await safeGetWalletClient(actualChainId);
    if (walletError || !walletClient) {
      throw new Error("Failed to connect to wallet", { cause: walletError });
    }

    const walletSigner = await walletClientToSigner(walletClient);

    return { gapClient, walletSigner };
  };

  const fetchMilestoneInstance = async (
    gapClient: GAP,
    data: ProjectGrantMilestonesResponse,
    milestone: MappedGrantMilestone,
  ) => {
    const fetchedProject = await gapClient.fetch.projectById(data.project.uid);
    if (!fetchedProject) {
      throw new Error("Failed to fetch project data");
    }

    const grantInstance = fetchedProject.grants.find(
      (g) => g.details?.programId === programId,
    );

    if (!grantInstance) {
      throw new Error("Grant not found");
    }

    const milestoneInstance = grantInstance.milestones?.find(
      (m) => m.uid.toLowerCase() === milestone.uid.toLowerCase(),
    );

    if (!milestoneInstance) {
      throw new Error("Milestone not found");
    }

    return { milestoneInstance, grantInstance };
  };

  const completeAndVerifyMilestoneOnChain = async (
    milestoneInstance: any,
    milestone: MappedGrantMilestone,
    walletSigner: any,
    gapClient: GAP,
    data: ProjectGrantMilestonesResponse,
    verificationComment: string,
  ): Promise<boolean> => {
    const alreadyCompleted = milestoneInstance.completed;
    const completionReason =
      milestone.fundingApplicationCompletion?.completionText;

    toast.loading(
      alreadyCompleted
        ? "Verifying milestone..."
        : "Completing and verifying milestone...",
      {
        id: `milestone-${milestone.uid}`,
      },
    );

    try {
      changeStepperStep("preparing");

      const milestoneCompletedSchema =
        gapClient.findSchema("MilestoneCompleted");
      const payloads: any[] = [];
      let payloadIndex = 0;

      // Add completion attestation only if milestone is not already completed
      if (!alreadyCompleted) {
        const completionAttestation = new MilestoneCompleted({
          data: sanitizeObject({
            reason: completionReason,
            proofOfWork: "",
            type: "completed",
          }),
          refUID: milestone.uid as Hex,
          schema: milestoneCompletedSchema,
          recipient: milestoneInstance.recipient,
        });
        payloads.push(await completionAttestation.payloadFor(payloadIndex));
        payloadIndex++;
      }

      // Always add verification attestation
      const verificationAttestation = new MilestoneCompleted({
        data: sanitizeObject({
          reason: verificationComment || "",
          proofOfWork: "",
          type: "verified",
        }),
        refUID: milestone.uid as Hex,
        schema: milestoneCompletedSchema,
        recipient: milestoneInstance.recipient,
      });
      payloads.push(await verificationAttestation.payloadFor(payloadIndex));

      changeStepperStep("pending");

      // Always use MultiAttest (even for single attestation)
      const result = await GapContract.multiAttest(
        walletSigner,
        payloads,
        changeStepperStep,
      );

      changeStepperStep("indexing");

      // Notify indexer about the transaction and all attestations
      const txHash = result?.tx[0]?.hash;
      const attestationUIDs = result?.uids || [];

      if (txHash) {
        // Notify indexer about the transaction
        await fetchData(
          INDEXER.ATTESTATION_LISTENER(txHash, milestoneInstance.chainID),
          "POST",
          {},
        );

        // If we have multiple attestations, wait a bit to ensure indexer processes both
        if (attestationUIDs.length > 1) {
          // Give the indexer time to process the transaction and queue all attestations
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      // Poll for verification (and completion if needed)
      // This ensures BOTH attestations are fully indexed before continuing
      await pollForMilestoneUpdate(async () => {
        const updatedProject = await gapClient.fetch.projectById(
          data.project.uid,
        );
        const updatedGrant = updatedProject?.grants.find(
          (g) => g.details?.programId === programId,
        );
        const updatedMilestone = updatedGrant?.milestones.find(
          (m: any) => m.uid === milestone.uid,
        );

        const isVerified = updatedMilestone?.verified?.find(
          (v: any) => v.attester?.toLowerCase() === address?.toLowerCase(),
        );

        // If we completed it in this transaction, ensure BOTH are indexed
        if (!alreadyCompleted) {
          const isCompleted = updatedMilestone?.completed;

          // Both must be true for the polling to succeed
          if (isCompleted && isVerified) {
            return updatedMilestone;
          }

          // Return null to continue polling if either is missing
          return null;
        }

        // If already completed, just check verification
        return isVerified ? updatedMilestone : null;
      });

      changeStepperStep("indexed");
      toast.success(
        alreadyCompleted
          ? "Milestone verified successfully!"
          : "Milestone completed and verified successfully!",
        {
          id: `milestone-${milestone.uid}`,
        },
      );

      return true;
    } catch (error: any) {
      toast.remove(`milestone-${milestone.uid}`);
      throw error;
    }
  };

  const updateDatabaseVerification = async (
    milestone: MappedGrantMilestone,
    verificationComment: string,
  ) => {
    if (!milestone.fundingApplicationCompletion) {
      toast.success("Milestone verified successfully on-chain!");
      return;
    }

    const dbUpdateSuccess = await retryWithExponentialBackoff(
      () =>
        updateMilestoneVerification(
          milestone.fundingApplicationCompletion!.referenceNumber,
          milestone.fundingApplicationCompletion!.milestoneFieldLabel,
          milestone.fundingApplicationCompletion!.milestoneTitle,
          verificationComment,
        ),
      3,
      (error, attempt) => {
        console.error(
          `Failed to update verification in database (attempt ${attempt}/3):`,
          error,
        );
      },
    );

    if (dbUpdateSuccess !== null) {
      toast.success("Milestone verified successfully!");
    } else {
      toast.error(
        "Verification successful on-chain but failed to update database after 3 attempts",
      );
    }
  };

  const verifyMilestone = async (
    milestone: MappedGrantMilestone,
    data: ProjectGrantMilestonesResponse,
    verificationComment: string,
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
      const { milestoneInstance } = await fetchMilestoneInstance(
        gapClient,
        data,
        milestone,
      );

      // Step 3: Complete and verify milestone in a single transaction
      const onChainConfirmed = await completeAndVerifyMilestoneOnChain(
        milestoneInstance,
        milestone,
        walletSigner,
        gapClient,
        data,
        verificationComment,
      );

      // Ensure operation succeeded
      if (!onChainConfirmed) {
        throw new Error(
          "Cannot update database: On-chain attestation was not confirmed",
        );
      }

      // Step 4: Update database
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
