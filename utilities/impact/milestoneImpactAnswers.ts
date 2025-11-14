import toast from "react-hot-toast"
import type { ImpactIndicatorWithData } from "@/types/impactMeasurement"
import fetchData from "../fetchData"
import { INDEXER } from "../indexer"
import { MESSAGES } from "../messages"

interface DataPoint {
  value: number | string
  proof: string
  startDate: string
  endDate: string
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
    value: number | string
    proof: string
    startDate: string
    endDate: string
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
    )

    if (error) {
      if (onError) {
        onError(error)
      } else {
        toast.error(MESSAGES.MILESTONES.OUTPUTS.ERROR)
      }
      return false
    } else {
      if (onSuccess) {
        onSuccess()
      } else {
        toast.success(MESSAGES.MILESTONES.OUTPUTS.SUCCESS)
      }
      return true
    }
  } catch (error) {
    if (onError) {
      onError(error instanceof Error ? error.message : String(error))
    } else {
      toast.error(MESSAGES.MILESTONES.OUTPUTS.ERROR)
    }
    return false
  }
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
      INDEXER.MILESTONE.IMPACT_INDICATORS.GET(milestoneUID),
      "GET"
    )

    if (error) {
      console.error("Error fetching milestone impact data:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error fetching milestone impact data:", error)
    return []
  }
}
