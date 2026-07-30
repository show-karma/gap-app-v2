import * as Sentry from "@sentry/nextjs";
import type { GAP } from "@show-karma/karma-gap-sdk";
import { GapContract } from "@show-karma/karma-gap-sdk/core/class/contract/GapContract";
import { MilestoneCompleted } from "@show-karma/karma-gap-sdk/core/class/types/attestations";
import type { Signer } from "ethers";
import { useEffect, useRef, useState } from "react";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { usePrivyBridge } from "@/contexts/privy-bridge-context";
import { useAttestationToast } from "@/hooks/useAttestationToast";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import {
  attestMilestoneCompletionAsReviewer,
  fetchGrantMilestonesForProgram,
  type GrantMilestoneWithCompletion,
  type ProjectGrantMilestonesResponse,
} from "@/services/milestones";
import { api } from "@/utilities/api/client";
import { isApiError } from "@/utilities/api/errors";
import { getLinkedWalletAddresses } from "@/utilities/auth/compare-all-wallets";
import { INDEXER } from "@/utilities/indexer";
import {
  describeMilestoneFailure,
  type MilestoneAction,
  type MilestoneFlowStep,
} from "@/utilities/milestones/attestationFailure";
import {
  buildAttesterCandidates,
  matchesSubmittedVerification,
  requireMilestoneRecipient,
} from "@/utilities/milestones/attestationIdentity";
import { queryClient } from "@/utilities/query-client";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { isAbortError, retryUntilConditionMet } from "@/utilities/retries";
import { sanitizeObject } from "@/utilities/sanitize";
import { isUserRejectionError } from "@/utilities/wallet/signerReadiness";

// Constants
const INDEXER_PROCESSING_DELAY_MS = 2000;

interface UseMilestoneCompletionVerificationParams {
  projectId: string;
  programId: string;
  onSuccess?: () => void;
  /**
   * Fires whenever the milestone caches are invalidated after a backend write
   * or attestation submission — i.e. *before* the (potentially long) on-chain
   * verification-indexing poll. Lets cross-cutting feeds (e.g. the Reviewer
   * Inbox) reflect the bucket transition immediately instead of waiting for
   * full verification indexing, which `onSuccess` is gated on.
   */
  onCachesInvalidated?: () => void;
}

/**
 * The wallet/chain context resolved once per flow. `attesterCandidates` are the
 * addresses the indexing poll may accept as the attester — the Privy-resolved
 * signer first, never wagmi's `useAccount().address` (which lags the signer and
 * is null often enough to matter).
 */
interface MilestoneChainSetup {
  gapClient: GAP;
  walletSigner: Signer;
  attesterCandidates: string[];
}

/** The multi-attest payload shape, taken from the SDK rather than re-declared. */
type AttestationPayload = Awaited<ReturnType<MilestoneCompleted["payloadFor"]>>;

/**
 * Hook for handling milestone completion and verification workflow
 */
