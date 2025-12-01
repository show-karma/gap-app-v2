import type { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { envVars } from "../enviromentVars";
import { INDEXER } from "../indexer";

/**
 * Fetches grants for a project using v1 endpoint temporarily
 *
 * NOTE: Grants and Funding Applications are different concepts
 * - Funding Applications: /v2/funding-applications/project/${projectUID} (returns IFundingApplication)
 * - Grants: /projects/:idOrSlug/grants (v1 endpoint, returns IGrantResponse[])
 *
 * TODO: Once v2 grants endpoint is available (/v2/projects/${projectUID}/grants),
 * update this to use v2 endpoint and handle v2 grant structure (details.title instead of details.data.title)
 *
 * Current v1 endpoint: /projects/:idOrSlug/grants
 * - Returns IGrantResponse[] with v1 structure (details.data.title)
 * - This is temporary until v2 endpoint is created
 */
export const getProjectGrants = async (
  projectIdOrSlug: string,
  fetchOptions?: RequestInit
): Promise<IGrantResponse[]> => {
  try {
    // Using v1 endpoint temporarily: /projects/:idOrSlug/grants
    // TODO: Update to v2 endpoint once available: /v2/projects/${projectUID}/grants
    const response = await fetch(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.PROJECT.GRANTS(projectIdOrSlug)}`,
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
