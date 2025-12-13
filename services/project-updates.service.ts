import { errorManager } from "@/components/Utilities/errorManager";
import type { UpdatesApiResponse } from "@/types/v2/roadmap";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Fetches project updates, milestones, and grant milestones using the API endpoint.
 *
 * This is a unified endpoint that returns:
 * - projectUpdates: Project activity updates with associations (funding, indicators, deliverables)
 * - projectMilestones: Project milestones with completion details
 * - grantMilestones: Grant milestones with completion and verification details
 *
 * @param projectIdOrSlug - The project UID or slug
 * @returns UpdatesApiResponse containing all updates and milestones
 */
export const getProjectUpdates = async (projectIdOrSlug: string): Promise<UpdatesApiResponse> => {
  const emptyResponse: UpdatesApiResponse = {
    projectUpdates: [],
    projectMilestones: [],
    grantMilestones: [],
    grantUpdates: [],
  };

  const [data, error] = await fetchData<UpdatesApiResponse>(
    INDEXER.V2.PROJECTS.UPDATES(projectIdOrSlug)
  );

  if (error || !data) {
    errorManager(`Project Updates API Error: ${error}`, error, {
      context: "project-updates.service",
    });
    return emptyResponse;
  }

  return data;
};
