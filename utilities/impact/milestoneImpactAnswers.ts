import toast from "react-hot-toast";
import { z } from "zod";
import type { ImpactIndicatorWithData } from "@/types/impactMeasurement";
import { api } from "../api/client";
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
    await api.post(INDEXER.MILESTONE.IMPACT_INDICATORS.SEND(milestoneUID), {
      indicatorId,
      data: datapoints.map((item) => ({
        value: String(item.value),
        proof: item.proof,
        startDate: item.startDate,
        endDate: item.endDate,
      })),
    });

    if (onSuccess) {
      onSuccess();
    } else {
      toast.success(MESSAGES.MILESTONES.OUTPUTS.SUCCESS);
    }
    return true;
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
  try {
    await api.post(INDEXER.MILESTONE.IMPACT_INDICATORS.SEND(milestoneUID), {
      indicatorId,
      data: [],
    });
  } catch (error) {
    throw new Error(
      `Failed to delete milestone impact answers for milestoneUID=${milestoneUID} indicatorId=${indicatorId}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Transform V2 milestone indicators response to ImpactIndicatorWithData[]
 */
// Matches ProjectIndicatorResponse (types/indicator.ts) / the milestone
// indicators envelope, which this service already consumes as if these
// fields were always present (no defensive checks below).
const DatapointSchema = z
  .object({
    id: z.string(),
    value: z.string(),
    breakdown: z.string().nullable(),
    startDate: z.string(),
    endDate: z.string(),
    period: z.string().nullable(),
    proof: z.string().nullable(),
    source: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

const AggregatedDatapointResponseSchema = z
  .object({
    indicatorId: z.string(),
    indicatorName: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    totalValue: z.number(),
    projectCount: z.number(),
  })
  .passthrough();

const ProjectIndicatorResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    unitOfMeasure: z.string(),
    hasData: z.boolean(),
    lastUpdatedAt: z.string().nullable(),
    datapoints: z.array(DatapointSchema),
    aggregatedData: z.record(z.string(), z.array(AggregatedDatapointResponseSchema)).optional(),
  })
  .passthrough();

const MilestoneIndicatorsResponseSchema = z
  .object({
    milestoneUID: z.string(),
    indicators: z.array(ProjectIndicatorResponseSchema),
  })
  .passthrough();
type MilestoneIndicatorsResponse = z.infer<typeof MilestoneIndicatorsResponseSchema>;

function transformMilestoneIndicators(
  response: MilestoneIndicatorsResponse
): ImpactIndicatorWithData[] {
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
    const response = await api.get<MilestoneIndicatorsResponse>(
      INDEXER.INDICATORS.V2.MILESTONE_INDICATORS(milestoneUID),
      { schema: MilestoneIndicatorsResponseSchema }
    );
    return transformMilestoneIndicators(response);
  } catch (error) {
    console.error("Error fetching milestone impact data:", error);
    return [];
  }
};
