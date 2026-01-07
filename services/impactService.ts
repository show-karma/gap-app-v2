import type { ImpactIndicatorWithData } from "@/types/impactMeasurement";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

// V2 API response types
interface V2Datapoint {
  id: string;
  value: string;
  breakdown: string | null;
  startDate: string;
  endDate: string;
  period: string | null;
  proof: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

interface V2ProjectIndicator {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  hasData: boolean;
  lastUpdatedAt: string | null;
  datapoints: V2Datapoint[];
}

interface V2ProjectIndicatorsResponse {
  projectUID: string;
  indicators: V2ProjectIndicator[];
}

/**
 * Transform V2 API response to match existing ImpactIndicatorWithData interface
 */
function transformV2ProjectIndicators(v2Response: V2ProjectIndicatorsResponse): ImpactIndicatorWithData[] {
  return v2Response.indicators.map((indicator) => ({
    id: indicator.id,
    name: indicator.name,
    description: indicator.description,
    unitOfMeasure: indicator.unitOfMeasure,
    programs: [], // V2 project indicators endpoint doesn't include programs
    datapoints: indicator.datapoints.map((dp) => ({
      value: dp.value,
      proof: dp.proof || "",
      startDate: dp.startDate,
      endDate: dp.endDate,
      outputTimestamp: dp.startDate,
    })),
    hasData: indicator.hasData,
    isAssociatedWithPrograms: false, // This can be determined elsewhere if needed
  }));
}

/**
 * Fetches impact indicator data for a project using V2 API
 *
 * @param projectIdentifier - The project slug or UID
 * @returns Promise with the impact indicators data
 */
export const getImpactAnswers = async (
  projectIdentifier: string
): Promise<ImpactIndicatorWithData[]> => {
  const [data, error] = await fetchData(
    INDEXER.INDICATORS.V2.PROJECT_INDICATORS(projectIdentifier)
  );

  if (error) {
    throw new Error(error);
  }

  // Transform V2 response to match existing interface
  return transformV2ProjectIndicators(data as V2ProjectIndicatorsResponse);
};

/**
 * Sends impact indicator data for a project
 * Note: Write operations still use the original endpoint as V2 is read-only for now
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
