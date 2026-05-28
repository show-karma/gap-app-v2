"use client";

import { MilestoneCompleted } from "@show-karma/karma-gap-sdk/core/class/types/attestations";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import { submitGranteeInvoice } from "@/src/features/payout-disbursement/services/payout-disbursement.service";
import type { Application, MilestoneStatusEntry } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { isAbortError, retryUntilConditionMet } from "@/utilities/retries";
import { sanitizeObject } from "@/utilities/sanitize";
import { isUserCancellationError } from "@/utilities/wallet-errors";

export interface InvoiceFile {
  fileKey: string;
  fileUrl: string;
}

export interface SubmitMilestoneCompletionParams {
  milestoneTitle: string;
  /** On-chain milestone UID — refUID for the completion attestation. */
  milestoneUID: string;
  /**
   * On-chain status entry from `application.milestoneStatuses[]` —
   * carries the authoritative `grantUID` + `chainID` for the attestation.
   */
  statusEntry: MilestoneStatusEntry;
  proofOfWork: string;
  referenceNumber: string;
  invoiceFile?: InvoiceFile | null;
}

/**
 * React Query mutation that submits a milestone completion on-chain via the
 * connected EOA wallet. No Privy / zerodev — wagmi's wallet popup, user
 * signs and pays gas.
 *
 * Flow:
 *   1. `setupChainAndWallet` — switch network if needed; yields a
 *      `gapClient` + EOA `walletSigner`.
 *   2. Build a `MilestoneCompleted` attestation (`type: "completed"`,
 *      user's text in `reason`).
 *   3. `attestation.attest(walletSigner)` — wallet popup, signature, gas.
 *   4. Best-effort `index-by-transaction` kick (silent on failure —
 *      propagation lag is expected; the indexer's chain scan picks the
 *      tx up regardless).
 *   5. Poll `GET /v2/funding-applications/:referenceNumber` until
 *      `milestoneStatuses[milestoneUID]` reflects the new completion.
 *      ~60s budget; falls through to a softer toast if the indexer is
 *      slow.
 *   6. Invalidate every cached query that feeds the editor so the badge
 *      flips and the completion text appears.
 *   7. Optionally persist a grantee invoice attached to the milestone.
 */
