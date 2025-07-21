import { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { gapIndexerApi } from "@/services/gap-indexer/gap-indexer";
import errorManager from "@/lib/utils/error-manager";

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
