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
export const getProjectUpdates = async (
  projectIdOrSlug: string,
  milestoneStatus?: "pending" | "completed" | "verified"
): Promise<UpdatesApiResponse> => {
  const emptyResponse: UpdatesApiResponse = {
    projectUpdates: [],
    projectMilestones: [],
    grantMilestones: [],
    grantUpdates: [],
  };

  const baseUrl = INDEXER.V2.PROJECTS.UPDATES(projectIdOrSlug);
  const url = milestoneStatus ? `${baseUrl}?milestoneStatus=${milestoneStatus}` : baseUrl;

  const [data, error, , status] = await fetchData<UpdatesApiResponse>(url);

  if (error || !data) {
    // Missing project routes are expected for unknown slugs and should not be sent to Sentry.
    if (status === 404) {
      return emptyResponse;
    }

    errorManager(`Project Updates API Error: ${error}`, error, {
      context: "project-updates.service",
    });
    return emptyResponse;
  }

  return data;
};
