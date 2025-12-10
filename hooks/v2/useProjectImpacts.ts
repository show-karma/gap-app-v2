import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/components/Utilities/PrivyProviderWrapper";
import { getProjectImpacts, type ProjectImpact } from "@/services/project-impacts.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Hook to fetch project impacts using the dedicated API endpoint.
 *
 * @param projectIdOrSlug - The project UID or slug
 * @returns Object containing impacts array, loading state, error, and refetch function
 */
export function useProjectImpacts(projectIdOrSlug: string) {
  const queryKey = QUERY_KEYS.PROJECT.IMPACTS(projectIdOrSlug);

  const {
    data,
    isLoading,
    error,
    refetch: originalRefetch,
  } = useQuery<ProjectImpact[]>({
    queryKey,
    queryFn: () => getProjectImpacts(projectIdOrSlug),
    enabled: !!projectIdOrSlug,
    staleTime: 5 * 60 * 1000,
  });

  const impacts = data || [];

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey });
    return originalRefetch();
  };

  return {
    impacts,
    isLoading,
    error,
    refetch,
  };
}
