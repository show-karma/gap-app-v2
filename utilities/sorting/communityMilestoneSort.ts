import type { CommunityMilestoneUpdate } from "@/types/community-updates";

// Sort order for community milestone updates lives on the indexer
// (gap-indexer MilestoneReadService.compareDefault). This file only
// retains the defensive validity guard for milestones missing required
// fields from the indexer — tracked in show-karma/super-gap#37.
export function isValidMilestone(item: unknown): item is CommunityMilestoneUpdate {
  if (!item || typeof item !== "object") return false;
  const milestone = item as Record<string, unknown>;
  if (typeof milestone.uid !== "string" || milestone.uid.trim() === "") return false;
  // Accept the known milestone statuses (DEV-523 added "cancelled"); reject junk.
  const VALID_STATUSES = ["pending", "completed", "verified", "cancelled"];
  if (typeof milestone.status !== "string" || !VALID_STATUSES.includes(milestone.status))
    return false;
  const details = milestone.details as Record<string, unknown> | undefined;
  const title = details?.title;
  if (typeof title !== "string" || title.trim() === "") return false;
  const project = milestone.project as Record<string, unknown> | undefined;
  const projectDetails = project?.details as Record<string, unknown> | undefined;
  const projectData = projectDetails?.data as Record<string, unknown> | undefined;
  const slug = projectData?.slug;
  if (typeof slug !== "string" || slug.trim() === "") return false;
  return true;
}
