import { useQuery } from "@tanstack/react-query";
import type { ImpactIndicatorWithData } from "@/types/impactMeasurement";
import { getMilestoneImpactAnswers } from "@/utilities/impact";

export const MILESTONE_IMPACT_QUERY_KEY = "milestoneImpactAnswers";

interface UseMilestoneImpactAnswersProps {
  milestoneUID?: string;
}

/**
 * Hook to fetch impact indicator data for a specific milestone
 */
export const useMilestoneImpactAnswers = ({ milestoneUID }: UseMilestoneImpactAnswersProps) => {
  return useQuery<ImpactIndicatorWithData[]>({
    queryKey: [MILESTONE_IMPACT_QUERY_KEY, milestoneUID],
    queryFn: () => {
      if (!milestoneUID) {
        throw new Error("Milestone UID is required");
      }
      return getMilestoneImpactAnswers(milestoneUID);
    },
    enabled: !!milestoneUID,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
};
