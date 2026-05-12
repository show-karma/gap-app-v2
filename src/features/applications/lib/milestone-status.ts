import type { MilestoneStatusEntry } from "@/types/whitelabel-entities";

/**
 * Display-time status helpers for application milestones.
 *
 * The application detail page reads on-chain status from
 * `milestoneStatuses[]` (authoritative — sourced from the indexer's
 * GRANTS table, the same store the on-chain attestation processor
 * writes to). A missing entry means the milestone hasn't been linked
 * on-chain yet — treat as Pending.
 */

export function isMilestoneVerified(statusEntry?: MilestoneStatusEntry): boolean {
  if (!statusEntry) return false;
  return statusEntry.currentStatus === "verified" || !!statusEntry.verified;
}

export function isMilestoneCompleted(statusEntry?: MilestoneStatusEntry): boolean {
  if (!statusEntry) return false;
  return statusEntry.currentStatus === "completed" || !!statusEntry.completed;
}

/**
 * A milestone is "Late" when it has a due date in the past AND has not
 * yet been completed or verified. Pending future-due milestones stay
 * Pending; completed/verified milestones never reclassify as Late even
 * if their due date was in the past at completion time.
 */
export function isMilestoneLate(statusEntry?: MilestoneStatusEntry): boolean {
  if (!statusEntry) return false;
  if (isMilestoneCompleted(statusEntry) || isMilestoneVerified(statusEntry)) return false;
  if (!statusEntry.dueDate) return false;
  const dueMs = new Date(statusEntry.dueDate).getTime();
  return Number.isFinite(dueMs) && dueMs < Date.now();
}
