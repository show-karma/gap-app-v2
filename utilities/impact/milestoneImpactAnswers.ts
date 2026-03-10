import toast from "react-hot-toast";
import type { ImpactIndicatorWithData } from "@/types/impactMeasurement";
import type { ProjectIndicatorResponse } from "@/types/indicator";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";
import { MESSAGES } from "../messages";

interface DataPoint {
  value: number | string;
  proof: string;
  startDate: string;
  endDate: string;
}

/**
 * Sends impact indicator data for a milestone
 *
 * @param milestoneUID - The milestone UID
 * @param indicatorId - The ID of the impact indicator
 * @param datapoints - Array of datapoints to send
 * @param onSuccess - Optional callback function to execute on success
 * @param onError - Optional callback function to execute on error
 * @returns Promise<boolean> - Returns true if successful, false otherwise
 */
export const sendMilestoneImpactAnswers = async (
  milestoneUID: string,
  indicatorId: string,
  datapoints: {
    value: number | string;
    proof: string;
    startDate: string;
    endDate: string;
  }[],
  onSuccess?: () => void,
  onError?: (error: string) => void
): Promise<boolean> => {
  try {
    const [, error] = await fetchData(
      INDEXER.MILESTONE.IMPACT_INDICATORS.SEND(milestoneUID),
      "POST",
      {
        indicatorId,
        data: datapoints.map((item) => ({
          value: String(item.value),
          proof: item.proof,
          startDate: item.startDate,
          endDate: item.endDate,
        })),
      }
    );

    if (error) {
      if (onError) {
        onError(error);
      } else {
        toast.error(MESSAGES.MILESTONES.OUTPUTS.ERROR);
      }
      return false;
    } else {
      if (onSuccess) {
        onSuccess();
      } else {
        toast.success(MESSAGES.MILESTONES.OUTPUTS.SUCCESS);
      }
      return true;
    }
  } catch (error) {
    if (onError) {
      onError(error instanceof Error ? error.message : String(error));
    } else {
      toast.error(MESSAGES.MILESTONES.OUTPUTS.ERROR);
    }
    return false;
  }
};

/**
 * Deletes all datapoints for a specific indicator on a milestone.
 * Sends an empty data array which triggers the backend to delete existing datapoints
 * without creating new ones.
 */
export const deleteMilestoneImpactAnswers = async (
  milestoneUID: string,
  indicatorId: string
): Promise<void> => {
  const [, error] = await fetchData(
    INDEXER.MILESTONE.IMPACT_INDICATORS.SEND(milestoneUID),
    "POST",
    {
      indicatorId,
      data: [],
    }
  );

  if (error) {
    throw new Error(
      `Failed to delete milestone impact answers for milestoneUID=${milestoneUID} indicatorId=${indicatorId}: ${error}`
    );
  }
};

/**
 * Transform V2 milestone indicators response to ImpactIndicatorWithData[]
 */
function transformMilestoneIndicators(response: {
  milestoneUID: string;
  indicators: ProjectIndicatorResponse[];
}): ImpactIndicatorWithData[] {
  return response.indicators.map((indicator) => ({
    id: indicator.id,
    name: indicator.name,
    description: indicator.description,
    unitOfMeasure: indicator.unitOfMeasure,
    programs: [],
    datapoints: indicator.datapoints.map((dp) => ({
      value: dp.value,
      proof: dp.proof || "",
      startDate: dp.startDate,
      endDate: dp.endDate,
      outputTimestamp: dp.startDate,
      breakdown: dp.breakdown || undefined,
      period: dp.period || undefined,
    })),
    hasData: indicator.hasData,
    isAssociatedWithPrograms: false,
    aggregatedData: indicator.aggregatedData,
  }));
}

/**
 * Retrieves impact indicator data for a milestone
 *
 * @param milestoneUID - The milestone UID
 * @returns Promise<ImpactIndicatorWithData[]> - Returns the milestone's impact data
 */
export const getMilestoneImpactAnswers = async (
  milestoneUID: string
): Promise<ImpactIndicatorWithData[]> => {
  try {
    const [data, error] = await fetchData(
      INDEXER.INDICATORS.V2.MILESTONE_INDICATORS(milestoneUID),
      "GET"
    );

    if (error) {
      console.error("Error fetching milestone impact data:", error);
      return [];
    }

    return transformMilestoneIndicators(data);
  } catch (error) {
    console.error("Error fetching milestone impact data:", error);
    return [];
  }
};
