import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { MESSAGES } from "@/config/messages";
import { getImpactAnswers, sendImpactAnswers } from "../api/impact-service";
import { ImpactIndicatorWithData } from "../types";

interface UseImpactAnswersProps {
  projectIdentifier?: string;
  enabled?: boolean;
}

/**
 * Hook for fetching and managing impact indicator data for a project
 */
export const useImpactAnswers = ({
  projectIdentifier,
  enabled = true,
}: UseImpactAnswersProps = {}) => {
  const queryClient = useQueryClient();

  const queryKey = ["impactAnswers", projectIdentifier];

  const {
    data = [] as ImpactIndicatorWithData[],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => getImpactAnswers(projectIdentifier as string),
    enabled: !!projectIdentifier && enabled,
  });

  const { mutate: submitImpactAnswer, isPending: isSubmitting } = useMutation({
    mutationFn: ({
      indicatorId,
      datapoints,
    }: {
      indicatorId: string;
      datapoints: {
        value: number | string;
        proof: string;
        startDate: string;
        endDate: string;
      }[];
    }) =>
      sendImpactAnswers(projectIdentifier as string, indicatorId, datapoints),
    onSuccess: () => {
      toast.success(MESSAGES.GRANT.OUTPUTS.SUCCESS);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast.error(MESSAGES.GRANT.OUTPUTS.ERROR);
      console.error("Error submitting impact answer:", error);
    },
  });

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
    submitImpactAnswer,
    isSubmitting,
  };
};
