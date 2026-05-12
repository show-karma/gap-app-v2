"use client";

import { MilestoneCompleted } from "@show-karma/karma-gap-sdk/core/class/types/attestations";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { retryUntilConditionMet } from "@/utilities/retries";
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
  const [pendingTitles, setPendingTitles] = useState<Set<string>>(new Set());

  const mutation = useMutation({
    mutationFn: async (params: SubmitMilestoneCompletionParams) => {
      if (!address) {
        throw new Error("Please connect your wallet to submit a completion");
      }

      const chainID = params.statusEntry.chainID;
      const grantUID = params.statusEntry.grantUID;

      setPendingTitles((prev) => new Set(prev).add(params.milestoneTitle));

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
        let indexerCaughtUp = false;
        try {
          await retryUntilConditionMet(
            async () => {
              const [data] = await fetchData<Application>(
                INDEXER.V2.FUNDING_APPLICATIONS.GET(params.referenceNumber)
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
            2000
          );
          indexerCaughtUp = true;
        } catch {
          // Polling timed out — the on-chain attestation is still valid,
          // the indexer is just slow. Surface a softer message; the
          // badge will flip on the next page load.
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
            toast.success("Invoice submitted successfully");
            await queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.APPLICATIONS.INVOICE_CONFIG(params.referenceNumber),
            });
          } catch {
            // Non-fatal — the on-chain completion already shipped.
            toast.error("Failed to submit invoice");
          }
        }
      } finally {
        setPendingTitles((prev) => {
          const next = new Set(prev);
          next.delete(params.milestoneTitle);
          return next;
        });
      }
    },
    onError: (error: Error) => {
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
    isPendingFor: (milestoneTitle: string) => pendingTitles.has(milestoneTitle),
  };
}
