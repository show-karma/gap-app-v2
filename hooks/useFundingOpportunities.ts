"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fundingProgramsService } from "@/src/features/funding-map/services/funding-programs.service";
import type { PaginatedFundingProgramsResponse } from "@/src/features/funding-map/types/funding-program";

const FUNDING_OPPORTUNITIES_PAGE_SIZE = 50;

interface UseFundingOpportunitiesOptions {
  communityUid: string;
  enabled?: boolean;
}

export function useFundingOpportunities({
  communityUid,
  enabled = true,
}: UseFundingOpportunitiesOptions) {
  return useInfiniteQuery<PaginatedFundingProgramsResponse, Error>({
    queryKey: ["funding-opportunities-infinite", communityUid],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await fundingProgramsService.getAll({
        communityUid,
        onlyOnKarma: true,
        status: "Active",
        page: pageParam as number,
        pageSize: FUNDING_OPPORTUNITIES_PAGE_SIZE,
      });

      return {
        programs: result.programs,
        count: result.count,
        totalPages: result.totalPages,
        currentPage: pageParam as number,
        hasNext: (pageParam as number) < result.totalPages,
        hasPrevious: (pageParam as number) > 1,
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasNext ? lastPage.currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: enabled && !!communityUid,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
