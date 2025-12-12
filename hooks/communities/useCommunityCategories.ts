import { useQuery } from "@tanstack/react-query";
import { errorManager } from "@/components/Utilities/errorManager";
import type { Category } from "@/types/impactMeasurement";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Fetches community categories with impact segments
 *
 * @remarks
 * Returns empty array on error instead of throwing.
 * Automatically merges outputs into impact_segments to avoid duplication.
 * Errors are logged via errorManager for monitoring.
 */
const fetchCommunityCategories = async (communityUIDorSlug: string): Promise<Category[]> => {
  const [data, error] = await fetchData(
    INDEXER.COMMUNITY.CATEGORIES(communityUIDorSlug),
    "GET",
    {},
    {},
    {},
    false
  );

  if (error || !data) {
    errorManager(`Error fetching categories of community ${communityUIDorSlug}`, error, {
      communityUIDorSlug,
    });
    return [];
  }

  const categoriesWithoutOutputs = data.map((category: Category) => {
    const outputsNotDuplicated = category.outputs?.filter(
      (output) =>
        !category.impact_segments?.some(
          (segment) => segment.id === output.id || segment.name === output.name
        )
    );
    return {
      ...category,
      impact_segments: [
        ...(category.impact_segments || []),
        ...(outputsNotDuplicated || []).map((output: any) => {
          return {
            id: output.id,
            name: output.name,
            description: output.description,
            impact_indicators: [],
            type: output.type,
          };
        }),
      ],
    };
  });

  return categoriesWithoutOutputs;
};

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
    queryFn: () => fetchCommunityCategories(communityUIDorSlug!),
    enabled: !!communityUIDorSlug && options?.enabled !== false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};
