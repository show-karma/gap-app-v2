import type { Hex } from "@show-karma/karma-gap-sdk";
import { SortByOptions, StatusOptions } from "@/types/filters";
import { filterByCategory, filterByStatus, orderBySortBy } from "./grants";
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
    // const grants = await gap.fetch.grantsByCommunity(uid);
    const [grants] = await fetchData(
      INDEXER.COMMUNITY.GRANTS(uid, {
        page: paginationOps?.page || 0,
        pageLimit: paginationOps?.pageLimit || 12,
        categories: filter?.categories?.join(","),
      })
    );
    let grantsToFilter = [...grants];
    if (grantsToFilter.length === 0) {
      return [];
    }
    // API returns all grants with categories, so we don't need to filter them anymore
    // if (filter?.categories?.length) {
    //   grantsToFilter = filterByCategory(filter.categories, grantsToFilter);
    // }
    if (filter?.status) {
      grantsToFilter = filterByStatus(filter.status, grantsToFilter);
    }

    if (filter?.sortBy) {
      grantsToFilter = orderBySortBy(filter.sortBy, grantsToFilter);
    }

    return grantsToFilter;
  } catch (error) {
    console.log(error);
    return [];
  }
};
