"use client";
import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import type { MaturityStageOptions, SortByOptions } from "@/types";
import type { CommunityProjects } from "@/types/v2/community";
import { PRERENDER_SAFE_STALE_TIME } from "@/utilities/queries/prerenderStaleTime";
import {
  COMMUNITY_PROJECTS_PAGE_SIZE,
  getStatusFromMaturityStage,
  mapSortToApiValue,
} from "@/utilities/queries/v2/communityProjectsRequest";
import { getCommunityProjects } from "@/utilities/queries/v2/getCommunityData";

interface UseInfiniteCommunityProjectsOptions {
  communityId: string;
  sortBy: SortByOptions;
  categories: string[];
  maturityStage: MaturityStageOptions;
  programId: string | null;
  trackIds: string[] | null;
  limit?: number;
  enabled?: boolean;
  /** SSR seed: the server-rendered page wrapped as InfiniteData. */
  initialData?: InfiniteData<CommunityProjects, number>;
  /**
   * When the seed was produced (`useRenderedAt()`). Required alongside
   * `initialData`: without it React Query stamps the entry with `Date.now()`
   * as the query is created, and that clock read aborts a cacheComponents
   * prerender of the crawlable grid.
   */
  initialDataUpdatedAt?: number;
  /** Page the seed (and any client retry) starts from. Defaults to 1. */
  initialPage?: number;
}

export function useCommunityProjectsInfinite({
  communityId,
  sortBy,
  categories,
  maturityStage,
  programId,
  trackIds,
  limit = COMMUNITY_PROJECTS_PAGE_SIZE,
  enabled = true,
  initialData,
  initialDataUpdatedAt,
  initialPage = 1,
}: UseInfiniteCommunityProjectsOptions) {
  // initialPage is part of the key so a ?page=2 seed can never bleed into the
  // page-1 cache entry (same policy as the /projects explorer).
  const queryKey = [
    "community-projects-infinite",
    communityId,
    sortBy,
    categories,
    maturityStage,
    programId,
    trackIds,
    initialPage,
  ];

  return useInfiniteQuery<
    CommunityProjects,
    Error,
    InfiniteData<CommunityProjects, number>,
    readonly unknown[],
    number
  >({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const response = await getCommunityProjects(communityId, {
        page: pageParam,
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
    initialData,
    initialDataUpdatedAt,
    initialPageParam: initialPage,
    enabled: enabled && !!communityId,
    // Always consider data stale when filters change — on the client. The
    // server never fetches for this query (no effects run in a prerender or
    // under renderToString), but the observer still computes `isStale` for
    // its first result, and that goes through `timeUntilStale` → `Date.now()`,
    // which cacheComponents rejects above the hub's crawlable grid. `"static"`
    // is the one value that returns before the clock is touched (see
    // PRERENDER_SAFE_STALE_TIME); applied server-side only, so the client
    // keeps the mount revalidation below.
    staleTime: typeof window === "undefined" ? PRERENDER_SAFE_STALE_TIME : 0,
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    refetchOnMount: "always", // Always refetch when component mounts
  });
}
