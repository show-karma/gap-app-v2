"use client";

import { MilestoneCompleted } from "@show-karma/karma-gap-sdk/core/class/types/attestations";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import { useWallet } from "@/hooks/useWallet";
import { submitGranteeInvoice } from "@/src/features/payout-disbursement/services/payout-disbursement.service";
import { applicationKeys } from "@/src/lib/query-keys";
import type { GrantMilestoneWithDetails } from "@/types/v2/roadmap";
import type { MilestoneStatusEntry } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { sanitizeObject } from "@/utilities/sanitize";
import { isUserCancellationError } from "@/utilities/wallet-errors";

export interface InvoiceFile {
  fileKey: string;
  fileUrl: string;
}

export interface SubmitMilestoneCompletionParams {
  milestoneTitle: string;
  proofOfWork: string;
  referenceNumber: string;
  invoiceFile?: InvoiceFile | null;
  /**
   * The rich on-chain milestone (carries `recipient`, `grant.uid`, `chainId`).
   * Both the project page and the application detail page fetch and pass
   * this — the application detail page via `useProjectUpdates(projectUID)`
   * filtered to milestones whose UID is linked on the application.
   */
  grantMilestone?: GrantMilestoneWithDetails;
  /**
   * Optional fallback for grantUID/chainID when the rich milestone doesn't
   * carry one (older indexer payloads). Sourced from `application.milestoneStatuses`.
   */
  statusEntry?: MilestoneStatusEntry;
  /** Project-page wiring — overrides any UID/chain on the rich milestone. */
  grantUID?: string;
  chainID?: number;
}

interface ResolvedTarget {
  milestone: GrantMilestoneWithDetails;
  grantUID: string;
  chainID: number;
  recipient: `0x${string}`;
}

/**
 * Resolve the rich milestone + grantUID + chainID + recipient needed by
 * the on-chain attestation. Caller is expected to wire `grantMilestone`
 * (loaded from /v2/projects/:idOrSlug/updates); we just pick the best
 * available source for each downstream field.
 */
function resolveAttestationTarget(
  params: SubmitMilestoneCompletionParams
): ResolvedTarget {
  if (!params.grantMilestone) {
    throw new Error("Milestone or grant information missing");
  }

  const grantUID =
    params.grantUID ??
    params.grantMilestone.grant?.uid ??
    params.statusEntry?.grantUID;
  if (!grantUID) {
    throw new Error("Milestone or grant information missing");
  }

  const chainIDFromMilestone = params.grantMilestone.chainId
    ? Number(params.grantMilestone.chainId)
    : undefined;
  const chainID =
    params.chainID ??
    (Number.isFinite(chainIDFromMilestone) ? (chainIDFromMilestone as number) : undefined) ??
    params.statusEntry?.chainID;
  if (chainID === undefined) {
    throw new Error("Milestone or grant information missing");
  }

  const recipient = params.grantMilestone.recipient as `0x${string}` | undefined;
  if (!recipient) {
    throw new Error("Milestone is missing a recipient address");
  }

  return { milestone: params.grantMilestone, grantUID, chainID, recipient };
}

/**
 * React Query mutation that submits a milestone completion on-chain via the
 * connected EOA wallet. Mirrors the proven pattern in
 * `useMilestoneCompletionVerification` — no smart-wallet / Privy / zerodev
 * dependency, just `setupChainAndWallet` → `MilestoneCompleted.attest(signer)`.
 *
 * Flow (per call):
 *   1. Resolve the rich milestone + grantUID + chainID + recipient.
 *   2. `setupChainAndWallet` — switches network if needed and yields a
 *      `gapClient` + `walletSigner` (EOA, via wagmi).
 *   3. Build a `MilestoneCompleted` attestation (`type: "completed"`).
 *   4. `attestation.attest(walletSigner)` — wallet popup, user signs and
 *      pays gas.
 *   5. Notify the indexer with the tx hash and invalidate the relevant
 *      caches so the badge flips from Pending → Completed.
 *   6. Optionally persist a grantee invoice attached to the same milestone.
 *
 * Tracks per-row pending state via `pendingTitles` so the UI can render a
 * row-scoped "Processing on-chain..." hint while the global mutation is
 * `isPending`.
 */
export function useSubmitMilestoneCompletion() {
  const queryClient = useQueryClient();
  const { address, chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { setupChainAndWallet } = useSetupChainAndWallet();
  const [pendingTitles, setPendingTitles] = useState<Set<string>>(new Set());

  const mutation = useMutation({
    mutationFn: async (params: SubmitMilestoneCompletionParams) => {
      if (!address) {
        throw new Error("Please connect your wallet to submit a completion");
      }

      const target = resolveAttestationTarget(params);

      setPendingTitles((prev) => new Set(prev).add(params.milestoneTitle));

      try {
        const setup = await setupChainAndWallet({
          targetChainId: target.chainID,
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
            reason: params.proofOfWork,
            proofOfWork: "",
            type: "completed",
          }),
          refUID: target.milestone.uid as Hex,
          schema,
          recipient: target.recipient,
        });

        const result = await attestation.attest(walletSigner);
        const txHash: string | undefined = result?.tx?.[0]?.hash ?? undefined;

        // Best-effort indexer kick — the indexer also picks up attestations
        // from the chain itself, so a failure here is not fatal.
        if (txHash) {
          try {
            await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, target.chainID), "POST", {});
          } catch {
            // swallow — chain-side ingestion will catch up
          }
        }

        toast.success("Milestone completion submitted. Processing on-chain...");

        // Refresh: project updates feed (where MilestonesTab reads grant
        // milestones from) + the application response itself (carries
        // `milestoneStatuses` — the source for status badges). The
        // application key tree is broad on purpose so any cached variant
        // (auth-on / auth-off) flips together.
        await queryClient.invalidateQueries({ queryKey: applicationKeys.all });
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(
            target.milestone.grant?.uid ?? "",
            target.grantUID
          ),
        });

        if (params.invoiceFile) {
          try {
            await submitGranteeInvoice(target.grantUID, {
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
