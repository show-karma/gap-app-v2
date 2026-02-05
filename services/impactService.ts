import type { ImpactIndicatorWithData } from "@/types/impactMeasurement";
import type { ProjectIndicatorsResponse } from "@/types/indicator";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Transform API response to match existing ImpactIndicatorWithData interface
 */
function transformProjectIndicators(
  response: ProjectIndicatorsResponse
): ImpactIndicatorWithData[] {
  return response.indicators.map((indicator) => ({
    id: indicator.id,
    name: indicator.name,
    description: indicator.description,
    unitOfMeasure: indicator.unitOfMeasure,
    programs: [], // Project indicators endpoint doesn't include programs
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
    isAssociatedWithPrograms: false, // This can be determined elsewhere if needed
    aggregatedData: indicator.aggregatedData,
  }));
}

/**
 * Fetches impact indicator data for a project
 *
 * @param projectIdentifier - The project slug or UID
 * @returns Promise with the impact indicators data
 */
export const getImpactAnswers = async (
  projectIdentifier: string
): Promise<ImpactIndicatorWithData[]> => {
  // Use the original endpoint which has the full data
  const [data, error] = await fetchData(INDEXER.PROJECT.IMPACT_INDICATORS.GET(projectIdentifier));

  if (error) {
    throw new Error(error);
  }

  // The old endpoint returns data in the ImpactIndicatorWithData format directly
  return data as ImpactIndicatorWithData[];
};

/**
 * Sends impact indicator data for a project
 *
 * @param projectIdentifier - The project slug or UID
 * @param indicatorId - The ID of the impact indicator
 * @param datapoints - Array of datapoints to send
 * @returns Promise<boolean> - Returns true if successful, false otherwise
 */
export const sendImpactAnswers = async (
  projectIdentifier: string,
  indicatorId: string,
  datapoints: {
    value: number | string;
    proof: string;
    startDate: string;
    endDate: string;
  }[]
): Promise<boolean> => {
  try {
    // Write operations use the original endpoint (dual-write to MongoDB and PostgreSQL)
    const [, error] = await fetchData(
      INDEXER.PROJECT.IMPACT_INDICATORS.SEND(projectIdentifier),
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
      throw new Error(error);
    }

    return true;
  } catch (error) {
    console.error("Error sending impact answers:", error);
    throw error;
  }
};
