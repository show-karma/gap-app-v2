import toast from "react-hot-toast";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";
import { MESSAGES } from "../messages";

/**
 * Sends impact indicator data for a project
 *
 * @param projectIdentifier - The project slug or UID
 * @param indicatorId - The ID of the impact indicator
 * @param datapoints - Array of datapoints to send
 * @param onSuccess - Optional callback function to execute on success
 * @param onError - Optional callback function to execute on error
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
  }[],
  onSuccess?: () => void,
  onError?: (error: string) => void
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
      if (onError) {
        onError(error);
      } else {
        toast.error(MESSAGES.GRANT.OUTPUTS.ERROR);
      }
      return false;
    } else {
      if (onSuccess) {
        onSuccess();
      } else {
        toast.success(MESSAGES.GRANT.OUTPUTS.SUCCESS);
      }
      return true;
    }
  } catch (error) {
    if (onError) {
      onError(error instanceof Error ? error.message : String(error));
    } else {
      toast.error(MESSAGES.GRANT.OUTPUTS.ERROR);
    }
    return false;
  }
};
