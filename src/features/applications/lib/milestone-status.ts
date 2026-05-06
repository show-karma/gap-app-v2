import type { GrantMilestoneWithDetails } from "@/types/v2/roadmap";
import type { MilestoneStatusEntry } from "@/types/whitelabel-entities";

/**
 * Display-time status helpers for application milestones.
 *
 * The application detail page reads on-chain status from the new
 * `milestoneStatuses[]` array (authoritative — sourced from the indexer's
 * GRANTS table). Older callers and the project page still pass a richer
 * `GrantMilestoneWithDetails` via `grantMilestones`. These helpers prefer
 * the new entry when present and fall through to the legacy field
 * otherwise — so a single component can render correctly under either
 * wiring.
 */

export function isMilestoneVerified(
  statusEntry?: MilestoneStatusEntry,
  grantMilestone?: GrantMilestoneWithDetails | null
): boolean {
  if (statusEntry) {
    return statusEntry.currentStatus === "verified" || !!statusEntry.verified;
  }
  return !!grantMilestone?.verificationDetails;
}

export function isMilestoneCompleted(
  statusEntry?: MilestoneStatusEntry,
  grantMilestone?: GrantMilestoneWithDetails | null
): boolean {
  if (statusEntry) {
    return statusEntry.currentStatus === "completed" || !!statusEntry.completed;
  }
  return !!grantMilestone?.completionDetails;
}
