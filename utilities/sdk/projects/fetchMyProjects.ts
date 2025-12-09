import { errorManager } from "@/components/Utilities/errorManager";
import type { ProjectResponse } from "@/types/v2/project";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

// V2 API response types
interface UserProjectsV2Response {
  projects: ProjectResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Fetch projects owned by or where the user is a member
 * Uses the authenticated V2 endpoint
 */
export const fetchMyProjects = async (
  _address: `0x${string}` | undefined,
  page: number = 1,
  limit: number = 100
): Promise<ProjectResponse[]> => {
  if (!_address) return [];

  try {
    const [data, error] = await fetchData<UserProjectsV2Response>(
      INDEXER.V2.USER.PROJECTS(page, limit),
      "GET",
      {},
      {},
      {},
      true, // Requires authentication
      false
    );

    if (error || !data) {
      errorManager(`Error fetching user projects`, error);
      return [];
    }

    return data.projects || [];
  } catch (error: unknown) {
    errorManager(`Error fetching user projects`, error);
    return [];
  }
};

/**
 * Fetch all user projects with pagination support
 */
export const fetchMyProjectsPaginated = async (
  page: number = 1,
  limit: number = 20
): Promise<UserProjectsV2Response | null> => {
  try {
    const [data, error] = await fetchData<UserProjectsV2Response>(
      INDEXER.V2.USER.PROJECTS(page, limit),
      "GET",
      {},
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      errorManager(`Error fetching user projects`, error);
      return null;
    }

    return data;
  } catch (error: unknown) {
    errorManager(`Error fetching user projects`, error);
    return null;
  }
};
