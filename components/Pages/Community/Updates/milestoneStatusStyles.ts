import { MilestoneLifecycleStatus } from "@/src/features/payout-disbursement/types/payout-disbursement";

/**
 * Tailwind class map for milestone status pills.
 * Shared between the Updates card and table views to avoid duplication.
 */
export const STATUS_BADGE_CLASSES: Record<MilestoneLifecycleStatus, string> = {
  [MilestoneLifecycleStatus.COMPLETED]:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  [MilestoneLifecycleStatus.VERIFIED]:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  [MilestoneLifecycleStatus.PAST_DUE]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  [MilestoneLifecycleStatus.PENDING]:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  [MilestoneLifecycleStatus.CANCELLED]:
    "bg-gray-200 text-gray-600 line-through dark:bg-zinc-800 dark:text-gray-400",
};
