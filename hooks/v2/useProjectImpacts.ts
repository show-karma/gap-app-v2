import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { getProjectImpacts, type ProjectImpact } from "@/services/project-impacts.service";
import { queryClient } from "@/utilities/query-client";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Shared frozen empty array so the no-data branch returns a STABLE reference
 * across renders (see DEV-396). A fresh `[]` each render would make every
 * consumer's deps (e.g. `useProjectProfile`'s aggregation memo) re-run on
 * every render.
 */
const EMPTY_IMPACTS: ProjectImpact[] = [];

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
  // Memoize so the key identity is stable across renders (the refetch callback
  // depends on it).
  const queryKey = useMemo(() => QUERY_KEYS.PROJECT.IMPACTS(projectIdOrSlug), [projectIdOrSlug]);

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

  const impacts = data ?? EMPTY_IMPACTS;

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
    return originalRefetch();
  }, [queryKey, originalRefetch]);

  return {
    impacts,
    isLoading,
    error,
    refetch,
  };
}
