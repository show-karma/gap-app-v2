import {
  IGrantResponse,
  IMilestoneResponse,
  IProjectMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getProjectObjectives } from "./getProjectObjectives";
import { getGrantMilestones } from "./getGrantMilestones";
import { errorManager } from "@/components/Utilities/errorManager";

// Create a unified milestone type that can represent both project and grant milestones
export type UnifiedMilestone = {
  id: string; // Unique identifier
  type: "project" | "grant"; // Type of milestone
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  endsAt?: number; // For sorting
  source: {
    projectMilestone?: IProjectMilestoneResponse;
    grantMilestone?: {
      milestone: IMilestoneResponse;
      grant: IGrantResponse;
    };
  };
};

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
        id: `project-${milestone.uid}`,
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
        id: `grant-${milestone.uid}`,
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
    return [...unifiedProjectMilestones, ...unifiedGrantMilestones];
  } catch (error) {
    errorManager("Error fetching all milestones", error, {
      projectId,
    });
    return [];
  }
}
