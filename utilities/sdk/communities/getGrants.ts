import type { Hex } from "@show-karma/karma-gap-sdk";
import { SortByOptions, StatusOptions } from "@/types/filters";
import { filterByStatus, orderBySortBy } from "./grants";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const getGrants = async (
  uid: Hex,
  filter?: {
    categories?: string[];
    sortBy?: SortByOptions;
    status?: StatusOptions;
  },
  paginationOps?: {
    page: number;
    pageLimit: number;
  }
) => {
  try {
    const [grants] = await fetchData(
      INDEXER.COMMUNITY.GRANTS(uid, {
        page: paginationOps?.page,
        pageLimit: paginationOps?.pageLimit,
        categories: filter?.categories?.join(","),
        sort: filter?.sortBy,
        status: filter?.status,
      })
    );
    let grantsToFilter = [...grants];
    if (grantsToFilter.length === 0) {
      return [];
    }
    // API returns all grants with filters and sorts, so we don't need to filter them anymore
    // if (filter?.categories?.length) {
    //   grantsToFilter = filterByCategory(filter.categories, grantsToFilter);
    // }
    // if (filter?.status) {
    //   grantsToFilter = filterByStatus(filter.status, grantsToFilter);
    // }

    // if (filter?.sortBy) {
    //   grantsToFilter = orderBySortBy(filter.sortBy, grantsToFilter);
    // }

    return grantsToFilter;
  } catch (error) {
    console.log(error);
    return [];
  }
};
