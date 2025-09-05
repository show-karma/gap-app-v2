import { IFundingApplication } from "@/types/funding-platform";

/**
 * Extracts AI evaluation score from funding application
 * Looks for "final_score" field only
 * Returns null if no valid score is found
 */
export const getAIScore = (application: IFundingApplication): number | null => {
  try {
    // Check if aiEvaluation exists and has evaluation data
    if (!application.aiEvaluation?.evaluation) {
      return null;
    }

    // Parse the evaluation JSON string
    const evaluation = JSON.parse(application.aiEvaluation.evaluation);
    
    // Look for final_score only
    if (typeof evaluation.final_score === 'number') {
      return evaluation.final_score;
    }
    
    return null;
  } catch (error) {
    // If JSON parsing fails or any other error, return null
    console.warn('Failed to parse AI evaluation:', error);
    return null;
  }
};

/**
 * Formats AI score for display
 * Returns formatted string or empty string if no score
 * Shows "0" for score of 0, blank for missing scores
 */
export const formatAIScore = (application: IFundingApplication): string => {
  const score = getAIScore(application);
  
  // Return empty string for null/undefined (completely blank cell)
  if (score === null || score === undefined) {
    return '';
  }
  
  // Show "0" for actual zero scores
  if (score === 0) {
    return '0';
  }
  
  // Format to 1 decimal place if it's a whole number, 2 decimal places otherwise
  return score % 1 === 0 ? score.toString() : score.toFixed(1);
};
