import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/components/Utilities/PrivyProviderWrapper";
import { getProjectGrants } from "@/services/project-grants.service";
import type { Grant } from "@/types/v2/grant";
import { createProjectQueryPredicate, QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Hook to fetch project grants using the dedicated API endpoint.
 *
 * @param projectIdOrSlug - The project UID or slug
 * @returns Object containing grants array, loading state, error, and refetch function
 */
export function useProjectGrants(projectIdOrSlug: string) {
  const queryKey = QUERY_KEYS.PROJECT.GRANTS(projectIdOrSlug);

  const {
    data,
    isLoading,
    error,
    refetch: originalRefetch,
  } = useQuery<Grant[]>({
    queryKey,
    queryFn: () => getProjectGrants(projectIdOrSlug),
    enabled: !!projectIdOrSlug,
    staleTime: 5 * 60 * 1000,
  });

  const grants = data || [];

  const refetch = async () => {
    // Use predicate-based invalidation to refresh all project-related queries
    // This automatically handles grants, updates, milestones, impacts, and details
    // in a single call, and is more maintainable as new query types are added
    await queryClient.invalidateQueries({
      predicate: createProjectQueryPredicate(projectIdOrSlug),
    });
    return originalRefetch();
  };

  return {
    grants,
    isLoading,
    error,
    refetch,
  };
}
