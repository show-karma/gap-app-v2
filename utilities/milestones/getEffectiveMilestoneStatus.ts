import { MilestoneLifecycleStatus } from "@/src/features/payout-disbursement/types/payout-disbursement";
import {
  type MilestoneDueDateInput,
  normalizeMilestoneDueDateMs,
} from "@/utilities/milestones/milestoneDueDate";

/**
 * Deliberately accepts any string: the indexer emits `status` verbatim in mixed
 * case, so this function — not its callers — is where casing is settled. The
 * named members stay for editor completion.
 */
type MilestoneStatusInput =
  | MilestoneLifecycleStatus
  | "pending"
  | "completed"
  | "verified"
  | "past_due"
  | "cancelled"
  | (string & {})
  | null
  | undefined;

/**
 * Canonical lowercase form of a raw milestone status string.
 *
 * The indexer stores `currentStatus` in mixed case — `project.repository.ts`
 * matches both `'COMPLETED'` and `'completed'`, and `grant.repository.ts`
 * `$toLower`s the column — then emits it verbatim as `status`, lowercasing only
 * internally when it derives `completionDetails`. Every consumer that compares
 * a status string must therefore defend both casings; the lowercase literal
 * unions in `types/` describe intent, not runtime.
 */
export function normalizeMilestoneStatus(status: string | null | undefined): string | undefined {
  return status?.toLowerCase();
}

/** True when a milestone status string represents an on-chain cancellation (DEV-523). */
export function isCancelledMilestoneStatus(status: string | null | undefined): boolean {
  return normalizeMilestoneStatus(status) === MilestoneLifecycleStatus.CANCELLED;
}

/**
 * True when a milestone status string means the milestone is done — completed
 * or verified. An exact-match comparison reads an uppercase `COMPLETED` row as
 * pending, rendering a Pending badge and a live "Mark Milestone Complete"
 * button on work that is already delivered.
 */
export function isCompletedMilestoneStatus(status: string | null | undefined): boolean {
  const normalized = normalizeMilestoneStatus(status);
  return (
    normalized === MilestoneLifecycleStatus.COMPLETED ||
    normalized === MilestoneLifecycleStatus.VERIFIED
  );
}

export function getEffectiveMilestoneStatus(
  status: MilestoneStatusInput,
  dueDate: MilestoneDueDateInput,
  now: number = Date.now()
): MilestoneLifecycleStatus {
  // Cancelled is terminal (DEV-523): never upgrade it to past-due and never
  // let it default to pending.
  if (isCancelledMilestoneStatus(status)) return MilestoneLifecycleStatus.CANCELLED;

  const normalized = (normalizeMilestoneStatus(status) ||
    MilestoneLifecycleStatus.PENDING) as MilestoneLifecycleStatus;
  if (normalized !== MilestoneLifecycleStatus.PENDING) return normalized;

  const dueMs = normalizeMilestoneDueDateMs(dueDate);
  if (dueMs == null) return MilestoneLifecycleStatus.PENDING;
  return dueMs < now ? MilestoneLifecycleStatus.PAST_DUE : MilestoneLifecycleStatus.PENDING;
}

export const MILESTONE_STATUS_LABEL: Record<MilestoneLifecycleStatus, string> = {
  [MilestoneLifecycleStatus.PENDING]: "Pending",
  [MilestoneLifecycleStatus.COMPLETED]: "Completed",
  [MilestoneLifecycleStatus.VERIFIED]: "Verified",
  [MilestoneLifecycleStatus.PAST_DUE]: "Past Due",
  [MilestoneLifecycleStatus.CANCELLED]: "Cancelled",
};

// Status badge color classes, colocated with the labels so the status pill's
// text and color derive from the same single source of truth.
export const MILESTONE_STATUS_BADGE_CLASS: Record<MilestoneLifecycleStatus, string> = {
  [MilestoneLifecycleStatus.PENDING]:
    "bg-orange-50 hover:bg-orange-50 text-orange-700 dark:bg-orange-950 dark:hover:bg-orange-950 dark:text-orange-300",
  [MilestoneLifecycleStatus.COMPLETED]:
    "text-emerald-700 bg-emerald-50 hover:bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950 dark:hover:bg-emerald-950",
  [MilestoneLifecycleStatus.VERIFIED]:
    "text-emerald-700 bg-emerald-50 hover:bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950 dark:hover:bg-emerald-950",
  [MilestoneLifecycleStatus.PAST_DUE]:
    "text-red-700 bg-red-50 hover:bg-red-50 dark:text-red-300 dark:bg-red-950 dark:hover:bg-red-950",
  [MilestoneLifecycleStatus.CANCELLED]:
    "text-gray-600 bg-gray-100 line-through hover:bg-gray-100 dark:text-gray-400 dark:bg-zinc-800 dark:hover:bg-zinc-800",
};
