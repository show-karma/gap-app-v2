import type { MilestoneStatusEntry } from "@/types/whitelabel-entities";

/**
 * Build a lookup index over `milestoneStatuses[]` keyed two ways:
 *
 *   1. `uid:<milestoneUID>` — primary, used once the slot has been
 *      anchored on-chain.
 *   2. `label:<fieldLabel>:<title>` — fallback for slots that haven't
 *      been anchored yet (no milestoneUID). Includes fieldLabel because
 *      same-title milestones across different fields are common (e.g.
 *      two fields each containing a "Milestone 1").
 *
 * Pair with `lookupMilestoneStatus` at consumer sites — both halves
 * live here so a future keying change touches one file.
 */
export function buildMilestoneStatusIndex(
  entries?: MilestoneStatusEntry[]
): Map<string, MilestoneStatusEntry> {
  const index = new Map<string, MilestoneStatusEntry>();
  for (const e of entries ?? []) {
    if (e.milestoneUID) index.set(`uid:${e.milestoneUID}`, e);
    index.set(`label:${e.fieldLabel ?? ""}:${e.title}`, e);
  }
  return index;
}

/**
 * Resolve a single milestone's status entry from the index built by
 * `buildMilestoneStatusIndex`. Prefers UID matching when both sides
 * have one; falls back to the (fieldLabel, title) composite key.
 */
export function lookupMilestoneStatus(
  index: Map<string, MilestoneStatusEntry>,
  milestoneUID: string | undefined,
  fieldLabel: string | undefined,
  title: string
): MilestoneStatusEntry | undefined {
  return (
    (milestoneUID ? index.get(`uid:${milestoneUID}`) : undefined) ??
    index.get(`label:${fieldLabel ?? ""}:${title}`)
  );
}

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
 * A milestone is "Past Due" when it has a due date in the past AND has
 * not yet been completed or verified. Pending future-due milestones
 * stay Pending; completed/verified milestones never reclassify as Past
 * Due even if their due date was in the past at completion time.
 *
 * The predicate name keeps the older "Late" wording for backward
 * compatibility — the user-facing label is "Past Due".
 */
export function isMilestoneLate(statusEntry?: MilestoneStatusEntry): boolean {
  if (!statusEntry) return false;
  if (isMilestoneCompleted(statusEntry) || isMilestoneVerified(statusEntry)) return false;
  if (!statusEntry.dueDate) return false;
  const dueMs = new Date(statusEntry.dueDate).getTime();
  return Number.isFinite(dueMs) && dueMs < Date.now();
}
