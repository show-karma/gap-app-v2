import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchCommunityReviewers } from "@/services/community-reviewers/community-reviewers.api";
import type { CommunityReviewersResponse } from "@/services/community-reviewers/community-reviewers.types";
import { QUERY_KEYS } from "@/utilities/queryKeys";

const DEFAULT_PAGE_LIMIT = 50;

export interface UseCommunityReviewersParams {
  communityUID: string;
  programId?: string;
  search?: string;
  enabled?: boolean;
}

/**
 * Hook for fetching the community-scoped reviewer pool with cursor pagination.
 * Uses useInfiniteQuery so the modal can load more results as the user scrolls.
 * Mirror shape: useProgramReviewers.ts (but with useInfiniteQuery instead of useQuery).
 */
export function useCommunityReviewers({
  communityUID,
  programId,
  search,
  enabled = true,
}: UseCommunityReviewersParams) {
  const query = useInfiniteQuery<CommunityReviewersResponse, Error>({
    queryKey: QUERY_KEYS.REVIEWERS.COMMUNITY(communityUID, programId, search),
    queryFn: async ({ pageParam }) => {
      return fetchCommunityReviewers(communityUID, {
        programId,
        search,
        cursor: typeof pageParam === "string" ? pageParam : undefined,
        limit: DEFAULT_PAGE_LIMIT,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: CommunityReviewersResponse) => lastPage.nextCursor ?? undefined,
    enabled: !!communityUID && enabled,
  });

  const allItems = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data]
  );

  return useMemo(
    () => ({
      items: allItems,
      isLoading: query.isLoading,
      isFetchingNextPage: query.isFetchingNextPage,
      isError: query.isError,
      error: query.error,
      hasNextPage: query.hasNextPage,
      fetchNextPage: query.fetchNextPage,
      refetch: query.refetch,
    }),
    [query, allItems]
  );
}
