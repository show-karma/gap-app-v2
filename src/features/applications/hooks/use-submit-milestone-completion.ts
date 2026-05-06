"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { useMilestoneAttestation } from "@/src/features/milestones/hooks/useMilestoneAttestation";
import { submitGranteeInvoice } from "@/src/features/payout-disbursement/services/payout-disbursement.service";
import type { GrantMilestoneWithDetails } from "@/types/v2/roadmap";
import type { MilestoneData, MilestoneStatusEntry } from "@/types/whitelabel-entities";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { fetchGrantMilestoneByUID } from "../services/milestone-completion.service";

export interface InvoiceFile {
  fileKey: string;
  fileUrl: string;
}

export interface SubmitMilestoneCompletionParams {
  milestoneTitle: string;
  proofOfWork: string;
  referenceNumber: string;
  invoiceFile?: InvoiceFile | null;
  /** Application-page wiring: the loose form data + on-chain status entry. */
  milestoneData?: MilestoneData;
  statusEntry?: MilestoneStatusEntry;
  /** Project-page wiring: the rich milestone + grantUID are already known. */
  grantMilestone?: GrantMilestoneWithDetails;
  grantUID?: string;
  chainID?: number;
}

interface ResolvedTarget {
  milestone: GrantMilestoneWithDetails;
  grantUID: string;
  chainID: number;
}

/**
 * Resolve the rich milestone + grantUID + chainID needed by the
 * attestation mutation. Two wiring paths:
 *
 *   1. Project page: caller passes `grantMilestone` + `grantUID` directly.
 *   2. Application detail page: caller passes `milestoneData` (with
 *      `milestoneUID`) + `statusEntry` (with `grantUID` + `chainID`),
 *      and we fetch the rich payload on demand from the indexer.
 *
 * Throws a domain-specific Error when neither path is satisfied so the
 * caller's `onError` can render a single, clear toast.
 */
async function resolveAttestationTarget(
  params: SubmitMilestoneCompletionParams
): Promise<ResolvedTarget> {
  if (params.grantMilestone && params.grantUID) {
    return {
      milestone: params.grantMilestone,
      grantUID: params.grantUID,
      chainID: params.chainID ?? 8453,
    };
  }

  if (params.milestoneData?.milestoneUID && params.statusEntry) {
    const milestone = await fetchGrantMilestoneByUID(
      params.milestoneData.milestoneUID,
      params.statusEntry.chainID
    );
    return {
      milestone,
      grantUID: params.grantUID ?? params.statusEntry.grantUID,
      chainID: params.statusEntry.chainID,
    };
  }

  throw new Error("Milestone or grant information missing");
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
      const target = await resolveAttestationTarget(params);

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
