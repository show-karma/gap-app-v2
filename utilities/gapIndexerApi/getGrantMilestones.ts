import type {
  IGrantResponse as GrantResponse,
  IMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { errorManager } from "@/components/Utilities/errorManager";
import { gapIndexerApi } from ".";

export async function getGrantMilestones(
  projectId: string
): Promise<{ milestone: IMilestoneResponse; grant: GrantResponse }[]> {
  try {
    // 1. First get the project to access all its grants
    const project = await gapIndexerApi
      .projectBySlug(projectId)
      .then((res) => res.data)
      .catch((error) => {
        errorManager("Error fetching project for grants", error, {
          projectId,
        });
        return null;
      });

    if (!project || !project.grants?.length) {
      return [];
    }

    // 2. Collect all grant milestones with their parent grant information
    const allGrantMilestones: {
      milestone: IMilestoneResponse;
      grant: GrantResponse;
    }[] = [];

    project.grants?.forEach((grant) => {
      if (grant.milestones && grant.milestones.length > 0) {
        grant.milestones.forEach((milestone) => {
          allGrantMilestones.push({
            milestone,
            grant,
          });
        });
      }
    });

    return allGrantMilestones;
  } catch (error) {
    errorManager("Error fetching grant milestones", error, {
      projectId,
    });
    return [];
  }
}
