import type { ImpactIndicator } from "@/types/impactMeasurement";
import type { Indicator } from "./queries/getIndicatorsByCommunity";

/**
 * Get the effective ID for an indicator (uuid preferred, fallback to id)
 * This ensures we use PostgreSQL UUIDs for impact segments when available
 */
export const getIndicatorEffectiveId = (indicator: ImpactIndicator | Indicator): string => {
  return indicator.uuid || indicator.id;
};
