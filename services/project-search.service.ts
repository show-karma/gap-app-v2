import { errorManager } from "@/components/Utilities/errorManager";
import type { ProjectResponse } from "@/types/v2/project";
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
      `Project Search API Error: ${error.response?.data?.message || error.message}`,
      error,
      { context: "project-search.service" }
    );
    throw error;
  }
);

/**
 * Search projects using V2 API endpoint
 *
 * Returns projects matching the query by title, slug, or description,
 * sorted by relevance.
 *
 * @param query - Search query string (minimum 3 characters)
 * @param limit - Maximum number of results (1-50, default: 10)
 */
export const searchProjects = async (query: string, limit?: number): Promise<ProjectResponse[]> => {
  if (query.length < 3) {
    return [];
  }

  try {
    const response = await apiClient.get<ProjectResponse[]>(
      INDEXER.V2.PROJECTS.SEARCH(query, limit)
    );

    return response.data;
  } catch (error: any) {
    // Return empty array on 404 (no results) - this is expected behavior
    if (error.response?.status === 404) {
      return [];
    }
    // Re-throw other errors (500, network issues, auth) so callers can handle them
    // Error is already logged by the interceptor
    throw error;
  }
};

// Alias for backward compatibility during migration
export const searchProjectsV2 = searchProjects;
