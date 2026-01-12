"use client";

import { useQuery } from "@tanstack/react-query";
import { fundingProgramsService } from "@/src/features/funding-map/services/funding-programs.service";

interface UseFundingOpportunitiesCountOptions {
  communityUid?: string;
  enabled?: boolean;
}

/**
 * Hook to check if a community has any active funding opportunities
 * Returns the count of active funding programs
 */
export function useFundingOpportunitiesCount({
  communityUid,
  enabled = true,
}: UseFundingOpportunitiesCountOptions) {
  return useQuery({
    queryKey: ["funding-opportunities-count", communityUid],
    queryFn: async () => {
      const result = await fundingProgramsService.getAll({
        communityUid,
        onlyOnKarma: true,
        status: "Active",
        page: 1,
        pageSize: 1, // We only need the count, not the full list
      });

      return result.count;
    },
    enabled: enabled && !!communityUid,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
