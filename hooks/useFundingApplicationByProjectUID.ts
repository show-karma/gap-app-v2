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
  });

  return {
    application: applicationQuery.data,
    isLoading: applicationQuery.isLoading,
    error: applicationQuery.error,
    refetch: applicationQuery.refetch,
  };
};
