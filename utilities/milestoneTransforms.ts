import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import type { GrantMilestone } from "@/types/v2/grant";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

/**
 * Converts a GrantMilestoneWithCompletion to UnifiedMilestone for the edit dialog.
 * Only title, description, dates, chainID, refUID, and source are meaningful —
 * other fields (completed, createdAt, verified) are stubbed since the edit dialog doesn't use them.
 */
export function toEditableUnifiedMilestone(
  milestone: GrantMilestoneWithCompletion,
  grantUID: string,
  grantChainID: number
): UnifiedMilestone {
  const chainID = milestone.chainId != null ? Number(milestone.chainId) : grantChainID;

  const grantMilestone: GrantMilestone = {
    uid: milestone.uid,
    chainID,
    title: milestone.title,
    description: milestone.description,
    endsAt: milestone.dueDate
      ? Math.floor(new Date(milestone.dueDate).getTime() / 1000)
      : undefined,
    verified: [],
  };

  return {
    uid: milestone.uid,
    type: "milestone",
    title: milestone.title,
    description: milestone.description,
    completed: false,
    createdAt: "",
    startsAt: grantMilestone.startsAt,
    endsAt: grantMilestone.endsAt,
    chainID,
    refUID: grantUID,
    source: {
      grantMilestone: {
        milestone: grantMilestone,
        completionDetails: milestone.completionDetails,
        grant: {
          uid: grantUID,
          chainID: grantChainID,
        },
      },
    },
  };
}
