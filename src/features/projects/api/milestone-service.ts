import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

/**
 * Fetches all milestones for a project
 * @param projectIdOrSlug - The project ID or slug
 * @returns Promise with the milestones data
 */
export const getProjectMilestones = async (
  projectIdOrSlug: string
): Promise<IProjectMilestoneResponse[]> => {
  const response = await gapIndexerApi.projectMilestones(projectIdOrSlug);
  return response.data;
};

/**
 * Fetches project objectives (milestones)
 * @param projectId - The project ID
 * @returns Promise with the objectives data
 */
export const getProjectObjectives = async (
  projectId: string
): Promise<IProjectMilestoneResponse[]> => {
  // This appears to be the same as milestones based on the codebase
  return getProjectMilestones(projectId);
};
