"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { CommunityProjects } from "@/types/v2/community";
import { getCommunityProjects } from "@/utilities/queries/v2/getCommunityData";

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
  return useInfiniteQuery<CommunityProjects>({
    queryKey: ["community-projects-paginated", communityId, programId, itemsPerPage],
    queryFn: ({ pageParam = 1 }) =>
      getCommunityProjects(communityId, {
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
