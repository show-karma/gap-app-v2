import { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { gapIndexerApi } from ".";
import { errorManager } from "@/components/Utilities/errorManager";

export type StatusOptions = "all" | "completed" | "pending";

export async function getProjectObjectives(
  uidOrSlug: string
): Promise<IProjectMilestoneResponse[]> {
  try {
    const objectives = await gapIndexerApi
      .projectMilestones(uidOrSlug)
      .then((res) => res.data);

    return objectives || [];
  } catch (error) {
    errorManager("Error fetching project objectives", error, {
      projectId: uidOrSlug,
    });
    return [];
  }
}
