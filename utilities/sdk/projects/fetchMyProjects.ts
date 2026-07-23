import { errorManager } from "@/components/Utilities/errorManager";
import type { ProjectWithGrantsResponse } from "@/types/v2/project";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

// V2 API response types - user projects endpoint includes grants
interface UserProjectsV2Response {
  projects: ProjectWithGrantsResponse[];
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
): Promise<ProjectWithGrantsResponse[]> => {
  try {
    // TODO(#1775): add zod schema
    const data = await api.get<UserProjectsV2Response>(INDEXER.V2.USER.PROJECTS(page, limit));
    if (!data) {
      throw new Error("Failed to fetch user projects");
    }
    return data.projects || [];
  } catch (error) {
    errorManager(`Error fetching user projects`, error);
    throw error;
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
    // TODO(#1775): add zod schema
    const data = await api.get<UserProjectsV2Response>(INDEXER.V2.USER.PROJECTS(page, limit));

    if (!data) {
      errorManager(`Error fetching user projects`, null);
      return null;
    }

    return data;
  } catch (error: unknown) {
    errorManager(`Error fetching user projects`, error);
    return null;
  }
};
