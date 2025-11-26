import type { CommunityMilestoneUpdate } from "@/types/community-updates";

type FilterOption = "all" | "pending" | "completed";

/**
 * Validates if a milestone item has all required fields
 */
function isValidMilestone(item: unknown): item is CommunityMilestoneUpdate {
  if (!item || typeof item !== "object") return false;
  const milestone = item as Record<string, unknown>;
  if (!milestone.uid || !milestone.status) return false;
  const details = milestone.details as Record<string, unknown> | undefined;
  if (!details?.title) return false;
  const project = milestone.project as Record<string, unknown> | undefined;
  const projectDetails = project?.details as Record<string, unknown> | undefined;
  const projectData = projectDetails?.data as Record<string, unknown> | undefined;
  if (!projectData?.slug) return false;
  return true;
}

/**
 * Safely converts a date string to timestamp, returning a fallback for invalid dates
 */
function getTimestamp(dateString: string | null | undefined, fallback: number): number {
  if (!dateString) return fallback;
  const timestamp = new Date(dateString).getTime();
  return Number.isNaN(timestamp) ? fallback : timestamp;
}

/**
 * Compare function for sorting pending milestones by due date (ascending)
 */
function comparePending(a: CommunityMilestoneUpdate, b: CommunityMilestoneUpdate): number {
  const aDueDate = getTimestamp(a.details.dueDate, Number.MAX_SAFE_INTEGER);
  const bDueDate = getTimestamp(b.details.dueDate, Number.MAX_SAFE_INTEGER);
  return aDueDate - bDueDate;
}

/**
 * Compare function for sorting completed milestones by update date (descending)
 */
function compareCompleted(a: CommunityMilestoneUpdate, b: CommunityMilestoneUpdate): number {
  const aUpdated = getTimestamp(a.updatedAt, 0);
  const bUpdated = getTimestamp(b.updatedAt, 0);
  return bUpdated - aUpdated;
}

/**
 * Sorts community milestone updates based on the selected filter
 */
export function sortCommunityMilestones(
  milestones: CommunityMilestoneUpdate[],
  filter: FilterOption,
  communityId: string
): CommunityMilestoneUpdate[] {
  // Validate array input
  if (!Array.isArray(milestones)) {
    console.error("Invalid milestones array", { communityId, milestones });
    return [];
  }

  try {
    // Filter out invalid items
    const validMilestones = milestones.filter(isValidMilestone);

    // Sort based on filter
    return [...validMilestones].sort((a, b) => {
      if (filter === "all") {
        // For "all": pending first, then completed
        const aCompleted = a.status === "completed";
        const bCompleted = b.status === "completed";

        if (aCompleted !== bCompleted) {
          return aCompleted ? 1 : -1; // Pending first
        }

        // If both same status, use appropriate sort
        return aCompleted ? compareCompleted(a, b) : comparePending(a, b);
      }

      // For specific filters, use appropriate comparison
      return filter === "pending" ? comparePending(a, b) : compareCompleted(a, b);
    });
  } catch (error) {
    console.error("Error sorting community updates:", error, {
      communityId,
      milestonesLength: milestones.length,
    });
    // Return filtered but unsorted data as fallback
    return milestones.filter(isValidMilestone);
  }
}
