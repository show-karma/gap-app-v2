import { useQuery } from "@tanstack/react-query"
import { fetchApplicationByProjectUID } from "@/services/funding-applications"
import { QUERY_KEYS } from "@/utilities/queryKeys"

/**
 * Hook for fetching a funding application by project UID
 */
export const useFundingApplicationByProjectUID = (projectUID: string) => {
  const applicationQuery = useQuery({
    queryKey: QUERY_KEYS.APPLICATIONS.BY_PROJECT_UID(projectUID),
    queryFn: () => fetchApplicationByProjectUID(projectUID),
    enabled: !!projectUID,
  })

  return {
    application: applicationQuery.data,
    isLoading: applicationQuery.isLoading,
    error: applicationQuery.error,
    refetch: applicationQuery.refetch,
  }
}
