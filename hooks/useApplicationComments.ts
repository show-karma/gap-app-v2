import { useQuery } from "@tanstack/react-query";
import { fetchApplicationComments, type ApplicationComment } from "@/services/comments";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Hook for fetching application comments
 */
export const useApplicationComments = (referenceNumber: string) => {
  const commentsQuery = useQuery({
    queryKey: QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber),
    queryFn: () => fetchApplicationComments(referenceNumber),
    enabled: !!referenceNumber,
  });

  return {
    comments: commentsQuery.data || [],
    isLoading: commentsQuery.isLoading,
    error: commentsQuery.error,
    refetch: commentsQuery.refetch,
  };
};
