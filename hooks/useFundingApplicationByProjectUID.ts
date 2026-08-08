import { useQuery } from "@tanstack/react-query";
import { fetchApplicationByProjectUID } from "@/services/funding-applications";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Hook for fetching a funding application by project UID.
 *
 * @param projectUID Project UID the application is linked to.
 * @param programId RAW (composite) program id, e.g. `"1013_42161"`. Scopes the
 * lookup to one program so a project with grants in several programs resolves
 * its own application per grant. It is part of the query key — without it the
 * two grants would share a cache entry and cross-serve comment threads.
 */
export const useFundingApplicationByProjectUID = (projectUID: string, programId?: string) => {
  const applicationQuery = useQuery({
    queryKey: QUERY_KEYS.APPLICATIONS.BY_PROJECT_UID(projectUID, programId),
    queryFn: () => fetchApplicationByProjectUID(projectUID, programId),
    enabled: !!projectUID,
    // This feeds a supplementary panel, not the page's primary content. The
    // default three retries with backoff stack on top of the request timeout,
    // so an upstream outage would hold the caller's loading state open for
    // minutes and render as a skeleton that never resolves. Fail fast and let
    // the caller show its error state.
    retry: 1,
    staleTime: 1000 * 60 * 2,
  });

  return {
    application: applicationQuery.data,
    isLoading: applicationQuery.isLoading,
    error: applicationQuery.error,
    refetch: applicationQuery.refetch,
  };
};
