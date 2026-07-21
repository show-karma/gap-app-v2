import { errorManager } from "@/components/Utilities/errorManager";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

type SearchProjectsApiResponse =
  | ProjectResponse[]
  | { payload: ProjectResponse[]; pagination?: unknown };

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
    // TODO(#1775): add zod schema
    const data = await api.get<SearchProjectsApiResponse>(INDEXER.V2.PROJECTS.SEARCH(query, limit));

    if (!data) {
      errorManager("Project Search API Error: empty response", undefined, {
        context: "project-search.service",
      });
      return [];
    }

    // Backend switched from a flat array to a paginated envelope ({ payload, pagination }).
    // Handle both shapes so older deployments and tests keep working.
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.payload)) return data.payload;

    errorManager(
      "Project Search API returned unexpected shape",
      new Error("Unexpected response shape"),
      { context: "project-search.service", responseKeys: Object.keys(data) }
    );
    return [];
  } catch (error) {
    errorManager(`Project Search API Error: ${error}`, error, {
      context: "project-search.service",
    });
    return [];
  }
};

// Alias for backward compatibility during migration
export const searchProjectsV2 = searchProjects;
