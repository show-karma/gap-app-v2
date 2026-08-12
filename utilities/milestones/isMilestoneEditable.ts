import type { UnifiedMilestone } from "@/types/v2/roadmap";

/**
 * Whether `milestone` is still in the PENDING lifecycle state the SDK requires
 * for an edit.
 *
 * Mirrors the guard in karma-gap-sdk `Milestone.edit()`, which throws
 * `AttestationError("ATTEST_ERROR", "Cannot edit milestone that is not in
 * PENDING state")` once a milestone is completed or verified. Surfacing the
 * same rule in the UI keeps the Edit affordance from opening a dialog whose
 * submit can only fail (Sentry GAP-FRONTEND-202).
 *
 * This is deliberately separate from `canEditMilestone`, which answers the
 * *authorization* question and also governs "Revoke Completion" — an action
 * that legitimately targets completed milestones.
 */
export const isMilestoneEditable = (milestone: UnifiedMilestone | null | undefined): boolean => {
  if (!milestone) return false;
  if (milestone.completed) return false;

  const grantMilestone = milestone.source?.grantMilestone?.milestone;
  const projectMilestone = milestone.source?.projectMilestone;

  if (grantMilestone?.completed) return false;
  if (projectMilestone?.completed) return false;

  // V2 serves `verified` as an array of verification attestations; older
  // project-milestone payloads still surface a plain boolean.
  const verifiedSources = [grantMilestone?.verified, projectMilestone?.verified];
  const isVerified = verifiedSources.some((verified) =>
    Array.isArray(verified) ? verified.length > 0 : Boolean(verified)
  );

  return !isVerified;
};
