import { errorManager } from "@/components/Utilities/errorManager";
import type { SortByOptions, SortOrder } from "@/types/newProjects";
import type { ProjectFromList } from "@/types/project";
import { api } from "../api/client";
import { INDEXER } from "../indexer";

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
    // TODO(#1775): add zod schema
    const { data, pageInfo } = await api.getPaginated<ProjectFromList[]>(
      INDEXER.PROJECTS.GET_ALL(page * pageSize, pageSize, sortBy, sortOrder)
    );
    return {
      projects: data,
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
