import { MilestoneLifecycleStatus } from "@/src/features/payout-disbursement/types/payout-disbursement";
import {
  type MilestoneDueDateInput,
  normalizeMilestoneDueDateMs,
} from "@/utilities/milestones/milestoneDueDate";

type MilestoneStatusInput =
  | MilestoneLifecycleStatus
  | "pending"
  | "completed"
  | "verified"
  | "past_due"
  | "cancelled"
  | null
  | undefined;

/** True when a milestone status string represents an on-chain cancellation (DEV-523). */
export function isCancelledMilestoneStatus(status: string | null | undefined): boolean {
  return status?.toLowerCase() === MilestoneLifecycleStatus.CANCELLED;
}

export function getEffectiveMilestoneStatus(
  status: MilestoneStatusInput,
  dueDate: MilestoneDueDateInput,
  now: number = Date.now()
): MilestoneLifecycleStatus {
  // Cancelled is terminal (DEV-523): never upgrade it to past-due and never
  // let it default to pending.
  if (isCancelledMilestoneStatus(status)) return MilestoneLifecycleStatus.CANCELLED;

  const normalized = (status as MilestoneLifecycleStatus) || MilestoneLifecycleStatus.PENDING;
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
