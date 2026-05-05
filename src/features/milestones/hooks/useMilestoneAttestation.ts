/**
 * useMilestoneAttestation Hook
 *
 * Provides React Query mutations for on-chain milestone attestations via the user's Privy smart wallet.
 * Mirrors the architecture of useGrantCompletion — NO backend preflight POST, NO record POST.
 *
 * Flow:
 * 1. Client-side permission check from precomputed DTO flags (canAttest)
 * 2. Get signer via useGaslessSigner (smart wallet gasless if ready, else EOA fallback)
 * 3. SDK call: milestone.complete/approve/reject/verify(signer, ...)
 * 4. Poll milestone read endpoint until status flips or indexer rejects
 * 5. Return tx hash + attestation UID
 *
 * Smart wallet ensures user's address is the on-chain attester (EIP-7702).
 * NO gelatoOpts.useGasless. NO EIP-712 signature middleware. NO backend endpoints.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGaslessSigner } from "@/hooks/useGaslessSigner";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import type { GrantMilestoneWithDetails } from "@/types/v2/roadmap";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { sanitizeObject } from "@/utilities/sanitize";
import { isUserCancellationError } from "@/utilities/wallet-errors";
import fetchData from "@/utilities/fetchData";
import toast from "react-hot-toast";

/**
 * Supported milestone attestation actions corresponding to the SDK's MilestoneCompleted schema.
 */
export type MilestoneAttestationAction = "complete" | "approve" | "reject" | "verify";

/**
 * Parameters for a milestone attestation mutation.
 */
export interface MilestoneAttestationParams {
  milestone: GrantMilestoneWithDetails;
  action: MilestoneAttestationAction;
  chainID: number;
  proofOfWork?: string; // For complete and verify actions
  reason?: string; // For reject action
  grantUID: string; // For query invalidation
}

/**
 * Return value from a milestone attestation mutation.
 */
export interface MilestoneAttestationResult {
  txHash: string;
  attestationUID: string;
}

/**
 * Options for the hook.
 */
export interface UseMilestoneAttestationOptions {
  onSuccess?: (result: MilestoneAttestationResult, params: MilestoneAttestationParams) => void;
  onError?: (error: Error, params: MilestoneAttestationParams) => void;
}

/**
 * Hook return value with mutations for the 4 milestone actions.
 */
export interface UseMilestoneAttestationReturn {
  completeMutation: ReturnType<typeof useMutation>;
  approveMutation: ReturnType<typeof useMutation>;
  rejectMutation: ReturnType<typeof useMutation>;
  verifyMutation: ReturnType<typeof useMutation>;
  isSmartWalletReady: boolean;
}

/**
 * Poll the milestone read endpoint until the attestation surfaces or times out.
 *
 * The indexer may take up to 30 seconds to ingest and process the attestation.
 * This polls `GET /milestones/{uid}` watching for:
 * - Status change (indexer accepted)
 * - recentAttestations entry with decision='rejected' (indexer rejected)
 * - 30s timeout (still pending)
 */
