import type { Grant, Hex } from "@show-karma/karma-gap-sdk";
import type { SortByOptions, StatusOptions } from "@/types/filters";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { errorManager } from "@/components/Utilities/errorManager";

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
    selectedProgramId?: string;
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
        selectedProgramId: filter?.selectedProgramId,
      })
    );
    if (!response) return { grants: [], pageInfo: {} };
    const { data: grants, pageInfo } = response;
    if (!grants || grants.length === 0) return { grants: [], pageInfo: {} };

    return { grants, pageInfo };
  } catch (error: any) {
    errorManager(`Error getting grants of community: ${uid}`, error);
    console.log(error);
    return { grants: [], pageInfo: {} };
  }
};
