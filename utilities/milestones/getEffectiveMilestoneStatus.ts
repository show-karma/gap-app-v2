import { MilestoneLifecycleStatus } from "@/src/features/payout-disbursement/types/payout-disbursement";

type MilestoneStatusInput =
  | MilestoneLifecycleStatus
  | "pending"
  | "completed"
  | "verified"
  | "past_due"
  | null
  | undefined;

type MilestoneDueDateInput = Date | string | number | null | undefined;

function toEpochMs(dueDate: MilestoneDueDateInput): number | null {
  if (dueDate == null) return null;
  if (dueDate instanceof Date) return dueDate.getTime();
  if (typeof dueDate === "number") return dueDate;
  const parsed = new Date(dueDate).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export function getEffectiveMilestoneStatus(
  status: MilestoneStatusInput,
  dueDate: MilestoneDueDateInput,
  now: number = Date.now()
): MilestoneLifecycleStatus {
  const normalized = (status as MilestoneLifecycleStatus) || MilestoneLifecycleStatus.PENDING;
  if (normalized !== MilestoneLifecycleStatus.PENDING) return normalized;

  const dueMs = toEpochMs(dueDate);
  if (dueMs == null) return MilestoneLifecycleStatus.PENDING;
  return dueMs < now ? MilestoneLifecycleStatus.PAST_DUE : MilestoneLifecycleStatus.PENDING;
}

export const MILESTONE_STATUS_LABEL: Record<MilestoneLifecycleStatus, string> = {
  [MilestoneLifecycleStatus.PENDING]: "Pending",
  [MilestoneLifecycleStatus.COMPLETED]: "Completed",
  [MilestoneLifecycleStatus.VERIFIED]: "Verified",
  [MilestoneLifecycleStatus.PAST_DUE]: "Past Due",
};
