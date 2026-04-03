/**
 * Milestone Status Filter Service
 *
 * Provides utilities for filtering milestone items by their lifecycle status
 * (pending, completed, verified) in the project updates feed.
 */

import type { UnifiedMilestone } from "@/types/v2/roadmap";

// =============================================================================
// Types
// =============================================================================

/**
 * Filter values for milestone lifecycle status.
 * - "all": Show all items (no filtering)
 * - "pending": Milestones not yet completed
 * - "completed": Milestones completed but not verified
 * - "verified": Milestones that have been verified
 */
export type MilestoneStatusFilter = "all" | "pending" | "completed" | "verified";

export interface MilestoneStatusOption {
  value: MilestoneStatusFilter;
  label: string;
}

// =============================================================================
// Constants
// =============================================================================

export const MILESTONE_STATUS_OPTIONS: MilestoneStatusOption[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "verified", label: "Verified" },
] as const;

// Milestone types in the unified feed
const MILESTONE_TYPES: ReadonlySet<string> = new Set(["milestone", "grant", "impact"]);

// =============================================================================
// Functions
// =============================================================================

/**
 * Determines the lifecycle status of a UnifiedMilestone item.
 *
 * @param item - A unified milestone from the activity feed
 * @returns The milestone status, or null if the item is not a milestone type
 */
export function getMilestoneStatus(
  item: UnifiedMilestone
): Exclude<MilestoneStatusFilter, "all"> | null {
  // Only milestone-type items have a meaningful status
  if (!MILESTONE_TYPES.has(item.type)) {
    return null;
  }

  // Check verification first (verified is a subset of completed)
  const grantVerified = item.source.grantMilestone?.milestone?.verified;
  if (grantVerified && grantVerified.length > 0) {
    return "verified";
  }

  const projectVerified = item.source.projectMilestone?.verified;
  if (projectVerified === true) {
    return "verified";
  }

  // Check completion
  if (item.completed !== false) {
    return "completed";
  }

  return "pending";
}

/**
 * Filters an array of unified milestones by milestone lifecycle status.
 *
 * Non-milestone items (updates, endorsements, grants received) pass through
 * unfiltered -- they are not affected by the milestone status filter.
 *
 * @param items - Array of unified milestones from the activity feed
 * @param status - The status to filter by ("all" returns everything)
 * @returns Filtered array
 */
export function filterByMilestoneStatus(
  items: UnifiedMilestone[],
  status: MilestoneStatusFilter
): UnifiedMilestone[] {
  if (status === "all") {
    return items;
  }

  return items.filter((item) => {
    const itemStatus = getMilestoneStatus(item);
    // Non-milestone items pass through (null status)
    if (itemStatus === null) {
      return true;
    }
    return itemStatus === status;
  });
}