export function useSubmitMilestoneCompletion() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { address, chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { setupChainAndWallet } = useSetupChainAndWallet();
  // Keyed by milestoneUID (preferred — globally unique) with a title
  // fallback for the edge case of a slot that hasn't been anchored
  // on-chain yet. Title-only keys collide between same-titled milestones
  // (a real shape — see APP-2L75H7UQ-RITZ0N's repeated "Milestone 2").
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const pendingKeyFor = (milestoneUID: string, milestoneTitle: string) =>
    milestoneUID || milestoneTitle;

  // Tracks the AbortController for any in-flight mutation. React Query
  // v5 doesn't cancel `mutationFn` on unmount, so the polling loop
  // would otherwise outlive the component, fire `router.refresh()` on a
  // route the user already left, and burn ~30 unnecessary network
  // requests. The controller is re-created at every mutation start and
  // aborted on cleanup.
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async (params: SubmitMilestoneCompletionParams) => {
      if (!address) {
        throw new Error("Please connect your wallet to submit a completion");
      }

      const chainID = params.statusEntry.chainID;
      const grantUID = params.statusEntry.grantUID;

      // Abort any prior in-flight mutation and start a fresh controller
      // for this submission. Required because overwriting `controllerRef.current`
      // below would orphan the previous controller — the unmount cleanup
      // can only abort what the ref currently points to.
      //
      // Side effect: concurrent submissions on the same hook instance
      // cancel each other's polls. React Query's `useMutation` does NOT
      // serialize parallel `mutate()` calls; calling submit() twice fires
      // both mutationFns in parallel. In practice wallet-driven attestations
      // serialize at the wallet layer (one popup at a time), so the
      // post-attestation poll for the cancelled mutation gets dropped —
      // on-chain state is still correct, only the toast and `router.refresh()`
      // for the earlier submission are suppressed. If per-milestone
      // independent cancellation becomes a requirement, switch to a
      // `Map<pendingKey, AbortController>` keyed by milestoneUID.
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const { signal } = controller;

      const pendingKey = pendingKeyFor(params.milestoneUID, params.milestoneTitle);
      setPendingKeys((prev) => new Set(prev).add(pendingKey));

      try {
        const setup = await setupChainAndWallet({
          targetChainId: chainID,
          currentChainId: chain?.id,
          switchChainAsync,
        });
        if (!setup) {
          throw new Error("Failed to setup chain and wallet");
        }
        const { gapClient, walletSigner } = setup;

        const schema = gapClient.findSchema("MilestoneCompleted");
        const attestation = new MilestoneCompleted({
          data: sanitizeObject({
            // Free-text completion goes in `reason` per the SDK convention
            // — `proofOfWork` is reserved for an optional URL/proof.
            reason: params.proofOfWork,
            proofOfWork: "",
            type: "completed",
          }),
          refUID: params.milestoneUID as Hex,
          schema,
          // Grantee attests to their own completion → recipient is the
          // signer. The on-chain resolver enforces auth; we don't need
          // a separate canAttest check.
          recipient: address as `0x${string}`,
        });

        const result = await attestation.attest(walletSigner);
        const txHash: string | undefined = result?.tx?.[0]?.hash ?? undefined;

        // Best-effort indexer kick. The endpoint races the indexer's
        // RPC propagation (the wallet's RPC is ahead), so a 500 here on
        // the first call is normal. The indexer's chain-scan job
        // ingests the tx regardless — the polling below waits until the
        // completion is visible end-to-end before we declare success.
        if (txHash) {
          fetchData(INDEXER.ATTESTATION_LISTENER(txHash, chainID), "POST", {}).catch(() => {
            // intentional — propagation lag is expected, not an error
          });
        }

        // Poll the application response until milestoneStatuses reflects
        // the new completion. ~60s budget (30 × 2s); a slow indexer
        // falls through to the "still processing" branch instead of
        // failing the mutation. The indexer publishes BOTH application
        // and project-source milestones into milestoneStatuses[], so
        // this single poll covers every row in the Milestones tab.
        //
        // The signal cancels both the loop's sleep and the in-flight
        // fetch when the consuming component unmounts mid-poll.
        let indexerCaughtUp = false;
        let aborted = false;
        try {
          await retryUntilConditionMet(
            async () => {
              const [data] = await fetchData<Application>(
                INDEXER.V2.FUNDING_APPLICATIONS.GET(params.referenceNumber),
                "GET",
                {},
                {},
                {},
                true,
                false,
                undefined,
                signal
              );
              if (!data) return false;
              const entry = data.milestoneStatuses?.find(
                (m) => m.milestoneUID === params.milestoneUID
              );
              return (
                !!entry &&
                (entry.currentStatus === "completed" ||
                  entry.currentStatus === "verified" ||
                  !!entry.completed)
              );
            },
            undefined,
            30,
            2000,
            signal
          );
          indexerCaughtUp = true;
        } catch (error) {
          if (isAbortError(error)) {
            aborted = true;
          }
          // Polling timed out — the on-chain attestation is still valid,
          // the indexer is just slow. Surface a softer message; the
          // badge will flip on the next page load.
        }

        // Component unmounted mid-poll. Skip every side-effect that would
        // hit an unmounted route or surface a toast the user can't see.
        if (aborted || signal.aborted) {
          return;
        }

        toast.success(
          indexerCaughtUp
            ? "Milestone marked as completed"
            : "Submitted on-chain. Indexer is still processing — refresh in a moment to see the update."
        );

        // The application detail page is a Server Component — application
        // data is fetched server-side at request time and passed as a
        // static prop, NOT through React Query. Trigger Next.js to re-run
        // the server fetch + re-render the page so the new
        // milestoneStatuses payload propagates to the editor.
        router.refresh();

        if (params.invoiceFile) {
          try {
            await submitGranteeInvoice(grantUID, {
              milestoneLabel: params.milestoneTitle,
              invoiceFileKey: params.invoiceFile.fileKey,
              invoiceFileUrl: params.invoiceFile.fileUrl,
            });
            if (signal.aborted) return;
            toast.success("Invoice submitted successfully");
            await queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.APPLICATIONS.INVOICE_CONFIG(params.referenceNumber),
            });
          } catch (invoiceError) {
            if (signal.aborted) return;
            // Non-fatal — the on-chain completion already shipped. Surface
            // the backend's specific reason (e.g. a 409 conflict message)
            // instead of a generic string; fall back only when absent.
            const message =
              invoiceError instanceof Error && invoiceError.message
                ? invoiceError.message
                : "Failed to submit invoice";
            toast.error(message);
          }
        }
      } finally {
        setPendingKeys((prev) => {
          const next = new Set(prev);
          next.delete(pendingKey);
          return next;
        });
      }
    },
    onError: (error: Error) => {
      if (isAbortError(error)) {
        // Component unmounted mid-mutation — silent. No toast, no Sentry.
        return;
      }
      if (isUserCancellationError(error)) {
        toast.error("Completion cancelled");
        return;
      }
      toast.error(error?.message || "Failed to submit milestone completion");
      errorManager("Error submitting milestone completion", error);
    },
  });

  return {
    submit: mutation.mutateAsync,
    isPending: mutation.isPending,
    isPendingFor: (milestoneUID: string | undefined, milestoneTitle: string) =>
      pendingKeys.has(pendingKeyFor(milestoneUID ?? "", milestoneTitle)),
  };
}