export const useMilestoneCompletionVerification = ({
  projectId,
  programId,
  onSuccess,
  onCachesInvalidated,
}: UseMilestoneCompletionVerificationParams) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const { address, chain } = useAccount();
  const { user } = usePrivyBridge();
  const { switchChainAsync } = useWallet();
  const { startAttestation, showLoading, showSuccess, showError, changeStepperStep, dismiss } =
    useAttestationToast();
  const { setupChainAndWallet, smartWalletAddress } = useSetupChainAndWallet();

  // AbortController owns the in-flight verification's polling loop (refreshed at
  // every verifyMilestone call, aborted on cleanup) so post-unmount state updates
  // don't warn or waste network calls.
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const setupChainAndWalletForMilestone = async (
    milestone: GrantMilestoneWithCompletion
  ): Promise<MilestoneChainSetup | null> => {
    const targetChainId = +milestone.chainId;

    const setup = await setupChainAndWallet({
      targetChainId,
      currentChainId: chain?.id,
      switchChainAsync,
    });

    if (!setup) {
      dismiss();
      return null;
    }

    // The address that will actually sign. `getAddress()` is authoritative (it
    // covers the gasless/EIP-7702 signer too); `smartWalletAddress` is the
    // pre-resolved Privy attestation address and the linked set is the tolerant
    // fallback for accounts where Privy surfaces a different active wallet.
    const signerAddress = await setup.walletSigner.getAddress().catch(() => null);

    return {
      gapClient: setup.gapClient,
      walletSigner: setup.walletSigner,
      // wagmi's address is deliberately NOT a candidate: it can be an unlinked
      // wallet left connected from a previous session, and accepting it would
      // widen the match beyond this identity.
      attesterCandidates: buildAttesterCandidates([
        signerAddress,
        smartWalletAddress,
        ...(user ? getLinkedWalletAddresses(user) : []),
      ]),
    };
  };

  const buildAttestationPayloads = async (
    gapClient: GAP,
    milestone: GrantMilestoneWithCompletion,
    recipient: Hex,
    options: {
      includeCompletion: boolean;
      completionReason?: string;
      verificationComment: string;
    }
  ) => {
    const milestoneCompletedSchema = gapClient.findSchema("MilestoneCompleted");
    const payloads: AttestationPayload[] = [];
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
        recipient,
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
      recipient,
    });
    payloads.push(await verificationAttestation.payloadFor(payloadIndex));

    return payloads;
  };

  const notifyIndexerAndInvalidateCache = async (
    txHash: string | undefined,
    chainId: number,
    attestationCount: number
  ) => {
    if (txHash) {
      // Best-effort indexer nudge; it also catches this via its own chain listener,
      // so a failure must not abort the flow. Legacy fetchData discarded the error.
      await api.post(INDEXER.ATTESTATION_LISTENER(txHash, chainId), {}).catch(() => undefined);
      // If multiple attestations, wait for the indexer to process all of them.
      if (attestationCount > 1) {
        await new Promise((resolve) => setTimeout(resolve, INDEXER_PROCESSING_DELAY_MS));
      }
    }

    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(projectId, programId),
    });

    // Invalidate by prefix: the report queries are keyed by the community SLUG
    // from the URL, not the on-chain communityUID we have here, so appending
    // communityUID would never match and the invalidation would be a no-op.
    await queryClient.invalidateQueries({
      queryKey: ["reportMilestones"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["pendingVerificationMilestones"],
    });

    // Let consumers refresh cross-cutting feeds (e.g. the Reviewer Inbox) now
    // that the backend milestone state has changed, rather than waiting for the
    // on-chain verification poll that gates `onSuccess`.
    onCachesInvalidated?.();
  };

  // Re-reads the milestone from the V2 project-updates endpoint. Replaces the
  // old SDK `projectById` refetch (a V1 `GET /projects/:uid` per poll iteration,
  // and the crash site of GAP-FRONTEND-261): the V2 payload already carries the
  // completion, verification and recipient the flow needs.
  const findIndexedMilestone = async (
    projectUID: string,
    milestoneUID: string
  ): Promise<GrantMilestoneWithCompletion | null> => {
    const milestones = await fetchGrantMilestonesForProgram(projectUID, programId);
    return milestones.find((m) => m.uid.toLowerCase() === milestoneUID.toLowerCase()) ?? null;
  };

  const pollForMilestoneStatus = async (
    projectUID: string,
    milestone: GrantMilestoneWithCompletion,
    checkCompletion: boolean,
    attesterCandidates: string[],
    previousVerificationUID: string | undefined,
    signal?: AbortSignal
  ) => {
    await retryUntilConditionMet(
      async () => {
        const updatedMilestone = await findIndexedMilestone(projectUID, milestone.uid);

        if (!updatedMilestone) return false;

        const isVerified = matchesSubmittedVerification({
          verificationDetails: updatedMilestone.verificationDetails,
          candidates: attesterCandidates,
          previousAttestationUID: previousVerificationUID,
        });

        // If checking completion, ensure both are indexed
        if (checkCompletion) {
          return !!(updatedMilestone.completionDetails && isVerified);
        }

        // Otherwise just check verification
        return isVerified;
      },
      undefined,
      undefined,
      undefined,
      signal
    );
  };

  const pollForCompletionStatus = async (
    projectUID: string,
    milestone: GrantMilestoneWithCompletion,
    signal?: AbortSignal
  ) => {
    await retryUntilConditionMet(
      async () => {
        const updatedMilestone = await findIndexedMilestone(projectUID, milestone.uid);
        return !!updatedMilestone?.completionDetails;
      },
      undefined,
      undefined,
      undefined,
      signal
    );
  };

  const completeViaBackend = async (
    milestone: GrantMilestoneWithCompletion,
    completionComment: string,
    attestationChainId: number
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
      await notifyIndexerAndInvalidateCache(txHash, attestationChainId, 1);
      changeStepperStep("indexed");

      showSuccess("Milestone completed successfully!");
    } catch (error) {
      dismiss();
      throw error;
    }
  };

  const attestMilestonesOnChain = async (
    recipient: Hex,
    milestone: GrantMilestoneWithCompletion,
    setup: MilestoneChainSetup,
    projectUID: string,
    options: {
      includeCompletion: boolean;
      completionReason?: string;
      verificationComment: string;
    },
    reportStep: (step: MilestoneFlowStep) => void,
    signal?: AbortSignal
  ): Promise<boolean> => {
    const isVerificationOnly = !options.includeCompletion;

    showLoading(
      isVerificationOnly ? "Verifying milestone..." : "Completing and verifying milestone..."
    );

    try {
      changeStepperStep("preparing");

      const payloads = await buildAttestationPayloads(
        setup.gapClient,
        milestone,
        recipient,
        options
      );

      // Captured before signing so the poll can tell a NEW verification apart
      // from one this milestone already carried.
      const previousVerificationUID = milestone.verificationDetails?.attestationUID;

      changeStepperStep("pending");

      const result = await GapContract.multiAttest(setup.walletSigner, payloads, changeStepperStep);

      changeStepperStep("indexing");

      const txHash = result?.tx[0]?.hash || undefined;
      await notifyIndexerAndInvalidateCache(txHash, +milestone.chainId, payloads.length);

      // Nothing past this point may depend on wagmi's `useAccount().address`:
      // it can be null while the Privy signer works fine, which previously threw
      // "User address not available" AFTER a successful transaction (#67).
      reportStep("poll");
      await pollForMilestoneStatus(
        projectUID,
        milestone,
        options.includeCompletion,
        setup.attesterCandidates,
        previousVerificationUID,
        signal
      );

      if (signal?.aborted) {
        // Component unmounted mid-poll. Skip the success toast and the
        // "indexed" stepper update — neither is observable any more.
        return false;
      }

      changeStepperStep("indexed");
      showSuccess(
        isVerificationOnly
          ? "Milestone verified successfully!"
          : "Milestone completed and verified successfully!"
      );

      return true;
    } catch (error: unknown) {
      if (isAbortError(error)) {
        // Silent — caller's finally already dismisses the toast.
        return false;
      }
      dismiss();
      throw error;
    }
  };

  /**
   * Single exit point for a failed verify/complete run. Maps the error onto a
   * concrete user-facing cause and enriches the Sentry context with the project,
   * chain, program and the step the flow died on — the generic
   * "Failed to verify milestone" toast plus `{milestoneUID, address}` told
   * neither the user nor us anything (#64).
   */
  const reportMilestoneFailure = (
    error: unknown,
    action: MilestoneAction,
    step: MilestoneFlowStep,
    milestone: GrantMilestoneWithCompletion,
    projectUID: string | undefined
  ) => {
    // `isUserRejectionError` is a substring match, and an ApiError's message
    // embeds the endpoint path — so an API failure must never be mistaken for a
    // wallet rejection just because its route happens to contain "reject".
    if (!isApiError(error) && isUserRejectionError(error)) {
      showError(action === "verify" ? "Verification cancelled" : "Completion cancelled");
      return;
    }

    const failure = describeMilestoneFailure(error, action);
    showError(failure.message);

    if (failure.expected) {
      // Wallet not ready / indexer still catching up: guidance, not a defect.
      // Capturing it would be noise, but staying entirely silent is how this
      // flow lost its telemetry in the first place — leave a breadcrumb.
      Sentry.addBreadcrumb({
        category: "milestone-attestation",
        level: "warning",
        message: `${action} milestone stopped at ${step}: ${failure.kind}`,
        data: { milestoneUID: milestone.uid, projectUid: projectUID, programId, step },
      });
      return;
    }

    errorManager(
      action === "verify" ? "Error verifying milestone" : "Error completing milestone",
      error,
      {
        milestoneUID: milestone.uid,
        projectUid: projectUID,
        chainId: milestone.chainId,
        programId,
        step,
        failureKind: failure.kind,
        address,
      }
    );
  };

  const verifyMilestone = async (
    milestone: GrantMilestoneWithCompletion,
    isMilestoneReviewer: boolean,
    data: ProjectGrantMilestonesResponse,
    verificationComment: string
  ) => {
    // Validation
    if (!data) {
      showError("This milestone is still loading. Please try again.");
      return;
    }

    if (!milestone.uid) {
      showError("Cannot verify milestone without UID");
      return;
    }

    // Use chainId from milestone (where attestation will occur)
    const attestationChainId = milestone.chainId;
    const projectUID = data.project.uid;

    // Abort any prior in-flight verification and start a fresh controller.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;

    setIsVerifying(true);
    startAttestation("Verifying milestone...");

    let step: MilestoneFlowStep = "fetch";

    try {
      changeStepperStep("preparing");

      // Step 1: the on-chain recipient is part of the attested payload, so it is
      // resolved (and validated) BEFORE any wallet interaction — a legacy row
      // without one must never reach a transaction.
      const recipient = requireMilestoneRecipient(milestone);

      // Step 2: Setup chain and wallet
      step = "setup";
      const chainSetup = await setupChainAndWalletForMilestone(milestone);
      if (!chainSetup) return;

      const alreadyCompleted = !!milestone.completionDetails;
      const completionReason = milestone.fundingApplicationCompletion?.completionText;

      let includeCompletion = !alreadyCompleted;

      // Step 3: Handle completion and verification based on reviewer status
      if (isMilestoneReviewer && !alreadyCompleted) {
        // Reviewer flow: Complete via backend, then verify on-chain (verification only)
        // Pass full programId (composite format) and attestation chainId to backend
        step = "backend";
        await completeViaBackend(milestone, completionReason ?? "", attestationChainId);

        includeCompletion = false;
      }

      step = "attest";
      const onChainConfirmed = await attestMilestonesOnChain(
        recipient,
        milestone,
        chainSetup,
        projectUID,
        {
          includeCompletion,
          completionReason,
          verificationComment,
        },
        (nextStep) => {
          step = nextStep;
        },
        signal
      );

      // Component unmounted mid-flight. Skip onSuccess + further work;
      // the consumer is gone and the success toast is meaningless.
      if (signal.aborted) {
        return;
      }

      if (!onChainConfirmed) {
        throw new Error("On-chain attestation was not confirmed");
      }

      // Success callback - backend will sync to off-chain database automatically
      onSuccess?.();
    } catch (error: unknown) {
      if (isAbortError(error)) {
        // Silent — component unmounted during the flow.
        return;
      }
      reportMilestoneFailure(error, "verify", step, milestone, projectUID);
    } finally {
      if (!signal.aborted) {
        setIsVerifying(false);
      }
      dismiss();
    }
  };

  /**
   * Completes a milestone on the grantee's behalf as a community admin.
   * The completion attestation is signed by — and attributed to — the
   * admin's connected wallet. Reviewers are not granted this action; that
   * gating lives in the calling UI.
   */
  const completeMilestone = async (
    milestone: GrantMilestoneWithCompletion,
    data: ProjectGrantMilestonesResponse,
    completionComment: string
  ) => {
    if (!data) {
      showError("This milestone is still loading. Please try again.");
      return;
    }

    if (!milestone.uid) {
      showError("Cannot complete milestone without UID");
      return;
    }

    const projectUID = data.project.uid;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;

    setIsCompleting(true);
    startAttestation("Completing milestone...");

    let step: MilestoneFlowStep = "fetch";

    try {
      changeStepperStep("preparing");

      const recipient = requireMilestoneRecipient(milestone);

      step = "setup";
      const chainSetup = await setupChainAndWalletForMilestone(milestone);
      if (!chainSetup) return;

      const { gapClient, walletSigner } = chainSetup;

      step = "attest";
      const milestoneCompletedSchema = gapClient.findSchema("MilestoneCompleted");
      const completionAttestation = new MilestoneCompleted({
        data: sanitizeObject({
          reason: completionComment || "",
          proofOfWork: "",
          type: "completed",
        }),
        refUID: milestone.uid as Hex,
        schema: milestoneCompletedSchema,
        recipient,
      });
      const payloads = [await completionAttestation.payloadFor(0)];

      changeStepperStep("pending");

      const result = await GapContract.multiAttest(walletSigner, payloads, changeStepperStep);

      changeStepperStep("indexing");

      const txHash = result?.tx[0]?.hash || undefined;
      await notifyIndexerAndInvalidateCache(txHash, +milestone.chainId, payloads.length);

      step = "poll";
      await pollForCompletionStatus(projectUID, milestone, signal);

      if (signal.aborted) return;

      changeStepperStep("indexed");
      showSuccess("Milestone completed successfully!");

      onSuccess?.();
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return;
      }
      reportMilestoneFailure(error, "complete", step, milestone, projectUID);
    } finally {
      if (!signal.aborted) {
        setIsCompleting(false);
      }
      dismiss();
    }
  };

  return {
    verifyMilestone,
    isVerifying,
    completeMilestone,
    isCompleting,
  };
};
