import { getProjectObjectives } from "./getProjectObjectives";
import { getGrantMilestones } from "./getGrantMilestones";
import { errorManager } from "@/components/Utilities/errorManager";
import { UnifiedMilestone } from "@/types/roadmap";

export async function getAllMilestones(
  projectId: string
): Promise<UnifiedMilestone[]> {
  try {
    // Fetch both types of milestones in parallel
    const [projectMilestones, grantMilestonesWithGrants] = await Promise.all([
      getProjectObjectives(projectId),
      getGrantMilestones(projectId),
    ]);

    // Transform project milestones to unified format
    const unifiedProjectMilestones: UnifiedMilestone[] = projectMilestones.map(
      (milestone) => ({
        uid: milestone.uid,
        chainID: milestone.chainID,
        refUID: milestone.refUID,
        type: "project",
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
