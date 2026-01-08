import { cache } from "react";
import type {
  PaginatedFundingPrograms,
  PaginatedFundingProgramsResponse,
} from "@/src/features/funding-map/types/funding-program";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

const DEFAULT_RESPONSE: PaginatedFundingPrograms = {
  programs: [],
  count: 0,
  totalPages: 0,
};

export const getFundingOpportunities = cache(
  async (communityId: string): Promise<PaginatedFundingPrograms> => {
    try {
      const params = new URLSearchParams({
        communityUid: communityId,
        onlyOnKarma: "true",
        status: "active",
        limit: "50",
      });

      const [response, error] = await fetchData<PaginatedFundingProgramsResponse>(
        `${INDEXER.V2.REGISTRY.GET_ALL}?${params.toString()}`
      );

      if (error || !response) {
        return DEFAULT_RESPONSE;
      }

      return {
        programs: response.programs,
        count: response.count,
        totalPages: response.totalPages,
      };
    } catch {
      return DEFAULT_RESPONSE;
    }
  }
);
