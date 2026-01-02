import type { IFundingApplication } from "@/types/funding-platform";

/**
 * Evaluation source type for different AI evaluation types
 */
export type EvaluationSource = "aiEvaluation" | "internalAIEvaluation";

/**
 * Supported score field names in evaluation objects
 * Different AI prompts may use different field names for the score
 */
const SCORE_FIELDS = ["final_score", "total_score"] as const;

/**
 * Extracts score from evaluation object, checking multiple possible field names
 * @returns The score value and field name, or null if no valid score found
 */
function extractScore(evaluation: unknown): { score: number; field: string } | null {
  if (evaluation === null || typeof evaluation !== "object") {
    return null;
  }

  const evalObj = evaluation as Record<string, unknown>;

  for (const field of SCORE_FIELDS) {
    if (field in evalObj && typeof evalObj[field] === "number" && !Number.isNaN(evalObj[field])) {
      return { score: evalObj[field] as number, field };
    }
  }

  return null;
}

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
    const result = extractScore(evaluation);

    if (!result) {
      console.warn(
        `${source} evaluation missing valid score field (checked: ${SCORE_FIELDS.join(", ")}):`,
        evaluation
      );
      return null;
    }

    const { score } = result;
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
