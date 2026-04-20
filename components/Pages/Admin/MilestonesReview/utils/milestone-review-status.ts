import type { GrantMilestoneWithCompletion } from "@/services/milestones";

export enum MilestoneReviewStatus {
  Verified = "verified",
  PendingVerification = "pending_verification",
  PendingCompletion = "pending_completion",
  NotStarted = "not_started",
}

export type MilestoneFilterKey = MilestoneReviewStatus | "all";

/** Icon name constants for use with heroicons in the UI layer */
export type StatusIconName = "check" | "clock" | "hourglass" | "circle";

export const MILESTONE_STATUS_CONFIG: Record<
  MilestoneReviewStatus,
  {
    label: string;
    badgeColor: string;
    filterLabel: string;
    icon: StatusIconName;
    stepperColor: string;
  }
> = {
  [MilestoneReviewStatus.Verified]: {
    label: "Verified",
    badgeColor: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    filterLabel: "Verified",
    icon: "check",
    stepperColor: "bg-green-500",
  },
  [MilestoneReviewStatus.PendingVerification]: {
    label: "Pending Verification",
    badgeColor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    filterLabel: "Pending Verification",
    icon: "clock",
    stepperColor: "bg-yellow-500",
  },
  [MilestoneReviewStatus.PendingCompletion]: {
    label: "Pending Verification",
    badgeColor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    filterLabel: "Pending (Off-chain)",
    icon: "hourglass",
    stepperColor: "bg-orange-400",
  },
  [MilestoneReviewStatus.NotStarted]: {
    label: "Not Started",
    badgeColor: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
    filterLabel: "Not Started",
    icon: "circle",
    stepperColor: "bg-gray-300 dark:bg-gray-600",
  },
};

export const FILTER_TABS: {
  key: MilestoneFilterKey;
  label: string;
  icon: StatusIconName | null;
}[] = [
  { key: "all", label: "All", icon: null },
  ...Object.entries(MILESTONE_STATUS_CONFIG).map(([key, config]) => ({
    key: key as MilestoneReviewStatus,
    label: config.filterLabel,
    icon: config.icon,
  })),
];

export function getMilestoneStatus(milestone: GrantMilestoneWithCompletion): MilestoneReviewStatus {
  if (milestone.verificationDetails !== null) return MilestoneReviewStatus.Verified;
  if (milestone.completionDetails !== null) return MilestoneReviewStatus.PendingVerification;
  if (milestone.fundingApplicationCompletion !== null)
    return MilestoneReviewStatus.PendingCompletion;
  return MilestoneReviewStatus.NotStarted;
}

/**
 * Sort milestones: non-verified first by due date ascending,
 * then verified milestones by due date ascending.
 */
export function sortMilestones(
  milestones: GrantMilestoneWithCompletion[],
  statusFn: (m: GrantMilestoneWithCompletion) => MilestoneReviewStatus = getMilestoneStatus
): GrantMilestoneWithCompletion[] {
  return [...milestones].sort((a, b) => {
    const aVerified = statusFn(a) === MilestoneReviewStatus.Verified ? 1 : 0;
    const bVerified = statusFn(b) === MilestoneReviewStatus.Verified ? 1 : 0;
    if (aVerified !== bVerified) return aVerified - bVerified;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}
