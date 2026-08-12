import * as Sentry from "@sentry/nextjs";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import type { MilestoneAction } from "@/utilities/milestones/attestationFailure";

/**
 * The only two fields that decide the terminal cancelled state (DEV-523): the
 * derived `status` the indexer stores, and the on-chain cancellation overlay.
 * Narrowed to a `Pick` so poll snapshots and partial fixtures can be checked
 * without constructing a whole milestone.
 */
export type CancellableMilestone = Pick<GrantMilestoneWithCompletion, "status" | "cancellation">;

/**
 * Single source of truth for "is this milestone cancelled?".
 *
 * The overlay is checked alongside the status because the optimistic cancel
 * writes the overlay before the indexer has re-derived `status`, and a
 * status-only cancellation (legacy rows) carries no overlay at all.
 */
export const isMilestoneCancelled = (milestone: CancellableMilestone): boolean =>
  milestone.status === "cancelled" || milestone.cancellation != null;

/**
 * Shown wherever a verification is blocked by the cancelled state — the inline
 * notice on the milestone card and the pre-signature guard in the attestation
 * flow. Shared so both surfaces name the same recovery step: the indexer skips
 * completion/verification attestations on a cancelled milestone, so signing one
 * burns gas and then silently never appears.
 */
export const CANCELLED_MILESTONE_VERIFY_MESSAGE =
  "This milestone was cancelled, so its completion can no longer be verified. Un-cancel it first if it still needs review.";

/** Completion counterpart of {@link CANCELLED_MILESTONE_VERIFY_MESSAGE}. */
export const CANCELLED_MILESTONE_COMPLETE_MESSAGE =
  "This milestone was cancelled, so it can no longer be completed. Un-cancel it first if the work is still expected.";

/**
 * Pre-signature guard for the verify/complete attestation flows. Cancelled is
 * terminal, and the indexer ADMITS the attestation and then skips it — so a
 * signature here costs gas and then never surfaces, which the poll can only
 * report as an indexing timeout. The card already hides the buttons; this
 * catches the stale-data race.
 *
 * Tells the user why (via the caller's toast) and leaves a breadcrumb, then
 * returns `true` when the caller must stop before touching the wallet.
 */
export const rejectCancelledMilestone = (
  milestone: CancellableMilestone & Pick<GrantMilestoneWithCompletion, "uid">,
  action: MilestoneAction,
  showError: (message: string) => void,
  projectUid: string | undefined,
  programId: string | undefined
): boolean => {
  if (!isMilestoneCancelled(milestone)) return false;
  showError(
    action === "verify" ? CANCELLED_MILESTONE_VERIFY_MESSAGE : CANCELLED_MILESTONE_COMPLETE_MESSAGE
  );
  Sentry.addBreadcrumb({
    category: "milestone-attestation",
    level: "warning",
    message: `${action} milestone blocked: milestone is cancelled`,
    data: { milestoneUID: milestone.uid, projectUid, programId },
  });
  return true;
};
