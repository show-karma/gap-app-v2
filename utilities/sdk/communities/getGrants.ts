import type { SortByOptions, StatusOptions } from "@/types/filters";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { Grant } from "@show-karma/karma-gap-sdk/core/class/entities/Grant";
import { Hex } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

export interface GrantsResponse {
  grants: Grant[];
  pageInfo: {
    page?: string;
    pageLimit?: string;
    totalItems?: number;
  };
}

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
): Promise<GrantsResponse> => {
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
