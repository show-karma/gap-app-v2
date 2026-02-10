import type { GrantMilestoneWithCompletion } from "@/services/milestones";

export type MilestoneFilterStatus =
  | "all"
  | "verified"
  | "pending_verification"
  | "pending_completion"
  | "not_started";

export interface MilestoneStatusInfo {
  key: Exclude<MilestoneFilterStatus, "all">;
  label: string;
  color: string;
}

const STATUS_MAP: Record<
  Exclude<MilestoneFilterStatus, "all">,
  { label: string; color: string }
> = {
  verified: {
    label: "Verified",
    color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  pending_verification: {
    label: "Pending Verification",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  },
  pending_completion: {
    label: "Pending Completion and Verification",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  },
  not_started: {
    label: "Not Started",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  },
};

export function getMilestoneStatusInfo(
  milestone: GrantMilestoneWithCompletion
): MilestoneStatusInfo {
  const key = getMilestoneStatusKey(milestone);
  return { key, ...STATUS_MAP[key] };
}

export function getMilestoneStatusKey(
  milestone: GrantMilestoneWithCompletion
): Exclude<MilestoneFilterStatus, "all"> {
  if (milestone.verificationDetails !== null) return "verified";
  if (milestone.completionDetails !== null) return "pending_verification";
  if (milestone.fundingApplicationCompletion !== null) return "pending_completion";
  return "not_started";
}

export const FILTER_TABS: { key: MilestoneFilterStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending_verification", label: "Pending Verification" },
  { key: "pending_completion", label: "Pending Completion" },
  { key: "verified", label: "Verified" },
  { key: "not_started", label: "Not Started" },
];
