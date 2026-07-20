"use client";

import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";
import { getExplorerProjectsPaginated } from "@/services/projects-explorer.service";
import type { ExplorerSortByOptions, ExplorerSortOrder } from "@/types/explorer";
import type { PaginatedProjectsResponse } from "@/types/v2/project";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseProjectsExplorerInfiniteOptions {
  search?: string;
  sortBy?: ExplorerSortByOptions;
  sortOrder?: ExplorerSortOrder;
  limit?: number;
  enabled?: boolean;
  hasPayoutAddress?: boolean;
  /** SSR seed: the server-rendered first page wrapped as InfiniteData. */
  initialData?: InfiniteData<PaginatedProjectsResponse, number>;
  /** Page the seed (or client retry) starts from. Defaults to 1. */
  initialPage?: number;
}

/**
 * Hook to fetch projects for the explorer page with infinite scroll pagination.
 * Uses V2 API with automatic test project filtering.
 *
 * @param options - Configuration options including search, sort, and pagination
 * @returns Infinite query result with projects data and pagination controls
 *
 * @example
 * ```tsx
 * const {
 *   projects,
 *   isLoading,
 *   hasNextPage,
 *   fetchNextPage,
 *   isFetchingNextPage
 * } = useProjectsExplorerInfinite({
 *   search: 'dao',
 *   sortBy: 'updatedAt',
 *   sortOrder: 'desc'
 * });
 * ```
 */
export const useProjectsExplorerInfinite = (options: UseProjectsExplorerInfiniteOptions = {}) => {
  const {
    search = "",
    sortBy = "updatedAt",
    sortOrder = "desc",
    limit = PROJECTS_EXPLORER_CONSTANTS.RESULT_LIMIT,
    enabled = true,
    hasPayoutAddress = false,
    initialData,
    initialPage = 1,
  } = options;

  const query = useInfiniteQuery<
    PaginatedProjectsResponse,
    Error,
    InfiniteData<PaginatedProjectsResponse, number>,
    ReturnType<typeof QUERY_KEYS.PROJECT.EXPLORER_INFINITE>,
    number
  >({
    queryKey: QUERY_KEYS.PROJECT.EXPLORER_INFINITE({
      search,
      sortBy,
      sortOrder,
      limit,
      hasPayoutAddress,
      page: initialPage,
    }),
    queryFn: async ({ pageParam }) => {
      return getExplorerProjectsPaginated({
        search,
        page: pageParam,
        limit,
        sortBy,
        sortOrder,
        includeStats: true, // Always include stats for explorer cards
        hasPayoutAddress,
      });
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined;
    },
    initialData,
    initialPageParam: initialPage,
    enabled,
    staleTime: PROJECTS_EXPLORER_CONSTANTS.STALE_TIME_MS,
    gcTime: 1000 * 60 * 10, // 10 minutes
    // A server seed is already fresh — don't refetch it on mount; without a seed
    // keep the previous always-refetch behavior.
    refetchOnMount: initialData ? false : "always",
  });

  // Flatten all pages into a single array of projects
  const projects = query.data?.pages.flatMap((page) => page.payload) ?? [];

  // Get total count from the first page
  const totalCount = query.data?.pages[0]?.pagination.totalCount ?? 0;

  return {
    projects,
    totalCount,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
};
