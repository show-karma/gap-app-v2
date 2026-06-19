import type { MilestoneCompletedFormData } from "@/components/Forms/GrantMilestoneCompletion";
import { INDEXING_TIMEOUT_MESSAGE, IndexingTimeoutError } from "@/utilities/errors";
import { sendMilestoneImpactAnswers } from "@/utilities/impact/milestoneImpactAnswers";
import { isRetryConditionNotMetError } from "@/utilities/retries";

/**
 * Translate an indexing-poll rejection into a caller-meaningful error. Budget
 * exhaustion (`RetryConditionNotMetError`) becomes an actionable
 * `IndexingTimeoutError` so the user can tell "revoke rejected" apart from
 * "revoke accepted, indexer lagging". Cancellation and any other error pass
 * through untouched.
 */
export const mapPollExhaustion = (error: unknown): unknown =>
  isRetryConditionNotMetError(error) ? new IndexingTimeoutError(INDEXING_TIMEOUT_MESSAGE) : error;

// Helper function to send outputs and deliverables data
export const sendOutputsAndDeliverables = async (
  milestoneUID: string,
  data: MilestoneCompletedFormData
) => {
  try {
    // Send outputs (metrics) data if any
    if (data.outputs && data.outputs.length > 0) {
      for (const output of data.outputs) {
        if (output.outputId && output.value !== undefined && output.value !== "") {
          // Default to today's date if not specified (matching project behavior)
          const today = new Date().toISOString().split("T")[0];

          const datapoints = [
            {
              value: output.value,
              proof: output.proof || "",
              startDate: output.startDate || today,
              endDate: output.endDate || today,
            },
          ];

          await sendMilestoneImpactAnswers(
            milestoneUID,
            output.outputId,
            datapoints,
            () => {},
            (error) => {
              console.error(`Error sending output data for indicator ${output.outputId}:`, error);
            }
          );
        }
      }
    }

    // Send deliverables data if any
    if (data.deliverables && data.deliverables.length > 0) {
    }
  } catch (error) {
    console.error("Error sending outputs and deliverables:", error);
    // Don't throw - we don't want to fail the milestone completion if outputs fail
  }
};
