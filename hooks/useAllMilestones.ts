import { useQuery } from "@tanstack/react-query";
import {
  getAllMilestones,
  UnifiedMilestone,
} from "@/utilities/gapIndexerApi/getAllMilestones";

export function useAllMilestones(projectId: string) {
  const {
    data: milestones,
    isLoading,
    error,
    refetch,
  } = useQuery<UnifiedMilestone[]>({
    queryKey: ["all-milestones", projectId],
    queryFn: () => getAllMilestones(projectId),
    enabled: !!projectId,
  });

  return {
    milestones,
    isLoading,
    error,
    refetch,
  };
}
