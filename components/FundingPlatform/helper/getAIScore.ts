import type { IFundingApplication } from "@/types/funding-platform";
import { formatAIScoreBase, getAIScoreBase } from "./getAIScoreBase";

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
