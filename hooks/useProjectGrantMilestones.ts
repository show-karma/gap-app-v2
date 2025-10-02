import { useQuery } from "@tanstack/react-query";
import { fetchProjectGrantMilestones, type ProjectGrantMilestonesResponse } from "@/services/milestones";

const QUERY_KEYS = {
  projectGrantMilestones: (projectId: string, programId: string) =>
    ["project-grant-milestones", projectId, programId],
};

/**
 * Hook for fetching project grant milestones
 */
export const useProjectGrantMilestones = (projectId: string, programId: string) => {
  const milestonesQuery = useQuery({
    queryKey: QUERY_KEYS.projectGrantMilestones(projectId, programId),
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
