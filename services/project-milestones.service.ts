import type { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

/**
 * Fetches project milestones using the dedicated V2 API endpoint.
 *
 * @param projectIdOrSlug - The project UID or slug
 * @returns Promise<IProjectMilestoneResponse> - Project milestones data
 */
export const getProjectMilestones = async (
  projectIdOrSlug: string
): Promise<IProjectMilestoneResponse | null> => {
  let data: IProjectMilestoneResponse | null;
  try {
    // TODO(#1775): add zod schema
    data = await api.get<IProjectMilestoneResponse>(
      INDEXER.V2.PROJECTS.MILESTONES(projectIdOrSlug)
    );
  } catch (error) {
    errorManager(`Project Milestones API Error: ${error}`, error, {
      context: "project-milestones.service",
    });
    return null;
  }

  if (!data) {
    errorManager("Project Milestones API Error: empty response", null, {
      context: "project-milestones.service",
    });
    return null;
  }

  return data;
};
