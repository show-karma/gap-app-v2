import type {
  GrantResponse,
  IMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { errorManager } from "@/components/Utilities/errorManager";
import type { UnifiedMilestone } from "@/types/roadmap";
import { getProjectObjectives } from "./getProjectObjectives";

const parseCreatedAt = (createdAt: any): string => {
  if (!createdAt) return new Date().toISOString();
  if (typeof createdAt === "string") return createdAt;
  if (createdAt.$timestamp?.t) {
    return new Date(createdAt.$timestamp.t * 1000).toISOString();
  }
  if (createdAt.$date) {
    return new Date(createdAt.$date).toISOString();
  }
  return new Date().toISOString();
};

export async function getAllMilestones(
  projectId: string,
  projectGrants: GrantResponse[]
): Promise<UnifiedMilestone[]> {
  try {
    // Fetch both types of milestones in parallel
    const projectMilestones = await getProjectObjectives(projectId);
    const grantMilestonesWithGrants: {
      milestone: IMilestoneResponse;
      grant: GrantResponse;
    }[] = [];
    projectGrants.forEach((grant) => {
      if (grant.milestones && grant.milestones.length > 0) {
        grant.milestones.forEach((milestone) => {
          grantMilestonesWithGrants.push({
            milestone,
            grant,
          });
        });
      }
    });

    // Transform project milestones to unified format
    const unifiedProjectMilestones: UnifiedMilestone[] = projectMilestones.map((milestone) => {
      // Handle completion status - API may return empty array [] which is truthy in JS
      // Properly check for completion: must be truthy AND not an empty array
      const isCompleted = Array.isArray(milestone.completed)
        ? milestone.completed.length > 0
        : !!milestone.completed;

      return {
        uid: milestone.uid,
        chainID: milestone.chainID,
        refUID: milestone.refUID,
        type: "milestone",
        title: milestone.data.title,
        description: milestone.data.text,
        completed: isCompleted,
        createdAt: parseCreatedAt(milestone.createdAt),
        endsAt: undefined,
        source: {
          projectMilestone: milestone,
        },
      };
    });

    // Transform grant milestones to unified format
    const unifiedGrantMilestones: UnifiedMilestone[] = grantMilestonesWithGrants.map(
      ({ milestone, grant }) => {
        // Handle completion status - API may return empty array [] which is truthy in JS
        // Properly check for completion: must be truthy AND not an empty array
        const isCompleted = Array.isArray(milestone.completed)
          ? milestone.completed.length > 0
          : !!milestone.completed;

        return {
          uid: milestone.uid,
          chainID: milestone.chainID,
          refUID: milestone.refUID,
          type: "grant",
          title: milestone.data.title,
          description: milestone.data.description,
          completed: isCompleted,
          createdAt: parseCreatedAt(milestone.createdAt),
          endsAt: milestone.data.endsAt,
          source: {
            grantMilestone: {
              milestone,
              grant,
            },
          },
        };
      }
    );

    // Combine both types of milestones
    const allMilestones = [...unifiedProjectMilestones, ...unifiedGrantMilestones];

    return allMilestones;
  } catch (error) {
    errorManager("Error fetching all milestones", error, {
      projectId,
    });
    return [];
  }
}
