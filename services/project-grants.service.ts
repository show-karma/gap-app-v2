import { errorManager } from "@/components/Utilities/errorManager";
import type { GrantResponse } from "@/types/v2/grant";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

// Create axios instance with authentication
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    errorManager(
      `Project Grants API Error: ${error.response?.data?.message || error.message}`,
      error,
      { context: "project-grants.service" }
    );
    throw error;
  }
);

/**
 * Fetches grants for a project using V2 endpoint
 *
 * NOTE: Grants and Funding Applications are different concepts
 * - Funding Applications: /v2/funding-applications/project/${projectUID} (returns IFundingApplication)
 * - Grants: /v2/projects/:idOrSlug/grants (returns GrantResponse[])
 *
 * V2 endpoint: /v2/projects/:idOrSlug/grants
 * - Returns grants with milestones, updates, and completion data
 * - Dates are returned as ISO strings (not MongoDB objects)
 * - Supports both UID and slug identifiers
 */
export const getProjectGrants = async (projectIdOrSlug: string): Promise<GrantResponse[]> => {
  try {
    const response = await apiClient.get<GrantResponse | GrantResponse[]>(
      INDEXER.V2.PROJECTS.GRANTS(projectIdOrSlug)
    );

    const data = response.data;

    // Handle both single application and array of applications
    if (Array.isArray(data)) {
      return data;
    }

    // Handle single grant object
    if (data) {
      return [data];
    }

    return [];
  } catch (error: any) {
    // Return empty array on 404 (no grants found)
    if (error.response?.status === 404) {
      return [];
    }
    // For other errors, return empty array to prevent breaking the project page
    // Error is already logged by the interceptor
    return [];
  }
};
