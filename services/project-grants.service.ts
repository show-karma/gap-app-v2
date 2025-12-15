import { errorManager } from "@/components/Utilities/errorManager";
import type { Grant } from "@/types/v2/grant";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Fetches grants for a project using V2 endpoint
 *
 * NOTE: Grants and Funding Applications are different concepts
 * - Funding Applications: /v2/funding-applications/project/${projectUID} (returns IFundingApplication)
 * - Grants: /v2/projects/:idOrSlug/grants (returns Grant[])
 *
 * V2 endpoint: /v2/projects/:idOrSlug/grants
 * - Returns grants with milestones, updates, and completion data
 * - Dates are returned as ISO strings (not MongoDB objects)
 * - Supports both UID and slug identifiers
 */
export const getProjectGrants = async (projectIdOrSlug: string): Promise<Grant[]> => {
  const [data, error] = await fetchData<Grant | Grant[]>(
    INDEXER.V2.PROJECTS.GRANTS(projectIdOrSlug)
  );

  if (error || !data) {
    errorManager(`Project Grants API Error: ${error}`, error, {
      context: "project-grants.service",
    });
    return [];
  }

  // Handle both single application and array of applications
  if (Array.isArray(data)) {
    return data;
  }

  // Handle single grant object
  return [data];
};
