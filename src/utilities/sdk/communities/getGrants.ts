import errorManager from "@/lib/utils/error-manager";
import type { SortByOptions, StatusOptions } from "@/types/filters";
import fetchData from "@/lib/utils/fetch-data";
import { INDEXER } from "@/utilities/indexer";
import type { Hex } from "@show-karma/karma-gap-sdk";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

export interface GrantsResponse {
  grants: IGrantResponse[];
  pageInfo: {
    page?: string;
    pageLimit?: string;
    totalItems?: number;
  };
  uniqueProjectCount?: number;
}

export interface GrantsFilter {
  categories?: string[];
  sortBy?: SortByOptions;
  status?: StatusOptions;
  selectedProgramId?: string;
  selectedTrackIds?: string[];
}

export const getGrants = async (
  uid: Hex,
  filter?: GrantsFilter,
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
        selectedProgramId: filter?.selectedProgramId,
        selectedTrackIds: filter?.selectedTrackIds,
      })
    );
    if (!response) return { grants: [], pageInfo: {}, uniqueProjectCount: 0 };
    const { data: grants, pageInfo, uniqueProjectCount } = response;
    if (!grants || grants.length === 0) return { grants: [], pageInfo: {} };

    return { grants, pageInfo, uniqueProjectCount };
  } catch (error: any) {
    errorManager(`Error getting grants of community: ${uid}`, error);
    console.log(error);
    return { grants: [], pageInfo: {} };
  }
};
