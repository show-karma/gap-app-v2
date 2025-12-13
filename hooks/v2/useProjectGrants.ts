import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/components/Utilities/PrivyProviderWrapper";
import { getProjectGrants } from "@/services/project-grants.service";
import type { GrantResponse } from "@/types/v2/grant";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Hook to fetch project grants using the dedicated API endpoint.
 *
 * @param projectIdOrSlug - The project UID or slug
 * @returns Object containing grants array, loading state, error, and refetch function
 */
export function useProjectGrants(projectIdOrSlug: string) {
  const queryKey = QUERY_KEYS.PROJECT.GRANTS(projectIdOrSlug);
  const updateQueryKey = QUERY_KEYS.PROJECT.UPDATES(projectIdOrSlug);
  const milestonesQueryKey = QUERY_KEYS.PROJECT.MILESTONES(projectIdOrSlug);

  const {
    data,
    isLoading,
    error,
    refetch: originalRefetch,
  } = useQuery<GrantResponse[]>({
    queryKey,
    queryFn: () => getProjectGrants(projectIdOrSlug),
    enabled: !!projectIdOrSlug,
    staleTime: 5 * 60 * 1000,
  });

  const grants = data || [];

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey: updateQueryKey });
    await queryClient.invalidateQueries({ queryKey: milestonesQueryKey });
    return originalRefetch();
  };

  return {
    grants,
    isLoading,
    error,
    refetch,
  };
}
