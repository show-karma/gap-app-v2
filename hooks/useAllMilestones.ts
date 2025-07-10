import { useQuery } from "@tanstack/react-query";
import { getAllMilestones } from "@/utilities/gapIndexerApi/getAllMilestones";
import { UnifiedMilestone } from "@/types/roadmap";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { getQueryClient } from "@/utilities/queries/client";
import { useProjectQuery } from "./useProjectQuery";

const sortDescendly = (milestones: UnifiedMilestone[]) => {
  const sortedMilestones = milestones.sort((a, b) => {
    if (a.endsAt && b.endsAt) {
      return a.endsAt - b.endsAt;
    }

    if (a.endsAt && !b.endsAt) return -1;
    if (!a.endsAt && b.endsAt) return 1;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  return sortedMilestones;
};

export function useAllMilestones(projectId: string) {
  const { data: project } = useProjectQuery();
  const projectGrants = project?.grants || [];
  const queryKey = ["all-milestones", projectId];
  const queryClient = getQueryClient();

  const {
    data: milestones,
    isLoading,
    error,
    refetch: originalRefetch,
  } = useQuery<UnifiedMilestone[]>({
    queryKey,
    queryFn: () => getAllMilestones(projectId, projectGrants),
    enabled: !!projectId && !!project,
    staleTime: 5 * 60 * 1000,
  });

  const pendingMilestones = sortDescendly(
    milestones?.filter((milestone) => !milestone.completed) || []
  );

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey });
    return originalRefetch();
  };

  return {
    milestones,
    isLoading,
    error,
    refetch,
    pendingMilestones,
  };
}
