import type { Hex } from "@show-karma/karma-gap-sdk";

import { getGapClient } from "@/hooks/useGap";

import { SortByOptions, StatusOptions } from "@/types/filters";
import { appNetwork } from "@/utilities/network";
import { filterByCategory, filterByStatus, orderBySortBy } from "./grants";

export const getGrants = async (
  uid: Hex,
  filter?: {
    categories?: string[];
    sortBy?: SortByOptions;
    status?: StatusOptions;
  }
) => {
  try {
    const gap = getGapClient(appNetwork[0].id);
    const grants = await gap.fetch.grantsByCommunity(uid);
    let grantsToFilter = [...grants];
    if (grantsToFilter.length === 0) {
      return [];
    }
    if (filter?.categories?.length) {
      grantsToFilter = filterByCategory(filter.categories, grantsToFilter);
    }
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
