import type { IFundingApplication } from "@/types/funding-platform";

/**
 * Type guard for AI evaluation object
 */
export const isValidEvaluation = (evaluation: unknown): evaluation is { final_score: number } => {
  return (
    evaluation !== null &&
    typeof evaluation === "object" &&
    "final_score" in evaluation &&
    typeof (evaluation as Record<string, unknown>).final_score === "number" &&
    !Number.isNaN((evaluation as Record<string, unknown>).final_score)
  );
};

/**
 * Evaluation source type for different AI evaluation types
 */
export type EvaluationSource = "aiEvaluation" | "internalAIEvaluation";

/**
 * Gets evaluation data from application based on source
 * @param application - The funding application
 * @param source - The evaluation source to extract from
 * @returns The evaluation string or undefined
 */
function getEvaluationData(
  application: IFundingApplication,
  source: EvaluationSource
): string | undefined {
  return source === "aiEvaluation"
    ? application?.aiEvaluation?.evaluation
    : application?.internalAIEvaluation?.evaluation;
}

/**
 * Extracts AI evaluation score from a funding application
 * @param application - The funding application to extract score from
 * @param source - The evaluation source to extract from ("aiEvaluation" or "internalAIEvaluation")
 * @returns number | null - The AI score (0-100) or null if not available
 * @throws Never throws - handles all errors gracefully
 */
export const getAIScoreBase = (
  application: IFundingApplication,
  source: EvaluationSource
): number | null => {
  const evaluationData = getEvaluationData(application, source);

  if (!evaluationData || typeof evaluationData !== "string") {
    return null;
  }

  try {
    const evaluation = JSON.parse(evaluationData);

    if (!isValidEvaluation(evaluation)) {
      console.warn(`${source} evaluation missing or invalid final_score field:`, evaluation);
      return null;
    }

    const score = evaluation.final_score;
    if (score < 0 || score > 100) {
      console.warn(`${source} score outside expected range (0-100):`, score);
      return null;
    }

    return score;
  } catch (error) {
    console.warn(`Failed to parse ${source} for application:`, {
      referenceNumber: application.referenceNumber,
      error: error instanceof Error ? error.message : String(error),
      evaluationData: evaluationData.substring(0, 100),
    });
    return null;
  }
};

/**
 * Gets the AI evaluation response text from funding application
 * @param application - The funding application to extract response from
 * @param source - The evaluation source to extract from ("aiEvaluation" or "internalAIEvaluation")
 * @returns string | null - The AI evaluation response or null if not available
 */
export const getAIResponseBase = (
  application: IFundingApplication,
  source: EvaluationSource
): string | null => {
  const evaluationData = getEvaluationData(application, source);
  return typeof evaluationData === "string" ? evaluationData : null;
};

/**
 * Formats AI score for display in the table
 * @param score - The score to format (number | null)
 * @returns string - Formatted score string, "0" for zero, or empty string for missing scores
 */
export const formatAIScoreBase = (score: number | null): string => {
  if (score === null) {
    return "";
  }

  if (score === 0) {
    return "0";
  }

  // Format to whole number if integer, otherwise 1 decimal place
  return score % 1 === 0 ? score.toString() : score.toFixed(1);
};
