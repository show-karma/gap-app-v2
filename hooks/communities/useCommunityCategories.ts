import { useQuery } from "@tanstack/react-query";
import { getCommunityCategoriesOrThrow } from "@/utilities/queries/v2/community";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseCommunityCategories {
  enabled?: boolean;
}

/**
 * Hook to fetch community categories with impact segments
 *
 * @param communityUIDorSlug - The community UID or slug to fetch categories for
 * @param options - Configuration options
 *
 * @returns React Query result with categories data
 *
 * @remarks
 * Surfaces a real error state: the query function throws on request failure,
 * so `isError` is truthful and `refetch` is meaningful. A community with no
 * configured categories resolves to an empty array (not an error), keeping
 * the empty and error states distinguishable.
 * Automatically merges outputs into impact_segments to prevent duplication.
 *
 * @example
 * ```tsx
 * const { data: categories, isLoading, isError, refetch } = useCommunityCategories('optimism');
 *
 * if (isError) {
 *   // Render an error state with retry
 * } else if (!isLoading && categories?.length === 0) {
 *   // Render the empty state
 * }
 * ```
 */
export const useCommunityCategories = (
  communityUIDorSlug?: string,
  options?: UseCommunityCategories
) => {
  return useQuery({
    queryKey: QUERY_KEYS.COMMUNITY.CATEGORIES(communityUIDorSlug),
    queryFn: () => getCommunityCategoriesOrThrow(communityUIDorSlug!),
    enabled: !!communityUIDorSlug && options?.enabled !== false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};
