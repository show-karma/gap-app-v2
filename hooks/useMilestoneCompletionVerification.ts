import type { GAP } from "@show-karma/karma-gap-sdk";
import { GapContract } from "@show-karma/karma-gap-sdk/core/class/contract/GapContract";
import { MilestoneCompleted } from "@show-karma/karma-gap-sdk/core/class/types/attestations";
import type { Signer } from "ethers";
import { useState } from "react";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { queryClient } from "@/components/Utilities/PrivyProviderWrapper";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import {
  attestMilestoneCompletionAsReviewer,
  type GrantMilestoneWithCompletion,
  type ProjectGrantMilestonesResponse,
  updateMilestoneVerification,
} from "@/services/milestones";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { retry, retryUntilConditionMet } from "@/utilities/retries";
import { sanitizeObject } from "@/utilities/sanitize";

// Constants
const INDEXER_PROCESSING_DELAY_MS = 2000;

/**
 * Normalize programId by stripping the chainId suffix if present
 * Supports both "programId" and legacy "programId_chainId" formats
 */
const normalizeProgramId = (id: string): string => {
  return id.includes("_") ? id.split("_")[0] : id;
};

interface UseMilestoneCompletionVerificationParams {
  projectId: string;
  programId: string;
  onSuccess?: () => void;
}

interface MilestoneInstance {
  uid: string;
  recipient: `0x${string}`;
  completed: boolean | { data: any; attester: string };
  verified?: Array<{ attester: string }>;
  chainID: number;
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
  const { startAttestation, showLoading, showSuccess, showError, changeStepperStep, dismiss } =
    useAttestationToast();
  const { setupChainAndWallet } = useSetupChainAndWallet();

  const setupChainAndWalletForMilestone = async (
    milestone: GrantMilestoneWithCompletion,
    _data: ProjectGrantMilestonesResponse
  ): Promise<{ gapClient: GAP; walletSigner: Signer } | null> => {
    const targetChainId = +milestone.chainId;

    const setup = await setupChainAndWallet({
      targetChainId,
      currentChainId: chain?.id,
      switchChainAsync,
    });

    if (!setup) {
      setIsVerifying(false);
      dismiss();
      return null;
    }

    return { gapClient: setup.gapClient, walletSigner: setup.walletSigner };
  };

  const fetchMilestoneInstance = async (
    gapClient: GAP,
    data: ProjectGrantMilestonesResponse,
    milestone: GrantMilestoneWithCompletion
  ): Promise<{
    milestoneInstance: MilestoneInstance;
    communityUID: string;
  }> => {
    const fetchedProject = await gapClient.fetch.projectById(data.project.uid);
    if (!fetchedProject) {
      throw new Error("Failed to fetch project data");
    }

    // Normalize programId for comparison (supports both formats)
    const normalizedInputId = normalizeProgramId(programId);
    const grantInstance = fetchedProject.grants.find((g) => {
      const storedId = g.details?.programId;
      if (!storedId) return false;
      return normalizeProgramId(storedId) === normalizedInputId;
    });

    if (!grantInstance) {
      throw new Error("Grant not found");
    }

    const milestoneInstance = grantInstance.milestones?.find(
      (m) => m.uid.toLowerCase() === milestone.uid.toLowerCase()
    );

    if (!milestoneInstance) {
      throw new Error("Milestone not found");
    }

    // Extract communityUID from grant data
    const communityUID = grantInstance.data?.communityUID || "";

    return {
      milestoneInstance: milestoneInstance as MilestoneInstance,
      communityUID,
    };
  };

