import type { IFundingApplication } from "@/types/funding-platform";
import { formatEvaluationResponse } from "./formatEvaluationResponse";
import { formatAIScoreBase, getAIResponseBase, getAIScoreBase } from "./getAIScoreBase";

/**
 * Extracts AI evaluation score from funding application
 * @param application - The funding application to extract score from
 * @returns number | null - The AI score (0-100) or null if not available
 * @throws Never throws - handles all errors gracefully
 */
export const getAIScore = (application: IFundingApplication): number | null => {
  return getAIScoreBase(application, "aiEvaluation");
};

/**
 * Formats AI score for display in the table
 * @param application - The funding application to format score for
 * @returns string - Formatted score string, "0" for zero, or empty string for missing scores
 */
export const formatAIScore = (application: IFundingApplication): string => {
  const score = getAIScore(application);
  return formatAIScoreBase(score);
};

/**
 * Gets the AI evaluation response text from funding application
 * @param application - The funding application to extract response from
 * @returns string | null - The AI evaluation response or null if not available
 * @throws Never throws - handles all errors gracefully
 */
export const getAIResponse = (application: IFundingApplication): string | null => {
  return getAIResponseBase(application, "aiEvaluation");
};

/**
 * Gets the formatted AI evaluation response for CSV export
 * Formats the JSON evaluation into a human-readable YAML-like format
 * @param application - The funding application to extract response from
 * @returns string - Formatted evaluation response or empty string if not available
 */
export const getFormattedAIResponse = (application: IFundingApplication): string => {
  return formatEvaluationResponse(getAIResponse(application));
};
