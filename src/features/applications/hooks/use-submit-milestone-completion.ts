"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { useMilestoneAttestation } from "@/src/features/milestones/hooks/useMilestoneAttestation";
import { submitGranteeInvoice } from "@/src/features/payout-disbursement/services/payout-disbursement.service";
import type { GrantMilestoneWithDetails } from "@/types/v2/roadmap";
import type { MilestoneStatusEntry } from "@/types/whitelabel-entities";
import { QUERY_KEYS } from "@/utilities/queryKeys";

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
   * The rich on-chain milestone (carries `canAttest`, `grant.uid`,
   * `chainId`). Both the project page and the application detail page
   * fetch and pass this — the project page via `useProjectMilestones`,
   * the application detail page via `useProjectUpdates(projectUID)` and
   * filtering down to milestones whose UID is linked on the application.
   */
  grantMilestone?: GrantMilestoneWithDetails;
  /**
   * Optional fallback for grantUID when the rich milestone doesn't carry
   * one (e.g. the indexer omitted `.grant.uid` for older grants). The
   * application detail page passes the same value as
   * `statusEntry.grantUID`.
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
}

/**
 * Pull together the rich milestone + grantUID + chainID needed by the
 * attestation mutation. The caller is expected to supply
 * `grantMilestone` already loaded; we just pick the best-available
 * grantUID and chainID across the explicit prop, the milestone's own
 * `grant.uid`/`chainId`, and the `statusEntry` fallback.
 *
 * Throws a domain-specific Error when no `grantMilestone` is wired so
 * the caller's `onError` can render a single, clear toast.
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
    params.statusEntry?.chainID ??
    8453;

  return { milestone: params.grantMilestone, grantUID, chainID };
}

/**
 * React Query mutation that orchestrates a milestone completion submission:
 *
 *   1. Resolve the rich milestone + grantUID + chainID (see
 *      `resolveAttestationTarget`).
 *   2. Fire the on-chain `complete` attestation via `useMilestoneAttestation`.
 *   3. Optionally persist a grantee invoice attached to the same milestone.
 *
 * Tracks per-milestone "indexer pending" state so the UI can show a
 * "Processing on-chain…" hint scoped to the row that was submitted, even
 * while the React Query mutation reports overall `isPending`.
 *
 * Toasts:
 *   - Success: "Milestone completion submitted. Processing on-chain…"
 *   - Invoice success/failure handled inline (non-fatal).
 *   - Cancellation/wallet errors: the underlying `completeMutation`
 *     already toasts; we only surface our own "Milestone or grant
 *     information missing" so we don't double up.
 */
export function useSubmitMilestoneCompletion() {
  const queryClient = useQueryClient();
  const { completeMutation } = useMilestoneAttestation();
  const [pendingTitles, setPendingTitles] = useState<Set<string>>(new Set());

  const mutation = useMutation({
    mutationFn: async (params: SubmitMilestoneCompletionParams) => {
      const target = resolveAttestationTarget(params);

      setPendingTitles((prev) => new Set(prev).add(params.milestoneTitle));

      try {
        await completeMutation.mutateAsync({
          milestone: target.milestone,
          chainID: target.chainID,
          proofOfWork: params.proofOfWork,
          grantUID: target.grantUID,
        });

        toast.success("Milestone completion submitted. Processing on-chain...");

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
            // Non-fatal — completion attestation already shipped.
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
      // The wallet/cancellation/chain errors are already toasted by
      // `useMilestoneAttestation`. Only the resolution error is ours to
      // surface — without this branch it would fail silently.
      if (error?.message === "Milestone or grant information missing") {
        toast.error(error.message);
      }
    },
  });

  return {
    submit: mutation.mutateAsync,
    isPending: mutation.isPending,
    isPendingFor: (milestoneTitle: string) => pendingTitles.has(milestoneTitle),
  };
}
