import { getProjectObjectives } from "./getProjectObjectives";
import errorManager from "@/lib/utils/error-manager";
import { UnifiedMilestone } from "@/types/roadmap";
import {
  IGrantResponse,
  IMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

export async function getAllMilestones(
  projectId: string,
  projectGrants: IGrantResponse[]
): Promise<UnifiedMilestone[]> {
  try {
    // Fetch both types of milestones in parallel
    const projectMilestones = await getProjectObjectives(projectId);
    const grantMilestonesWithGrants: {
      milestone: IMilestoneResponse;
      grant: IGrantResponse;
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
    const unifiedProjectMilestones: UnifiedMilestone[] = projectMilestones.map(
      (milestone) => ({
        uid: milestone.uid,
        chainID: milestone.chainID,
        refUID: milestone.refUID,
        type: "milestone",
        title: milestone.data.title,
        description: milestone.data.text,
        completed: !!milestone.completed,
        createdAt: milestone.createdAt,
        // Project milestones don't have endsAt, using createdAt for sorting
        endsAt: undefined,
        source: {
          projectMilestone: milestone,
        },
      })
    );

    // Transform grant milestones to unified format
    const unifiedGrantMilestones: UnifiedMilestone[] =
      grantMilestonesWithGrants.map(({ milestone, grant }) => ({
        uid: milestone.uid,
        chainID: milestone.chainID,
        refUID: milestone.refUID,
        type: "grant",
        title: milestone.data.title,
        description: milestone.data.description,
        completed: !!milestone.completed,
        createdAt: milestone.createdAt,
        endsAt: milestone.data.endsAt,
        source: {
          grantMilestone: {
            milestone,
            grant,
          },
        },
      }));

    // Combine both types of milestones
    const allMilestones = [
      ...unifiedProjectMilestones,
      ...unifiedGrantMilestones,
    ];

    return allMilestones;
  } catch (error) {
    errorManager("Error fetching all milestones", error, {
      projectId,
    });
    return [];
  }
}
