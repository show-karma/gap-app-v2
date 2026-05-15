import { useQuery } from "@tanstack/react-query";
import { getProjectGrants } from "@/services/project-grants.service";
import type { Grant } from "@/types/v2/grant";
import { queryClient } from "@/utilities/query-client";
import { createProjectQueryPredicate, QUERY_KEYS } from "@/utilities/queryKeys";

export interface UseProjectGrantsOptions {
  /**
   * Whether the request should attach a Privy bearer token.
   * Defaults to `true` for backward compatibility. Public pages (e.g. the
   * anonymous /project/:projectId profile) MUST pass `false` so client
   * refetches don't send a stale/empty token and trip the indexer's
   * `Authorization header is required` 401 path.
   */
  isAuthorized?: boolean;
}

/**
 * Hook to fetch project grants using the dedicated API endpoint.
 *
 * @param projectIdOrSlug - The project UID or slug
 * @param options - Optional fetch options (e.g. `isAuthorized`)
 * @returns Object containing grants array, loading state, error, and refetch function
 */
export function useProjectGrants(projectIdOrSlug: string, options: UseProjectGrantsOptions = {}) {
  const { isAuthorized = true } = options;
  const queryKey = QUERY_KEYS.PROJECT.GRANTS(projectIdOrSlug);

  const {
    data,
    isLoading,
    error,
    refetch: originalRefetch,
  } = useQuery<Grant[]>({
    queryKey,
    queryFn: () => getProjectGrants(projectIdOrSlug, { isAuthorized }),
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
