import { useQuery } from "@tanstack/react-query";
import { getProjectImpacts, type ProjectImpact } from "@/services/project-impacts.service";
import { queryClient } from "@/utilities/query-client";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseProjectImpactsOptions {
  /**
   * Whether the request should attach a Privy bearer token. Defaults to
   * `true` for backward compatibility. Public profile callers MUST pass
   * `false` to keep anonymous refetches off the auth-required code path.
   */
  isAuthorized?: boolean;
}

/**
 * Hook to fetch project impacts using the dedicated API endpoint.
 *
 * @param projectIdOrSlug - The project UID or slug
 * @param options - Optional fetch options (e.g. `isAuthorized`)
 * @returns Object containing impacts array, loading state, error, and refetch function
 */
export function useProjectImpacts(projectIdOrSlug: string, options: UseProjectImpactsOptions = {}) {
  const { isAuthorized = true } = options;
  const queryKey = QUERY_KEYS.PROJECT.IMPACTS(projectIdOrSlug);

  const {
    data,
    isLoading,
    error,
    refetch: originalRefetch,
  } = useQuery<ProjectImpact[]>({
    queryKey,
    queryFn: () => getProjectImpacts(projectIdOrSlug, { isAuthorized }),
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
