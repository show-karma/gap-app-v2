import type { UnifiedMilestone } from "@/types/v2/roadmap";

/**
 * Whether `milestone` still looks like it is in the PENDING lifecycle state
 * that the SDK requires for an edit.
 *
 * karma-gap-sdk's `Milestone.edit()` throws `AttestationError("ATTEST_ERROR",
 * "Cannot edit milestone that is not in PENDING state")` when
 * `completed || approved || verified?.length`. This is an approximation of that
 * guard, not a mirror of it: it works from the indexer-shaped
 * `UnifiedMilestone`, whose fields do not map one-to-one onto the on-chain
 * attestation the SDK inspects. It is a UI affordance gate — cheap, and wrong
 * only in the safe direction (it may hide Edit on something the SDK would have
 * accepted; it should not offer Edit on something the SDK will reject).
 *
 * Two limits worth knowing:
 * - Project milestones carry no status string in `UnifiedMilestoneSource`, so
 *   an "approved" project milestone is only caught via its completion fields.
 * - Merged multi-grant milestones can carry sibling instances whose lifecycle
 *   differs from the representative milestone inspected here, so this gate is
 *   necessary but not sufficient — the edit hook pre-flights each instance.
 *
 * Deliberately separate from `canEditMilestone`, which answers the
 * *authorization* question and also governs "Revoke Completion" — an action
 * that legitimately targets completed milestones.
 */

/**
 * Raw indexer statuses that put a milestone past PENDING. Compared
 * case-insensitively because the indexer stores `currentStatus` in mixed case
 * and emits it verbatim. `approved` mirrors the SDK's `this.approved` clause
 * and `MilestoneStatusEnum.APPROVED`; it has no dedicated field on
 * `UnifiedMilestone`, so the status string is the only way to see it.
 * `rejected` is included because rejection presupposes a completion
 * attestation (the SDK's `reject()` requires one), which makes `this.completed`
 * truthy on-chain even though the indexer emits no `completionDetails` for
 * rejected rows.
 */
const NON_EDITABLE_STATUSES = new Set(["completed", "verified", "approved", "rejected"]);

export const isMilestoneEditable = (milestone: UnifiedMilestone | null | undefined): boolean => {
  if (!milestone) return false;
  if (milestone.completed) return false;

  const grantMilestone = milestone.source?.grantMilestone?.milestone;
  const projectMilestone = milestone.source?.projectMilestone;

  if (grantMilestone?.completed) return false;
  if (projectMilestone?.completed) return false;

  // Set unconditionally by the converter, outside its `isCompleted` ternary, so
  // it survives a status-case mismatch that leaves `completed`/`verified` empty.
  if (milestone.source?.grantMilestone?.completionDetails) return false;

  if (NON_EDITABLE_STATUSES.has(grantMilestone?.currentStatus?.toLowerCase() ?? "")) return false;

  // `verified` is an array of verification attestations on grant milestones and
  // a plain boolean on project milestones (see `UnifiedMilestoneSource`).
  const verifiedSources = [grantMilestone?.verified, projectMilestone?.verified];
  const isVerified = verifiedSources.some((verified) =>
    Array.isArray(verified) ? verified.length > 0 : Boolean(verified)
  );

  return !isVerified;
};
