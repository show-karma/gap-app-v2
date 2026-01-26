import { errorManager } from "@/components/Utilities/errorManager";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";
import type { ExplorerSortByOptions, ExplorerSortOrder } from "@/types/explorer";
import type { PaginatedProjectsResponse, Project as ProjectResponse } from "@/types/v2/project";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export interface ExplorerProjectsParams {
  search?: string;
  limit?: number;
}

export interface ExplorerProjectsPaginatedParams {
  search?: string;
  page: number;
  limit?: number;
  sortBy?: ExplorerSortByOptions;
  sortOrder?: ExplorerSortOrder;
  /** When true, includes stats for each project (grantsCount, grantMilestonesCount, roadmapItemsCount) */
  includeStats?: boolean;
}

/**
 * Filter out test projects from results
 * Projects with 'test' (case-insensitive) in title are excluded
 * Projects without a title are included (not filtered out)
 */
const filterTestProjects = (projects: ProjectResponse[]): ProjectResponse[] => {
  return projects.filter((project) => !project.details?.title?.toLowerCase()?.includes("test"));
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

/**
 * Fetch paginated projects for the explorer page using V2 API
 * Test projects are filtered on the backend via excludeTestProjects parameter
 *
 * @param params - Paginated search parameters including page, sortBy, sortOrder
 * @returns Paginated response with projects and pagination metadata
 */
export const getExplorerProjectsPaginated = async (
  params: ExplorerProjectsPaginatedParams
): Promise<PaginatedProjectsResponse> => {
  const {
    search = "",
    page,
    limit = PROJECTS_EXPLORER_CONSTANTS.RESULT_LIMIT,
    sortBy = "updatedAt",
    sortOrder = "desc",
    includeStats = false,
  } = params;

  // Validate search length if provided
  const queryString =
    search.length >= PROJECTS_EXPLORER_CONSTANTS.MIN_SEARCH_LENGTH ? search : undefined;

  const endpoint = INDEXER.V2.PROJECTS.LIST_PAGINATED({
    q: queryString,
    page,
    limit,
    sortBy,
    sortOrder,
    includeStats,
    excludeTestProjects: true, // Filter test projects on backend for accurate pagination
  });

  const [data, error] = await fetchData<PaginatedProjectsResponse>(endpoint);

  if (error || !data) {
    const errorMessage = "Failed to fetch explorer projects (paginated)";
    errorManager(errorMessage, error, {
      context: "projects-explorer.service",
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    });
    // Throw error so React Query can properly handle it and set isError state
    throw new Error(error || errorMessage);
  }

  return data;
};