async function pollMilestoneUntilSettled({
  milestoneUID,
  attestationUID,
  chainID,
  maxRetries = 20,
  retryDelayMs = 1500,
}: {
  milestoneUID: string;
  attestationUID: string;
  chainID: number;
  maxRetries?: number;
  retryDelayMs?: number;
}): Promise<{
  settled: boolean;
  reason?: string;
}> {
  let retries = maxRetries;

  while (retries > 0) {
    try {
      // Fetch the milestone to check status and recentAttestations
      // NOTE: This assumes a backend endpoint exists at INDEXER.MILESTONE(chainID, milestoneUID)
      // or similar. Adjust the URL based on your actual API structure.
      const milestone = await fetchData(
        `${INDEXER.INDEXER_API_URL}/v2/milestones/${milestoneUID}?chainId=${chainID}`,
        "GET"
      );

      if (!milestone) {
        retries -= 1;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }

      // Check recentAttestations for the one we just submitted
      const recentAttestations = milestone.recentAttestations || [];
      const attestation = recentAttestations.find(
        (a: { attestationUID: string }) => a.attestationUID === attestationUID
      );

      if (attestation) {
        if (attestation.decision === "accepted") {
          return { settled: true };
        }
        if (attestation.decision === "rejected") {
          return { settled: true, reason: attestation.rejectionReason || "Unknown rejection" };
        }
      }

      retries -= 1;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    } catch (error) {
      retries -= 1;
      // Continue polling even if a single request fails
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  // Timeout
  return { settled: false, reason: "Indexer processing timeout (still pending)" };
}

/**
 * Hook providing React Query mutations for on-chain milestone attestations.
 *
 * @param options - Hook options (callbacks)
 * @returns Object with 4 mutations (complete, approve, reject, verify) and wallet state
 *
 * @example
 * ```typescript
 * const { completeMutation, isSmartWalletReady } = useMilestoneAttestation();
 *
 * const handleComplete = async () => {
 *   await completeMutation.mutateAsync({
 *     milestone,
 *     action: 'complete',
 *     chainID: 8453, // Base
 *     proofOfWork: "Implemented feature X",
 *     grantUID: grant.uid,
 *   });
 * };
 * ```
 */
export function useMilestoneAttestation(
  options?: UseMilestoneAttestationOptions
): UseMilestoneAttestationReturn {
  const queryClient = useQueryClient();
  const { address, chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { getAttestationSigner, isSmartWalletReady } = useGaslessSigner();
  const { setupChainAndWallet } = useSetupChainAndWallet();
  const [isAttesting, setIsAttesting] = useState(false);

  /**
   * Core mutation function: submits an on-chain attestation via the smart account.
   */
  const executeAttestation = useCallback(
    async (params: MilestoneAttestationParams): Promise<MilestoneAttestationResult> => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      // Step 1: Client-side permission check from precomputed DTO flag
      const canAttest = (params.milestone as any).canAttest?.[params.action];
      if (!canAttest?.allowed) {
        const reason = canAttest?.reason || "No permission";
        throw new Error(`Not authorized to ${params.action} milestone: ${reason}`);
      }

      setIsAttesting(true);

      try {
        // Step 2: Setup chain and wallet
        const setup = await setupChainAndWallet({
          targetChainId: params.chainID,
          currentChainId: chain?.id,
          switchChainAsync,
        });

        if (!setup) {
          throw new Error("Failed to setup chain and wallet");
        }

        const { gapClient, walletSigner } = setup;

        // Step 3: Get the milestone entity from the SDK
        const gap = gapClient;
        const milestoneEntity = await gap.fetcher.milestoneById(params.milestone.uid);

        if (!milestoneEntity) {
          throw new Error("Milestone not found on-chain");
        }

        // Step 4: Get the smart wallet signer (gasless if ready, else EOA fallback)
        const signer = await getAttestationSigner(params.chainID);

        // DO NOT set GAP.gelatoOpts.useGasless — leave it OFF.
        // The signer's sendTransaction routes through the smart account.

        // Step 5: Execute the SDK call based on action
        let result;
        const sanitized = sanitizeObject({
          proofOfWork: params.proofOfWork || "",
          reason: params.reason || "",
        });

        switch (params.action) {
          case "complete": {
            result = await milestoneEntity.complete(signer, {
              proofOfWork: params.proofOfWork || "",
            });
            break;
          }
          case "approve": {
            result = await milestoneEntity.approve(signer, {
              reason: params.reason,
            });
            break;
          }
          case "reject": {
            result = await milestoneEntity.reject(signer, params.reason || "");
            break;
          }
          case "verify": {
            result = await milestoneEntity.verify(signer, {
              proofOfWork: params.proofOfWork,
            });
            break;
          }
          default: {
            throw new Error(`Unknown action: ${params.action}`);
          }
        }

        if (!result || !result.tx || !result.uids) {
          throw new Error("SDK returned invalid result");
        }

        const txHash = result.tx[0]?.hash;
        const attestationUID = result.uids[0];

        if (!txHash || !attestationUID) {
          throw new Error("SDK did not return tx hash or attestation UID");
        }

        // Step 6: Notify indexer (optional; indexer should pick it up from chain)
        try {
          await fetchData(
            INDEXER.ATTESTATION_LISTENER(txHash, params.chainID),
            "POST",
            {}
          );
        } catch {
          // Non-fatal; indexer will still pick it up from the chain
        }

        // Step 7: Poll for indexer settlement (no backend POST needed)
        const pollResult = await pollMilestoneUntilSettled({
          milestoneUID: params.milestone.uid,
          attestationUID,
          chainID: params.chainID,
        });

        if (!pollResult.settled) {
          // Timeout, but still successful on-chain. Show warning.
          toast.loading(
            "Milestone attestation submitted. Still awaiting indexer verification...",
            { duration: 5000 }
          );
        } else if (pollResult.reason && pollResult.reason !== "") {
          // Indexer rejected
          toast.error(`Milestone attestation rejected: ${pollResult.reason}`, {
            duration: 5000,
          });
        } else {
          // Accepted
          toast.success(`Milestone ${params.action}d successfully`, { duration: 4000 });
        }

        // Step 8: Invalidate queries so UI reflects new state
        queryClient.invalidateQueries({ queryKey: ["milestone", params.milestone.uid] });
        queryClient.invalidateQueries({ queryKey: ["grant", params.grantUID] });

        options?.onSuccess?.({ txHash, attestationUID }, params);

        return { txHash, attestationUID };
      } catch (error: any) {
        if (isUserCancellationError(error)) {
          toast.error("Milestone attestation cancelled");
        } else {
          toast.error(
            `Failed to ${params.action} milestone: ${error?.message || "Unknown error"}`
          );
          errorManager(`Error attesting milestone (${params.action})`, error, {
            milestoneUID: params.milestone.uid,
            grantUID: params.grantUID,
            action: params.action,
            address,
            chainID: params.chainID,
          });
        }
        options?.onError?.(error, params);
        throw error;
      } finally {
        setIsAttesting(false);
      }
    },
    [
      address,
      chain,
      switchChainAsync,
      setupChainAndWallet,
      getAttestationSigner,
      queryClient,
      options,
    ]
  );

  /**
   * Create React Query mutations for each action.
   * Using separate mutations allows callers to subscribe to individual action states.
   */
  const completeMutation = useMutation({
    mutationFn: (params: Omit<MilestoneAttestationParams, "action">) =>
      executeAttestation({ ...params, action: "complete" }),
    retry: false, // SDK call is one-shot; polling handles retries
  });

  const approveMutation = useMutation({
    mutationFn: (params: Omit<MilestoneAttestationParams, "action">) =>
      executeAttestation({ ...params, action: "approve" }),
    retry: false,
  });

  const rejectMutation = useMutation({
    mutationFn: (params: Omit<MilestoneAttestationParams, "action">) =>
      executeAttestation({ ...params, action: "reject" }),
    retry: false,
  });

  const verifyMutation = useMutation({
    mutationFn: (params: Omit<MilestoneAttestationParams, "action">) =>
      executeAttestation({ ...params, action: "verify" }),
    retry: false,
  });

  return {
    completeMutation,
    approveMutation,
    rejectMutation,
    verifyMutation,
    isSmartWalletReady,
  };
}
