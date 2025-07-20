import { PageInfo } from "@/types/pagination";
import { INDEXER } from "../indexer";
import errorManager from "@/lib/utils/error-manager";
import fetchData from "@/lib/utils/fetch-data";
import { ProjectFromList } from "@/features/projects/types";

type SortByOptions =
  | "createdAt"
  | "updatedAt"
  | "title"
  | "noOfGrants"
  | "noOfProjectMilestones";

type SortOrder = "asc" | "desc";

export const getNewProjects = async (
  pageSize: number,
  page: number = 0,
  sortBy: SortByOptions = "createdAt",
  sortOrder: SortOrder = "desc"
): Promise<{
  projects: any[];
  pageInfo: any;
  nextOffset: number;
}> => {
  try {
    const [data, error, pageInfo] = await fetchData(
      INDEXER.PROJECTS.GET_ALL(page * pageSize, pageSize, sortBy, sortOrder)
    );
    if (error) {
      throw new Error("Something went wrong while fetching new projects");
    }
    return {
      projects: data?.data as ProjectFromList[],
      pageInfo: pageInfo,
      nextOffset: page + 1,
    };
  } catch (e) {
    errorManager("Something went wrong while fetching new projects", e);
    return {
      projects: [],
      pageInfo: { totalItems: 0, page: 0, pageLimit: pageSize },
      nextOffset: 0,
    };
  }
};
