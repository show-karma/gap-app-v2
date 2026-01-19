import { errorManager } from "@/components/Utilities/errorManager";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";
import type { Project as ProjectResponse } from "@/types/v2/project";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export interface ExplorerProjectsParams {
  search?: string;
  limit?: number;
}

/**
 * Filter out test projects from results
 * Projects with 'test' (case-insensitive) in title are excluded
 */
const filterTestProjects = (projects: ProjectResponse[]): ProjectResponse[] => {
  return projects.filter((project) => !project.details?.title?.toLowerCase().includes("test"));
};

/**
 * Fetch projects for the explorer page using V2 API
 * Automatically filters out test projects
 *
 * @param params - Search parameters
 * @returns Filtered list of projects
 */
export const getExplorerProjects = async (
  params: ExplorerProjectsParams = {}
): Promise<ProjectResponse[]> => {
  const { search = "", limit = PROJECTS_EXPLORER_CONSTANTS.RESULT_LIMIT } = params;

  // Use LIST endpoint when no search query, SEARCH endpoint when query is 3+ chars
  const endpoint =
    search.length >= PROJECTS_EXPLORER_CONSTANTS.MIN_SEARCH_LENGTH
      ? INDEXER.V2.PROJECTS.SEARCH(search, limit)
      : INDEXER.V2.PROJECTS.LIST(limit);

  const [data, error] = await fetchData<ProjectResponse[]>(endpoint);

  if (error || !data) {
    errorManager("Failed to fetch explorer projects", error, {
      context: "projects-explorer.service",
      search,
      limit,
    });
    return [];
  }

  return filterTestProjects(data);
};