  const buildAttestationPayloads = async (
    gapClient: GAP,
    milestone: GrantMilestoneWithCompletion,
    milestoneInstance: MilestoneInstance,
    options: {
      includeCompletion: boolean;
      completionReason?: string;
      verificationComment: string;
    }
  ) => {
    const milestoneCompletedSchema = gapClient.findSchema("MilestoneCompleted");
    const payloads: any[] = [];
    let payloadIndex = 0;

    // Add completion attestation if requested
    if (options.includeCompletion) {
      const completionAttestation = new MilestoneCompleted({
        data: sanitizeObject({
          reason: options.completionReason || "",
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
        reason: options.verificationComment || "",
        proofOfWork: "",
        type: "verified",
      }),
      refUID: milestone.uid as Hex,
      schema: milestoneCompletedSchema,
      recipient: milestoneInstance.recipient,
    });
    payloads.push(await verificationAttestation.payloadFor(payloadIndex));

    return payloads;
  };

  const notifyIndexerAndInvalidateCache = async (
    txHash: string | undefined,
    chainId: number,
    attestationCount: number,
    communityUID: string
  ) => {
    if (txHash) {
      await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, chainId), "POST", {});

      // If multiple attestations, wait for indexer to process all
      if (attestationCount > 1) {
        await new Promise((resolve) => setTimeout(resolve, INDEXER_PROCESSING_DELAY_MS));
      }
    }

    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(projectId, programId),
    });

    await queryClient.invalidateQueries({
      queryKey: ["reportMilestones", communityUID],
    });
  };

  const pollForMilestoneStatus = async (
    gapClient: GAP,
    data: ProjectGrantMilestonesResponse,
    milestone: GrantMilestoneWithCompletion,
    checkCompletion: boolean,
    userAddress: string,
    inputProgramId: string
  ) => {
    // Normalize for comparison (supports both programId formats)
    const normalizedInputId = normalizeProgramId(inputProgramId);

    await retryUntilConditionMet(async () => {
      const updatedProject = await gapClient.fetch.projectById(data.project.uid);

      if (!updatedProject) return false;

      const updatedGrant = updatedProject.grants.find((g) => {
        const storedId = g.details?.programId;
        if (!storedId) return false;
        return normalizeProgramId(storedId) === normalizedInputId;
      });

      if (!updatedGrant) return false;

      const updatedMilestone = updatedGrant.milestones?.find((m) => m.uid === milestone.uid);

      if (!updatedMilestone) return false;

      const isVerified = updatedMilestone.verified?.find(
        (v) => v.attester?.toLowerCase() === userAddress.toLowerCase()
      );

      // If checking completion, ensure both are indexed
      if (checkCompletion) {
        const isCompleted = updatedMilestone.completed;
        return !!(isCompleted && isVerified);
      }

      // Otherwise just check verification
      return !!isVerified;
    });
  };

  const completeViaBackend = async (
    milestone: GrantMilestoneWithCompletion,
    completionComment: string,
    attestationChainId: number,
    communityUID: string
  ): Promise<void> => {
    showLoading("Completing milestone...");

    try {
      changeStepperStep("preparing");

      // Pass full programId (composite format) for reviewer check
      // and attestationChainId for where the attestation will be created
      const { txHash } = await attestMilestoneCompletionAsReviewer(
        milestone.uid,
        completionComment,
        programId, // Full programId (can be composite: programId_chainId)
        attestationChainId // Chain where attestation will be created
      );

      changeStepperStep("indexing");
      await notifyIndexerAndInvalidateCache(txHash, attestationChainId, 1, communityUID);
      changeStepperStep("indexed");

      showSuccess("Milestone completed successfully!");
    } catch (error) {
      dismiss();
      throw error;
    }
  };

  const attestMilestonesOnChain = async (
    milestoneInstance: MilestoneInstance,
    milestone: GrantMilestoneWithCompletion,
    walletSigner: Signer,
    gapClient: GAP,
    data: ProjectGrantMilestonesResponse,
    options: {
      includeCompletion: boolean;
      completionReason?: string;
      verificationComment: string;
    },
    communityUID: string
  ): Promise<boolean> => {
    const isVerificationOnly = !options.includeCompletion;

    showLoading(
      isVerificationOnly ? "Verifying milestone..." : "Completing and verifying milestone..."
    );

    try {
      changeStepperStep("preparing");

      const payloads = await buildAttestationPayloads(
        gapClient,
        milestone,
        milestoneInstance,
        options
      );

      changeStepperStep("pending");

      const result = await GapContract.multiAttest(walletSigner, payloads, changeStepperStep);

      changeStepperStep("indexing");

      const txHash = result?.tx[0]?.hash || undefined;
      await notifyIndexerAndInvalidateCache(
        txHash,
        milestoneInstance.chainID,
        payloads.length,
        communityUID
      );

      // Poll for milestone status
      if (!address) {
        throw new Error("User address not available");
      }

      await pollForMilestoneStatus(
        gapClient,
        data,
        milestone,
        options.includeCompletion,
        address,
        programId
      );

      changeStepperStep("indexed");
      showSuccess(
        isVerificationOnly
          ? "Milestone verified successfully!"
          : "Milestone completed and verified successfully!"
      );

      return true;
    } catch (error: any) {
      dismiss();
      throw error;
    }
  };

  const updateDatabaseVerification = async (
    milestone: GrantMilestoneWithCompletion,
    verificationComment: string
  ) => {
    if (!milestone.fundingApplicationCompletion) {
      return;
    }

    try {
      await retry(
        () =>
          updateMilestoneVerification(
            milestone.fundingApplicationCompletion!.referenceNumber,
            milestone.fundingApplicationCompletion!.milestoneFieldLabel,
            milestone.fundingApplicationCompletion!.milestoneTitle,
            verificationComment
          ),
        3,
        1000,
        4000,
        2
      );
    } catch (error) {
      console.error("Failed to update verification in database after retries:", error);
      showError("Verification successful on-chain but failed to update database");
    }
  };

  const verifyMilestone = async (
    milestone: GrantMilestoneWithCompletion,
    isMilestoneReviewer: boolean,
    data: ProjectGrantMilestonesResponse,
    verificationComment: string
  ) => {
    // Validation
    if (!address || !data) {
      showError("Please connect your wallet");
      return;
    }

    if (!milestone.uid) {
      showError("Cannot verify milestone without UID");
      return;
    }

    // Use chainId from milestone (where attestation will occur)
    const attestationChainId = milestone.chainId;

    setIsVerifying(true);
    startAttestation("Verifying milestone...");

    try {
      changeStepperStep("preparing");

      // Step 1: Setup chain and wallet
      const chainSetup = await setupChainAndWalletForMilestone(milestone, data);
      if (!chainSetup) return;

      const { gapClient, walletSigner } = chainSetup;

      // Step 2: Fetch milestone instance and communityUID
      let { milestoneInstance, communityUID } = await fetchMilestoneInstance(
        gapClient,
        data,
        milestone
      );

      const alreadyCompleted =
        typeof milestoneInstance.completed === "boolean"
          ? milestoneInstance.completed
          : !!milestoneInstance.completed;

      const completionReason = milestone.fundingApplicationCompletion?.completionText;

      let includeCompletion = !alreadyCompleted;

      // Step 3: Handle completion and verification based on reviewer status
      if (isMilestoneReviewer && !alreadyCompleted) {
        // Reviewer flow: Complete via backend, then verify on-chain (verification only)
        // Pass full programId (composite format) and attestation chainId to backend
        await completeViaBackend(
          milestone,
          completionReason ?? "",
          attestationChainId,
          communityUID
        );

        // Re-fetch milestone to get updated completion status
        const refetchedData = await fetchMilestoneInstance(gapClient, data, milestone);
        milestoneInstance = refetchedData.milestoneInstance;
        communityUID = refetchedData.communityUID;

        includeCompletion = false;
      }

      const onChainConfirmed = await attestMilestonesOnChain(
        milestoneInstance,
        milestone,
        walletSigner,
        gapClient,
        data,
        {
          includeCompletion,
          completionReason,
          verificationComment,
        },
        communityUID
      );

      if (!onChainConfirmed) {
        throw new Error("Cannot update database: On-chain attestation was not confirmed");
      }

      // Step 4: Update database
      await updateDatabaseVerification(milestone, verificationComment);

      // Success callback
      onSuccess?.();
    } catch (error: any) {
      console.error("Error verifying milestone:", error);

      // Check if user cancelled
      if (error?.message?.includes("User rejected") || error?.code === 4001) {
        showError("Verification cancelled");
      } else {
        showError("Failed to verify milestone");
        errorManager("Error verifying milestone", error, {
          milestoneUID: milestone.uid,
          address,
        });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    verifyMilestone,
    isVerifying,
  };
};
