import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { ProjectFromList } from "@/types/project";
import { PageInfo } from "@/types/pagination";
import { errorManager } from "@/components/Utilities/errorManager";
import { chosenCommunities } from "@/utilities/chosenCommunities";

export interface GetExplorerProjectsParams {
  pageSize: number;
  page: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  name?: string;
  communities?: string[];
  communityConfigurations?: Array<{
    id: string;
    isBlockchain: boolean;
    chainId?: number;
  }>;
}

export interface GetExplorerProjectsResponse {
  projects: ProjectFromList[];
  pageInfo: PageInfo;
  nextOffset: number;
}

export interface Community {
  name: string;
  slug: string;
  uid: string;
  imageURL?: {
    light: string;
    dark: string;
  };
}

export const explorerProjectsService = {
  /**
   * Get explorer projects with filtering and sorting
   */
  getExplorerProjects: async ({
    pageSize,
    page = 0,
    sortBy = "createdAt",
    sortOrder = "desc",
    name,
    communities,
    communityConfigurations,
  }: GetExplorerProjectsParams): Promise<GetExplorerProjectsResponse> => {
    try {
      // URL for POST request
      const url = INDEXER.PROJECTS.POST_ALL();

      // Create request body
      const requestBody = {
        limit: pageSize,
        offset: page * pageSize,
        sortField: sortBy,
        sortOrder,
        name: name && name.trim() !== "" ? name.trim() : undefined,
        communityConfigurations,
      };

      const [data, error, pageInfo] = await fetchData(
        url,
        "POST",
        requestBody,
        undefined,
        {
          "Content-Type": "application/json",
        },
        true,
        true
      );

      if (error) {
        throw new Error("Error fetching explorer projects");
      }

      return {
        projects: data?.data as ProjectFromList[],
        pageInfo: pageInfo || { totalItems: 0, page, pageLimit: pageSize },
        nextOffset: page + 1,
      };
    } catch (error: any) {
      errorManager("Error fetching explorer projects", error);
      return {
        projects: [],
        pageInfo: { totalItems: 0, page: 0, pageLimit: pageSize },
        nextOffset: 0,
      };
    }
  },

  /**
   * Get list of available communities
   */
  getCommunities: async (): Promise<Community[]> => {
    // Use the chosenCommunities function from utilities
    return chosenCommunities();
  },
};
