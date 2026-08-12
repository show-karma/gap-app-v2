import type { UnifiedMilestone } from "@/types/v2/roadmap";

/**
 * Whether a grant milestone still looks editable, approximating the guard in
 * karma-gap-sdk's `Milestone.edit()` (which throws once a milestone is
 * completed, approved, verified or cancelled). A UI affordance gate only: it
 * errs toward hiding Edit rather than offering one that can only fail.
 *
 * Merged multi-grant milestones can carry siblings whose lifecycle differs
 * from the representative inspected here, so this is necessary but not
 * sufficient — the edit hook pre-flights each instance.
 */

/**
 * Raw indexer statuses that put a milestone past PENDING, compared
 * case-insensitively because the indexer emits `currentStatus` verbatim in
 * mixed case. A blocklist rather than a pending-allowlist, so unrecognised
 * future statuses stay editable instead of silently losing the affordance.
 */
const NON_EDITABLE_STATUSES = new Set([
  "completed",
  "verified",
  "approved",
  "rejected",
  "cancelled",
]);

export const isMilestoneEditable = (milestone: UnifiedMilestone | null | undefined): boolean => {
  if (!milestone) return false;
  if (milestone.completed) return false;

  const grantMilestone = milestone.source?.grantMilestone;
  if (grantMilestone?.milestone?.completed) return false;
  // Set unconditionally by the converter, outside its `isCompleted` ternary, so
  // it survives a status-case mismatch that leaves `completed` empty.
  if (grantMilestone?.completionDetails) return false;
  if (NON_EDITABLE_STATUSES.has(grantMilestone?.milestone?.currentStatus?.toLowerCase() ?? "")) {
    return false;
  }

  return !(grantMilestone?.milestone?.verified?.length ?? 0);
};
