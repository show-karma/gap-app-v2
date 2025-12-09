import { useQuery } from "@tanstack/react-query";
import { errorManager } from "@/components/Utilities/errorManager";
import type { CommunityDetails } from "@/types/community";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Fetches community data using the v2 endpoint
 *
 * @remarks
 * Returns null on error instead of throwing. This means React Query will show
 * `isSuccess: true` and `isError: false` even when the API fails.
 * Consumers should check `data === null` to detect fetch failures.
 * Errors are logged via errorManager for monitoring.
 */
const fetchCommunityDetails = async (
  communityUIDorSlug: string
): Promise<CommunityDetails | null> => {
  const [data, error] = await fetchData(
    INDEXER.COMMUNITY.V2.GET(communityUIDorSlug),
    "GET",
    {},
    {},
    {},
    false
  );

  if (error || !data) {
    errorManager(`Error fetching community ${communityUIDorSlug}`, error, {
      communityUIDorSlug,
    });
    return null;
  }

  return data as CommunityDetails;
};

interface UseCommunityDetailsOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch community data using the v2 endpoint
 *
 * @param communityUIDorSlug - The community UID or slug to fetch
 * @param options - Configuration options
 *
 * @returns React Query result with community data
 *
 * @remarks
 * **Important:** This hook returns `null` on error instead of throwing.
 * Therefore `isSuccess` will be `true` and `isError` will be `false` even when
 * the API request fails. Always check `data === null` to detect failures.
 *
 * @example
 * ```tsx
 * const { data: community, isLoading } = useCommunityDetails('optimism');
 *
 * // Check for fetch failure
 * if (data === null && !isLoading) {
 *   // Handle error case
 * }
 * ```
 */
export const useCommunityDetails = (
  communityUIDorSlug?: string,
  options?: UseCommunityDetailsOptions
) => {
  return useQuery({
    queryKey: QUERY_KEYS.COMMUNITY.DETAILS(communityUIDorSlug),
    queryFn: () => fetchCommunityDetails(communityUIDorSlug!),
    enabled: !!communityUIDorSlug && options?.enabled !== false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};
