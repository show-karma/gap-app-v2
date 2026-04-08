import { useQuery } from "@tanstack/react-query";
import { fetchMilestoneEvaluation } from "@/services/milestones";
import { QUERY_KEYS } from "@/utilities/queryKeys";

export const useMilestoneEvaluation = (milestoneUID: string, enabled: boolean) => {
  return useQuery({
    queryKey: QUERY_KEYS.MILESTONES.EVALUATION(milestoneUID),
    queryFn: () => fetchMilestoneEvaluation(milestoneUID),
    enabled,
  });
};
