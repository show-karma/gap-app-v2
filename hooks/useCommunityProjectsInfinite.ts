"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { MaturityStageOptions, SortByOptions, StatusOptions } from "@/types";
import type { CommunityProjectsResponse } from "@/types/community";
import { getCommunityProjects } from "@/utilities/queries/v2/community";

const getStatusFromMaturityStage = (stage: MaturityStageOptions): StatusOptions | undefined => {
  if (stage === "all") return undefined;
  return `maturity-stage-${stage}` as StatusOptions;
};

const mapSortToApiValue = (sortOption: SortByOptions): string => {
  const sortMappings: Record<SortByOptions, string> = {
    recent: "recent",
    completed: "completed",
    milestones: "milestones",
    txnCount: "transactions_desc",
  };
  return sortMappings[sortOption];
};

interface UseInfiniteCommunityProjectsOptions {
  communityId: string;
  sortBy: SortByOptions;
  categories: string[];
  maturityStage: MaturityStageOptions;
  programId: string | null;
  trackIds: string[] | null;
  limit?: number;
  enabled?: boolean;
}

export function useCommunityProjectsInfinite({
  communityId,
  sortBy,
  categories,
  maturityStage,
  programId,
  trackIds,
  limit = 12,
  enabled = true,
}: UseInfiniteCommunityProjectsOptions) {
  const queryKey = [
    "community-projects-infinite",
    communityId,
    sortBy,
    categories,
    maturityStage,
    programId,
    trackIds,
  ];

  return useInfiniteQuery<CommunityProjectsResponse, Error>({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getCommunityProjects(communityId, {
        page: pageParam as number,
        limit,
        sortBy: mapSortToApiValue(sortBy),
        status: getStatusFromMaturityStage(maturityStage),
        categories: categories.filter(Boolean).join(","),
        selectedProgramId: programId || undefined,
        selectedTrackIds: trackIds || undefined,
      });

      return response;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: enabled && !!communityId,
    staleTime: 0, // Always consider data stale when filters change
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    refetchOnMount: "always", // Always refetch when component mounts
  });
}
