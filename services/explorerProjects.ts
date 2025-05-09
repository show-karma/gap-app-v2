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
  }: GetExplorerProjectsParams): Promise<GetExplorerProjectsResponse> => {
    try {
      // Construct URL parameters for API call
      let url = INDEXER.PROJECTS.GET_ALL(
        page * pageSize,
        pageSize,
        sortBy,
        sortOrder
      );

      // Add name search parameter if provided
      if (name && name.trim() !== "") {
        url += `&name=${encodeURIComponent(name.trim())}`;
      }

      // Add communities filter if provided
      if (communities && communities.length > 0) {
        // Join communities with comma for backend API
        const communitiesParam = communities.join(",");
        url += `&communities=${encodeURIComponent(communitiesParam)}`;
      }

      const [data, error, pageInfo] = await fetchData(
        url,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
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
