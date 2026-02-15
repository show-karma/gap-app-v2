import { useQuery } from "@tanstack/react-query";
import { getProjectImpacts, type ProjectImpact } from "@/services/project-impacts.service";
import { queryClient } from "@/utilities/query-client";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseProjectImpactsOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch project impacts using the dedicated API endpoint.
 *
 * @param projectIdOrSlug - The project UID or slug
 * @returns Object containing impacts array, loading state, error, and refetch function
 */
export function useProjectImpacts(projectIdOrSlug: string, options: UseProjectImpactsOptions = {}) {
  const queryKey = QUERY_KEYS.PROJECT.IMPACTS(projectIdOrSlug);
  const isEnabled = options.enabled ?? true;

  const {
    data,
    isLoading,
    error,
    refetch: originalRefetch,
  } = useQuery<ProjectImpact[]>({
    queryKey,
    queryFn: () => getProjectImpacts(projectIdOrSlug),
    enabled: !!projectIdOrSlug && isEnabled,
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
