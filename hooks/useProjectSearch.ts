import { useQuery } from "@tanstack/react-query";
import { SEARCH_CONSTANTS } from "@/constants/search";
import { type SearchProjectResult, unifiedSearch } from "@/services/unified-search.service";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseProjectSearchOptions {
  enabled?: boolean;
}

/**
 * Hook to search for projects using the unified search API.
 * Uses React Query for caching and state management.
 *
 * @param query - Search query (minimum 3 characters)
 * @param options - Configuration options for the hook behavior
 * @returns Object containing search results, loading state, error, and refetch
 *
 * @example
 * ```tsx
 * const { projects, isLoading } = useProjectSearch('my project', { enabled: true });
 *
 * if (isLoading) return <Spinner />;
 * if (projects.length > 0) {
 *   return projects.map(p => <ProjectItem key={p.uid} project={p} />);
 * }
 * ```
 */
export const useProjectSearch = (query: string, options?: UseProjectSearchOptions) => {
  const searchQuery = useQuery<SearchProjectResult[], Error>({
    ...defaultQueryOptions,
    queryKey: QUERY_KEYS.SEARCH.PROJECTS(query),
    queryFn: async () => {
      const result = await unifiedSearch(query, SEARCH_CONSTANTS.RESULT_LIMIT);
      return result.projects;
    },
    enabled: query.length >= SEARCH_CONSTANTS.MIN_QUERY_LENGTH && options?.enabled !== false,
    staleTime: SEARCH_CONSTANTS.STALE_TIME_MS,
    gcTime: SEARCH_CONSTANTS.GC_TIME_MS,
  });

  return {
    projects: searchQuery.data ?? [],
    isLoading: searchQuery.isLoading,
    isFetching: searchQuery.isFetching,
    isError: searchQuery.isError,
    error: searchQuery.error,
    refetch: searchQuery.refetch,
  };
};
