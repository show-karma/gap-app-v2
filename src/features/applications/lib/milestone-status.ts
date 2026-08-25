import type { MilestoneStatusEntry } from "@/types/whitelabel-entities";

/**
 * Build a stable composite key from (fieldLabel, title). A plain
 * `${fieldLabel}:${title}` concatenation would collide when title
 * contains a colon (e.g. "Phase 1: Beta launch") — JSON-encoding the
 * tuple is the cheapest unambiguous form: array boundaries can't be
 * forged by content inside the strings.
 */
function makeLabelKey(fieldLabel: string | undefined, title: string): string {
  return `label:${JSON.stringify([fieldLabel ?? "", title])}`;
}

/**
 * Build a lookup index over `milestoneStatuses[]` keyed two ways:
 *
 *   1. `uid:<milestoneUID>` — primary, used once the slot has been
 *      anchored on-chain.
 *   2. `label:["<fieldLabel>","<title>"]` — fallback for slots that
 *      haven't been anchored yet (no milestoneUID). Includes
 *      fieldLabel because same-title milestones across different
 *      fields are common (e.g. two fields each containing a
 *      "Milestone 1"). Encoded via `JSON.stringify` on the tuple so
 *      colons or quotes inside title/fieldLabel can't fabricate a
 *      colliding key.
 *
 * Intra-field same-title collisions (two milestones titled the same
 * inside the same form field) resolve **first-write-wins**: the
 * indexer sorts done entries to the bottom and pending by dueDate
 * ascending, so the first entry on a collision is the one a
 * displayed badge most likely refers to. Without this, a stale
 * "Completed" overrides a live "Pending" silently. UID keys still
 * overwrite (they're unique by construction).
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
    const labelKey = makeLabelKey(e.fieldLabel, e.title);
    if (!index.has(labelKey)) index.set(labelKey, e);
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
    index.get(makeLabelKey(fieldLabel, title))
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

/**
 * A milestone is Cancelled when the on-chain status was set to `cancelled`
 * (DEV-523). Cancelled is terminal — it takes precedence over every other
 * display state (completed, verified, late, pending), so callers must check
 * this first.
 */
export function isMilestoneCancelled(statusEntry?: MilestoneStatusEntry): boolean {
  if (!statusEntry) return false;
  return statusEntry.currentStatus === "cancelled";
}

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
 * not yet been completed or verified. Pending future-due milestones stay
 * Pending; completed/verified milestones never reclassify as Past Due
 * even if their due date was in the past at completion time.
 */
export function isMilestoneLate(statusEntry?: MilestoneStatusEntry): boolean {
  if (!statusEntry) return false;
  if (
    isMilestoneCompleted(statusEntry) ||
    isMilestoneVerified(statusEntry) ||
    isMilestoneCancelled(statusEntry)
  )
    return false;
  if (!statusEntry.dueDate) return false;
  const dueMs = new Date(statusEntry.dueDate).getTime();
  return Number.isFinite(dueMs) && dueMs < Date.now();
}
