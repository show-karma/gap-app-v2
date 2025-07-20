import { fetchData } from "@/lib/utils/fetch-data";
import { INDEXER } from "@/utilities/indexer";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { Hex } from "viem";

/**
 * Fetches a project by slug or UID
 * @param projectIdOrSlug - The project slug or UID
 * @returns Promise with the project data
 */
export const getProject = async (
  projectIdOrSlug: string
): Promise<IProjectResponse> => {
  const response = await gapIndexerApi.projectBySlug(projectIdOrSlug);
  return response.data;
};

/**
 * Fetches projects owned by an address
 * @param address - The wallet address
 * @returns Promise with the projects data
 */
export const getProjectsByOwner = async (address: string) => {
  const response = await gapIndexerApi.projectsOf(address as `0x${string}`);
  return response.data;
};

/**
 * Fetches all projects with pagination
 * @param offset - The offset for pagination
 * @param limit - The limit for pagination
 * @param sortField - The field to sort by
 * @param sortOrder - The sort order (asc/desc)
 * @returns Promise with paginated projects data
 */
export const getAllProjects = async (
  offset: number,
  limit: number,
  sortField?: string,
  sortOrder?: "asc" | "desc"
) => {
  const [data, error] = await fetchData(
    INDEXER.PROJECTS.GET_ALL(offset, limit, sortField || "", sortOrder || "asc")
  );

  if (error) {
    throw new Error(error);
  }

  return data;
};

/**
 * Fetches projects by program
 * @param programId - The program ID
 * @param chainId - The chain ID
 * @param communityId - The community ID
 * @returns Promise with projects data
 */
export const getProjectsByProgram = async (
  programId: string,
  chainId: number,
  communityId: string
) => {
  const [data, error] = await fetchData(
    INDEXER.PROJECTS.BY_PROGRAM(programId, chainId, communityId)
  );

  if (error) {
    throw new Error(error);
  }

  return data;
};

/**
 * Subscribe to a project
 * @param projectId - The project ID (Hex)
 * @returns Promise<boolean> - Returns true if successful
 */
export const subscribeToProject = async (projectId: Hex): Promise<boolean> => {
  const [, error] = await fetchData(
    INDEXER.PROJECT.SUBSCRIBE(projectId),
    "POST"
  );

  if (error) {
    throw new Error(error);
  }

  return true;
};

/**
 * Updates project categories
 * @param projectUID - The project UID
 * @param categories - Array of category IDs
 * @returns Promise<boolean> - Returns true if successful
 */
export const updateProjectCategories = async (
  projectUID: string,
  categories: string[]
): Promise<boolean> => {
  const [, error] = await fetchData(
    INDEXER.PROJECT.CATEGORIES.UPDATE(projectUID),
    "PUT",
    { categories }
  );

  if (error) {
    throw new Error(error);
  }

  return true;
};

/**
 * Request intro for a project
 * @param projectIdOrSlug - The project ID or slug
 * @param introData - The intro request data
 * @returns Promise<boolean> - Returns true if successful
 */
export const requestProjectIntro = async (
  projectIdOrSlug: string,
  introData: {
    name: string;
    email: string;
    message: string;
  }
): Promise<boolean> => {
  const [, error] = await fetchData(
    INDEXER.PROJECT.REQUEST_INTRO(projectIdOrSlug),
    "POST",
    introData
  );

  if (error) {
    throw new Error(error);
  }

  return true;
};
