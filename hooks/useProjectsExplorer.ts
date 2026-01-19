import { useQuery } from "@tanstack/react-query";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";
import { getExplorerProjects } from "@/services/projects-explorer.service";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseProjectsExplorerOptions {
  search?: string;
  enabled?: boolean;
}

/**
 * Hook to fetch projects for the explorer page.
 * Uses V2 API with automatic test project filtering.
 *
 * @param options - Configuration options
 * @returns Query result with projects data
 *
 * @example
 * ```tsx
 * const { projects, isLoading } = useProjectsExplorer({ search: 'dao' });
 * ```
 */
export const useProjectsExplorer = (options: UseProjectsExplorerOptions = {}) => {
  const { search = "", enabled = true } = options;

  const shouldSearch = search.length >= PROJECTS_EXPLORER_CONSTANTS.MIN_SEARCH_LENGTH;

  const query = useQuery({
    ...defaultQueryOptions,
    queryKey: QUERY_KEYS.PROJECT.EXPLORER(search),
    queryFn: () => getExplorerProjects({ search: shouldSearch ? search : "" }),
    enabled,
    staleTime: PROJECTS_EXPLORER_CONSTANTS.STALE_TIME_MS,
  });

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
