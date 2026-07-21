import { useQuery } from "@tanstack/react-query";
import type { CommunityStats } from "@/types/v2/community";
import { getCommunityStats } from "@/utilities/queries/v2/getCommunityData";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseCommunityStatsOptions {
  enabled?: boolean;
}

/**
 * Canonical hook for per-community aggregate stats (total projects, grants, milestones,
 * updates, etc.).
 *
 * This is the single source of truth for community stats — the Header, Impact StatCards,
 * and ImpactOutcomes all consume it through the shared `QUERY_KEYS.COMMUNITY.STATS` key so
 * the figures stay consistent across routes and a single fetch is shared/cached.
 *
 * `getCommunityStats` now rejects on a fetch failure or empty payload instead of returning
 * a fabricated all-zero object, so `isError` reflects real failures and the consuming UI can
 * render an error + retry affordance. A genuine zero is surfaced honestly.
 *
 * @param communityUIDorSlug - The community UID or slug to fetch stats for
 * @param options - Configuration options for the hook behavior
 */
export const useCommunityStats = (
  communityUIDorSlug?: string,
  options?: UseCommunityStatsOptions
) => {
  const query = useQuery<CommunityStats, Error>({
    queryKey: QUERY_KEYS.COMMUNITY.STATS(communityUIDorSlug),
    queryFn: () => getCommunityStats(communityUIDorSlug!),
    enabled: !!communityUIDorSlug && options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    stats: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
