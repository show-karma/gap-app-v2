import { useQuery } from "@tanstack/react-query";
import { type SearchProjectResult, unifiedSearch } from "@/services/unified-search.service";
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
    queryKey: QUERY_KEYS.SEARCH.PROJECTS(query),
    queryFn: async () => {
      const result = await unifiedSearch(query, 10);
      return result.projects;
    },
    enabled: query.length >= 3 && options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds - search results can change frequently
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
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
