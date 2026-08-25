import type { PageInfo } from "@/types/pagination";
import type { ProjectFromList } from "@/types/project";
import { api } from "../api/client";
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
    // TODO(#1775): add zod schema
    const { data, pageInfo } = await api.getPaginated<ProjectFromList[]>(
      INDEXER.PROJECTS.GET_ALL(page * pageSize, pageSize, sortBy, sortOrder),
      { cache: true }
    );
    return {
      projects: data,
      pageInfo: {
        totalItems: pageInfo?.totalItems ?? 0,
        page: pageInfo?.page ?? page,
        pageLimit: pageInfo?.pageLimit ?? pageSize,
      },
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
