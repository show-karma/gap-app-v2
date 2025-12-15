import { useQuery } from "@tanstack/react-query";
import { getCommunityDetails } from "@/utilities/queries/v2/community";
import { QUERY_KEYS } from "@/utilities/queryKeys";

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
    queryFn: () => getCommunityDetails(communityUIDorSlug!),
    enabled: !!communityUIDorSlug && options?.enabled !== false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};
