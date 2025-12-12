import { useQuery } from "@tanstack/react-query";
import type { Category } from "@/types/impactMeasurement";
import { getCommunityCategories } from "@/utilities/queries/v2/community";
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
 * Returns an empty array on error instead of throwing.
 * Automatically merges outputs into impact_segments to prevent duplication.
 *
 * @example
 * ```tsx
 * const { data: categories, isLoading, refetch } = useCommunityCategories('optimism');
 *
 * // Check for empty categories
 * if (categories.length === 0 && !isLoading) {
 *   // Handle empty state
 * }
 * ```
 */
export const useCommunityCategories = (
  communityUIDorSlug?: string,
  options?: UseCommunityCategories
) => {
  return useQuery({
    queryKey: QUERY_KEYS.COMMUNITY.CATEGORIES(communityUIDorSlug),
    queryFn: () => getCommunityCategories(communityUIDorSlug!),
    enabled: !!communityUIDorSlug && options?.enabled !== false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};
