import type { ProjectResponse } from "@/types/v2/project";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";

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
    const response = await fetch(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.V2.PROJECTS.SEARCH(query, limit)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ProjectResponse[] = await response.json();
    return data;
  } catch (error) {
    console.error("Error searching projects:", error);
    return [];
  }
};

// Alias for backward compatibility during migration
export const searchProjectsV2 = searchProjects;
