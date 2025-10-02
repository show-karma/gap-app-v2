import { useQuery } from "@tanstack/react-query";
import { fetchApplicationComments, type ApplicationComment } from "@/services/comments";

const QUERY_KEYS = {
  applicationComments: (referenceNumber: string) => ["application-comments", referenceNumber],
};

/**
 * Hook for fetching application comments
 */
export const useApplicationComments = (referenceNumber: string) => {
  const commentsQuery = useQuery({
    queryKey: QUERY_KEYS.applicationComments(referenceNumber),
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
