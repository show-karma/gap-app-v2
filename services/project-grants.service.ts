import type { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";

/**
 * Fetches grants for a project using V2 endpoint
 *
 * NOTE: Grants and Funding Applications are different concepts
 * - Funding Applications: /v2/funding-applications/project/${projectUID} (returns IFundingApplication)
 * - Grants: /v2/projects/:idOrSlug/grants (returns IGrantResponse[])
 *
 * V2 endpoint: /v2/projects/:idOrSlug/grants
 * - Returns grants with milestones, updates, and completion data
 * - Dates are returned as ISO strings (not MongoDB objects)
 * - Supports both UID and slug identifiers
 */
export const getProjectGrants = async (
  projectIdOrSlug: string,
  fetchOptions?: RequestInit
): Promise<IGrantResponse[]> => {
  try {
    const response = await fetch(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.V2.PROJECTS.GRANTS(projectIdOrSlug)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        ...fetchOptions,
      }
    );

    if (!response.ok) {
      // If 404, return empty array (no grants)
      if (response.status === 404) {
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Handle both single application and array of applications
    if (Array.isArray(data)) {
      return data as IGrantResponse[];
    }

    // Handle single grant object
    if (data) {
      return [data as IGrantResponse];
    }

    return [];
  } catch (error) {
    // Return empty array on error to prevent breaking the project page
    console.error("Error fetching project grants:", error);
    return [];
  }
};
