import type { ImpactIndicatorWithData } from "@/types/impactMeasurement";

// Helper function to filter indicators
export const filterIndicators = (
  indicators: ImpactIndicatorWithData[],
  indicatorIds?: string[],
  indicatorNames?: string[]
) => {
  if (!indicatorIds?.length && !indicatorNames?.length) {
    return indicators; // Return all if no filters provided
  }

  return indicators.filter((indicator) => {
    if (indicatorIds?.length) {
      return indicatorIds.includes(indicator.id);
    }
    if (indicatorNames?.length) {
      return indicatorNames.includes(indicator.name);
    }
    return false;
  });
};
