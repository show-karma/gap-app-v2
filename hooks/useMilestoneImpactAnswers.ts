import { useQuery } from "@tanstack/react-query";
import type { ImpactIndicatorWithData } from "@/types/impactMeasurement";
import { getMilestoneImpactAnswers } from "@/utilities/impact";

interface UseMilestoneImpactAnswersProps {
  milestoneUID?: string;
}

/**
 * Hook to fetch impact indicator data for a specific milestone
 */
export const useMilestoneImpactAnswers = ({ milestoneUID }: UseMilestoneImpactAnswersProps) => {
  return useQuery<ImpactIndicatorWithData[]>({
    queryKey: ["milestoneImpactAnswers", milestoneUID],
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
