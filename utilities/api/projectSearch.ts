import type { ProjectV2Response } from "@/types/project";
import { envVars } from "../enviromentVars";
import { INDEXER } from "../indexer";

/**
 * Search projects using V2 API endpoint
 *
 * Returns projects matching the query by title, slug, or description,
 * sorted by relevance.
 *
 * @param query - Search query string (minimum 3 characters)
 * @param limit - Maximum number of results (1-50, default: 10)
 */
export const searchProjectsV2 = async (
  query: string,
  limit?: number
): Promise<ProjectV2Response[]> => {
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

    const data: ProjectV2Response[] = await response.json();
    return data;
  } catch (error) {
    console.error("Error searching projects:", error);
    return [];
  }
};
