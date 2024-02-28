import type { Hex } from "@show-karma/karma-gap-sdk";
import { SortByOptions, StatusOptions } from "@/types/filters";
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
    const [response] = await fetchData(
      INDEXER.COMMUNITY.GRANTS(uid, {
        page: paginationOps?.page,
        pageLimit: paginationOps?.pageLimit,
        categories: filter?.categories?.join(","),
        sort: filter?.sortBy,
        status: filter?.status,
      })
    );
    const { data: grants, pageInfo } = response;
    if (!grants || grants.length === 0) return { grants: [], pageInfo: {} };

    return { grants, pageInfo };
  } catch (error) {
    console.log(error);
    return { grants: [], pageInfo: {} };
  }
};
