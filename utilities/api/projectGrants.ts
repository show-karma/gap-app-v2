import type { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { envVars } from "../enviromentVars";
import { INDEXER } from "../indexer";

/**
 * Fetches grants (funding applications) for a project from v2 endpoint
 * Returns empty array if no grants found or on error
 */
export const getProjectGrants = async (
  projectUID: string,
  fetchOptions?: RequestInit
): Promise<IGrantResponse[]> => {
  try {
    const response = await fetch(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.V2.APPLICATIONS.BY_PROJECT_UID(projectUID)}`,
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
      // If it's an array, we may need to transform each item
      // For now, return empty array as grants structure may differ from funding applications
      // This will be handled when we understand the exact response structure
      return [];
    } else if (data) {
      // Single application - may need transformation to IGrantResponse
      // For now, return empty array until we understand the mapping
      return [];
    }

    return [];
  } catch (error) {
    // Return empty array on error to prevent breaking the project page
    console.error("Error fetching project grants:", error);
    return [];
  }
};
