"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getCommunityProjectsV2 } from "@/utilities/queries/getCommunityDataV2";
import type { CommunityProjectsV2Response, ProjectV2 } from "@/types/community";

interface UseCommunityProjectsPaginatedOptions {
  communityId: string;
  programId?: string;
  itemsPerPage?: number;
}

export function useCommunityProjectsPaginated({
  communityId,
  programId,
  itemsPerPage = 12,
}: UseCommunityProjectsPaginatedOptions) {
  return useInfiniteQuery<CommunityProjectsV2Response>({
    queryKey: ["community-projects-paginated", communityId, programId, itemsPerPage],
    queryFn: ({ pageParam = 1 }) =>
      getCommunityProjectsV2(communityId, {
        page: pageParam as number,
        limit: itemsPerPage,
        selectedProgramId: programId,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.pagination.hasNextPage) {
        return allPages.length + 1;
      }
      return undefined;
    },
    enabled: !!communityId && !!programId,
  });
}
