import type { IFundingApplication } from "@/types/funding-platform"

/**
 * Extracts AI evaluation score from funding application
 * @param application - The funding application to extract score from
 * @returns number | null - The AI score (0-100) or null if not available
 * @throws Never throws - handles all errors gracefully
 */
/**
 * Type guard for AI evaluation object
 */
const isValidEvaluation = (evaluation: unknown): evaluation is { final_score: number } => {
  return (
    evaluation !== null &&
    typeof evaluation === "object" &&
    "final_score" in evaluation &&
    typeof (evaluation as any).final_score === "number" &&
    !isNaN((evaluation as any).final_score)
  )
}

export const getAIScore = (application: IFundingApplication): number | null => {
  try {
    // Type guard: Check if application exists and has required structure
    if (!application?.aiEvaluation?.evaluation) {
      return null
    }

    // Type guard: Check if evaluation is a string
    if (typeof application.aiEvaluation.evaluation !== "string") {
      console.warn("AI evaluation is not a string:", typeof application.aiEvaluation.evaluation)
      return null
    }

    // Parse the evaluation JSON string with error handling
    const evaluation = JSON.parse(application.aiEvaluation.evaluation)

    // Type guard: Validate the parsed evaluation structure
    if (!isValidEvaluation(evaluation)) {
      console.warn("AI evaluation missing or invalid final_score field:", evaluation)
      return null
    }

    // Additional validation: Ensure score is within expected range (0-100)
    const score = evaluation.final_score
    if (score < 0 || score > 100) {
      console.warn("AI score outside expected range (0-100):", score)
    }

    return score
  } catch (error) {
    // Enhanced error logging for debugging
    console.warn("Failed to parse AI evaluation for application:", {
      referenceNumber: application.referenceNumber,
      error: error instanceof Error ? error.message : String(error),
      evaluationData: application.aiEvaluation?.evaluation?.substring(0, 100) + "...",
    })
    return null
  }
}

/**
 * Formats AI score for display in the table
 * @param application - The funding application to format score for
 * @returns string - Formatted score string, "0" for zero, or empty string for missing scores
 */
export const formatAIScore = (application: IFundingApplication): string => {
  const score = getAIScore(application)

  // Return empty string for null/undefined (completely blank cell)
  if (score === null || score === undefined) {
    return ""
  }

  // Show "0" for actual zero scores
  if (score === 0) {
    return "0"
  }

  // Format to 1 decimal place if it's a whole number, 2 decimal places otherwise
  return score % 1 === 0 ? score.toString() : score.toFixed(1)
}
