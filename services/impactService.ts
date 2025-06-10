import { ImpactIndicatorWithData } from "@/types/impactMeasurement";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Fetches impact indicator data for a project
 *
 * @param projectIdentifier - The project slug or UID
 * @returns Promise with the impact indicators data
 */
export const getImpactAnswers = async (
  projectIdentifier: string
): Promise<ImpactIndicatorWithData[]> => {
  const [data, error] = await fetchData(
    INDEXER.PROJECT.IMPACT_INDICATORS.GET(projectIdentifier)
  );

  if (error) {
    throw new Error(error);
  }

  return data;
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
