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

  // Helper function to get milestones sorted by end date (ascending)
  const getMilestonesSortedByEndDate = () => {
    if (!milestones) return [];

    return [...milestones].sort((a, b) => {
      // Sort logic for milestones with and without end dates
      // 1. If both have end dates, compare them
      if (a.endsAt && b.endsAt) {
        return a.endsAt - b.endsAt;
      }

      // 2. If only one has an end date, prioritize it (those with end dates come first)
      if (a.endsAt && !b.endsAt) return -1;
      if (!a.endsAt && b.endsAt) return 1;

      // 3. If neither has an end date, fall back to creation date
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  };

  return {
    milestones,
    isLoading,
    error,
    refetch,
    getMilestonesSortedByEndDate,
  };
}
