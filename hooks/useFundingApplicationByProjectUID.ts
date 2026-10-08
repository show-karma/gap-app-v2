import { useQuery } from "@tanstack/react-query";
import { fetchApplicationByProjectUID } from "@/services/funding-applications";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Hook for fetching a funding application by project UID. Pass the program
 * being viewed: a project in several programs has one application per
 * program and the API returns the newest one otherwise.
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
