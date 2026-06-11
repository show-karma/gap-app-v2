import { MilestoneLifecycleStatus } from "@/src/features/payout-disbursement";
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
  | null
  | undefined;

export function getEffectiveMilestoneStatus(
  status: MilestoneStatusInput,
  dueDate: MilestoneDueDateInput,
  now: number = Date.now()
): MilestoneLifecycleStatus {
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
};
