import { errorManager } from "@/components/Utilities/errorManager"
import type { SortByOptions, SortOrder } from "@/types/newProjects"
import type { ProjectFromList } from "@/types/project"
import fetchData from "../fetchData"
import { INDEXER } from "../indexer"

export const getNewProjects = async (
  pageSize: number,
  page: number = 0,
  sortBy: SortByOptions = "createdAt",
  sortOrder: SortOrder = "desc"
): Promise<{
  projects: any[]
  pageInfo: any
  nextOffset: number
}> => {
  try {
    const [data, error, pageInfo] = await fetchData(
      INDEXER.PROJECTS.GET_ALL(page * pageSize, pageSize, sortBy, sortOrder)
    )
    if (error) {
      throw new Error("Something went wrong while fetching new projects")
    }
    return {
      projects: data?.data as ProjectFromList[],
      pageInfo: pageInfo,
      nextOffset: page + 1,
    }
  } catch (e) {
    errorManager("Something went wrong while fetching new projects", e)
    return {
      projects: [],
      pageInfo: { totalItems: 0, page: 0, pageLimit: pageSize },
      nextOffset: 0,
    }
  }
}
