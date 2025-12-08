import { useQuery } from "@tanstack/react-query";
import { errorManager } from "@/components/Utilities/errorManager";
import type { CommunityDetailsV2 } from "@/types/community";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Fetches community data using the v2 endpoint
 */
const fetchCommunityDetails = async (
  communityUIDorSlug: string
): Promise<CommunityDetailsV2 | null> => {
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

  return data as CommunityDetailsV2;
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
 * @example
 * ```tsx
 * const { data: community, isLoading } = useCommunityDetails('optimism');
 * ```
 */
export const useCommunityDetails = (
  communityUIDorSlug?: string,
  options?: UseCommunityDetailsOptions
) => {
  return useQuery({
    queryKey: ["communityDetails", communityUIDorSlug],
    queryFn: () => fetchCommunityDetails(communityUIDorSlug!),
    enabled: !!communityUIDorSlug && options?.enabled !== false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};
