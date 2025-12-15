import { useQuery } from "@tanstack/react-query";
import type { Community } from "@/types/v2/community";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseCommunityDetailsOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch community details using the v2 API endpoint.
 *
 * Uses the faster `/v2/communities/:communityUIDorSlug` endpoint.
 *
 * @param communityUIDorSlug - The community UID or slug to fetch
 * @param options - Configuration options for the hook behavior
 *
 * @returns Object containing:
 * - community: The community data
 * - isLoading: boolean indicating if the fetch is in progress
 * - isError: boolean indicating if an error occurred
 * - error: any error that occurred during the fetch
 * - refetch: function to manually trigger a re-fetch
 *
 * @example
 * ```tsx
 * const { community, isLoading } = useCommunityDetails('community-slug');
 *
 * if (isLoading) return <Spinner />;
 * if (community) return <CommunityDetails community={community} />;
 * ```
 */
export const useCommunityDetails = (
  communityUIDorSlug?: string,
  options?: UseCommunityDetailsOptions
) => {
  const query = useQuery<Community | null, Error>({
    queryKey: QUERY_KEYS.COMMUNITY.DETAILS_V2(communityUIDorSlug),
    queryFn: () => getCommunityDetails(communityUIDorSlug!),
    enabled: !!communityUIDorSlug && options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    community: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
