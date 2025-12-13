import type { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
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
  const [data, error] = await fetchData<IProjectMilestoneResponse>(
    INDEXER.V2.PROJECTS.MILESTONES(projectIdOrSlug)
  );

  if (error || !data) {
    errorManager(`Project Milestones API Error: ${error}`, error, {
      context: "project-milestones.service",
    });
    return null;
  }

  return data;
};
