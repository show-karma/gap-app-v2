import type { UpdatesApiResponse } from "@/types/v2/roadmap";
import { envVars } from "@/utilities/enviromentVars";
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
 * @param fetchOptions - Optional fetch configuration
 * @returns UpdatesApiResponse containing all updates and milestones
 */
export const getProjectUpdates = async (
  projectIdOrSlug: string,
  fetchOptions: RequestInit = {}
): Promise<UpdatesApiResponse> => {
  const response = await fetch(
    `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.V2.PROJECTS.UPDATES(projectIdOrSlug)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      ...fetchOptions,
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: UpdatesApiResponse = await response.json();
  return data;
};
