import { errorManager } from "@/components/Utilities/errorManager";
import type { Project as ProjectResponse } from "@/types/v2/project";
import fetchData from "@/utilities/fetchData";
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

  const [data, error] = await fetchData<ProjectResponse[]>(
    INDEXER.V2.PROJECTS.SEARCH(query, limit)
  );

  if (error || !data) {
    errorManager(`Project Search API Error: ${error}`, error, {
      context: "project-search.service",
    });
    return [];
  }

  return data;
};

// Alias for backward compatibility during migration
export const searchProjectsV2 = searchProjects;
