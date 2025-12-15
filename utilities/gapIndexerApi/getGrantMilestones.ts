import { errorManager } from "@/components/Utilities/errorManager";
import { getProjectGrants } from "@/services/project-grants.service";
import type { Grant, GrantMilestone } from "@/types/v2/grant";

export async function getGrantMilestones(
  projectId: string
): Promise<{ milestone: GrantMilestone; grant: Grant }[]> {
  try {
    // Fetch grants using V2 endpoint
    const grants = await getProjectGrants(projectId);

    if (!grants?.length) {
      return [];
    }

    // Collect all grant milestones with their parent grant information
    const allGrantMilestones: {
      milestone: GrantMilestone;
      grant: Grant;
    }[] = [];

    grants.forEach((grant) => {
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
