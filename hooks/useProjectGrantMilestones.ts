import { useQuery } from "@tanstack/react-query";
import { fetchProjectGrantMilestones } from "@/services/milestones";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Hook for fetching project grant milestones
 */
export const useProjectGrantMilestones = (projectId: string, programId: string) => {
  const milestonesQuery = useQuery({
    queryKey: QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(projectId, programId),
    queryFn: () => fetchProjectGrantMilestones(projectId, programId),
    enabled: !!projectId && !!programId,
  });

  return {
    data: milestonesQuery.data || null,
    isLoading: milestonesQuery.isLoading,
    error: milestonesQuery.error,
    refetch: milestonesQuery.refetch,
  };
};
