import type { PageInfo } from "@/types/pagination";
import type { ProjectFromList } from "@/types/project";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

export const getExplorerProjects = async (
  pageSize: number,
  page: number = 0,
  sortBy = "createdAt",
  sortOrder: "desc" | "asc" = "desc"
): Promise<{
  projects: ProjectFromList[];
  pageInfo: PageInfo;
  nextOffset: number;
}> => {
  try {
    const [data, error, pageInfo] = await fetchData(
      INDEXER.PROJECTS.GET_ALL(page * pageSize, pageSize, sortBy, sortOrder),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );
    if (error) {
      throw new Error("Something went wrong while fetching new projects");
    }
    return {
      projects: data?.data as ProjectFromList[],
      pageInfo: pageInfo,
      nextOffset: page + 1,
    };
  } catch (_e) {
    return {
      projects: [],
      pageInfo: { totalItems: 0, page: 0, pageLimit: pageSize },
      nextOffset: 0,
    };
  }
};
