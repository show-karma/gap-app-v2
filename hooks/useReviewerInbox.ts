import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import type { IApplicationFilters } from "@/services/fundingPlatformService";
import { getReviewerInbox } from "@/services/reviewerInboxService";
import type { IReviewerInboxResponse } from "@/types/funding-platform";

interface UseReviewerInboxOptions {
  /** Disable the query (e.g. while permissions are still loading). */
  enabled?: boolean;
}

const EMPTY_STATS: IReviewerInboxResponse["stats"] = {
  action: 0,
  waiting: 0,
  done: 0,
  overdue: 0,
  applications: 0,
  milestones: 0,
};

/**
 * Fetches the reviewer inbox — the caller's unified pending reviews (funding
 * applications + milestone verifications) across every program in a community.
 * The indexer merges, buckets, sorts and paginates server-side (no frontend
 * fan-out per CONTEXT.md). Admins may scope to another reviewer via
 * `filters.reviewerAddress`.
 *
 * Returns the server feed directly: `items` are already projected onto the
 * presentational inbox shape, with header `stats` and `pagination`.
 */
export function useReviewerInbox(
  communityId: string,
  filters: IApplicationFilters = {},
  options: UseReviewerInboxOptions = {}
) {
  const { enabled = true } = options;

  const query = useQuery<IReviewerInboxResponse>({
    queryKey: QUERY_KEYS.reviewerInbox(communityId, filters),
    queryFn: () => getReviewerInbox(communityId, filters),
    enabled: Boolean(communityId) && enabled,
    // Keep the previous page visible while a new page/filter loads to avoid
    // list flicker in the master pane.
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return {
    items: query.data?.items ?? [],
    pagination: query.data?.pagination ?? null,
    stats: query.data?.stats ?? EMPTY_STATS,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
