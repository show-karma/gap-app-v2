/**
 * @file Utility functions for community metrics
 * @description
 * Shared utilities for formatting and validating community metrics data.
 *
 * IMPORTANT: These utilities are SPECIFICALLY for community metrics charts only.
 * They are NOT to be used for program impact measurements or other chart types.
 *
 * For other chart types, use:
 * - ImpactCharts.tsx: prepareChartData() for program impact measurements
 * - AggregateCategoryRow.tsx: prepareChartData() for aggregated indicators
 */

import type { CommunityMetric, CommunityMetricsResponse } from "@/types/community-metrics";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";

/**
 * Formats very small numbers (< 0.0001) with appropriate precision
 * Uses scientific notation for extremely small numbers (< 0.000001)
 * Uses fixed decimal places for slightly larger small numbers
 */
const formatSmallNumber = (value: number, unit: string): string => {
  if (value < 0.000001) {
    return `${value.toExponential(2)} ${unit}`;
  }
  return `${value.toFixed(8).replace(/\.?0+$/, "")} ${unit}`;
};

/**
 * Formats a community metric value with its unit
 * @internal - Only for use within CommunityMetricsSection component
 */
export const formatMetricValue = (value: string, unit: string): string => {
  const numValue = parseFloat(value);
  if (Number.isNaN(numValue)) return value;

  // Handle very small numbers (less than 0.0001) with more precision
  if (numValue > 0 && numValue < 0.0001) {
    return formatSmallNumber(numValue, unit);
  }

  // Use standard formatting for normal-sized numbers
  return `${formatCurrency(numValue)} ${unit}`;
};

/**
 * Calculates moving average for community metrics values
 * Used specifically for 30-day smoothing of community metrics charts
 * @param values Array of numeric values
 * @param windowSize Number of periods for moving average (default: 30)
 * @returns Array of moving average values (same length as input, with leading NaNs)
 * @internal - Only for use within CommunityMetricsSection component
 */
export function calculateCommunityMetricsMovingAverage(
  values: number[],
  windowSize: number = 30
): number[] {
  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i < windowSize - 1) {
      // Not enough data points yet
      result.push(NaN);
    } else {
      // Calculate average of previous windowSize values
      const window = values.slice(i - windowSize + 1, i + 1);
      const sum = window.reduce((acc, val) => acc + val, 0);
      result.push(sum / windowSize);
    }
  }

  return result;
}

/**
 * Prepares chart data for a community metric
 * Returns both raw values and 30-day moving average for superimposition
 *
 * IMPORTANT: This function is ONLY for community metrics charts.
 * Do not use for program impact measurements or other chart types.
 *
 * @param metric - The community metric to prepare chart data for
 * @param options - Chart configuration options
 * @returns Array of chart data points with both raw and smoothed values
 * @internal - Only for use within CommunityMetricsSection component
 */
export const prepareCommunityMetricsChartData = (
  metric: CommunityMetric,
  options?: {
    yTransform?: (value: number) => number;
    applyMovingAverage?: boolean; // Apply 30-day moving average (default: true)
    movingAverageWindow?: number; // Window size for moving average (default: 30)
  }
) => {
  if (!metric.datapoints || metric.datapoints.length === 0) {
    return [];
  }

  // Filter and sort datapoints
  const validDatapoints = metric.datapoints
    .filter((dp) => {
      const date = new Date(dp.date);
      return !Number.isNaN(date.getTime());
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Extract raw values and apply y-transform if needed
  const rawValues = validDatapoints.map((dp) => {
    const rawValue = parseFloat(dp.value) || 0;
    return options?.yTransform ? options.yTransform(rawValue) : rawValue;
  });

  // Apply 30-day moving average if enabled (default: true)
  const shouldApplyMovingAverage = options?.applyMovingAverage !== false;
  const windowSize = options?.movingAverageWindow || 30;
  const smoothedValues = shouldApplyMovingAverage
    ? calculateCommunityMetricsMovingAverage(rawValues, windowSize)
    : null;

  // Build chart data with both raw and smoothed values
  return validDatapoints.map((dp, index) => {
    const rawValue = rawValues[index];
    const smoothedValue = smoothedValues ? smoothedValues[index] : null;

    return {
      date: formatDate(new Date(dp.date), "UTC"),
      [metric.name]: rawValue, // Raw values
      [`${metric.name} (30-day avg)`]:
        smoothedValue !== null && !Number.isNaN(smoothedValue) ? smoothedValue : undefined, // Moving average (only include if valid)
    };
  });
};

export function isValidCommunityMetricsResponse(data: unknown): data is CommunityMetricsResponse {
  return (
    data !== null &&
    typeof data === "object" &&
    "communityUID" in data &&
    typeof (data as { communityUID: unknown }).communityUID === "string" &&
    "metrics" in data &&
    Array.isArray((data as { metrics: unknown }).metrics)
  );
}

export type TimeframeOption = "all" | "1_month" | "3_months" | "6_months" | "1_year";

export function calculateDateRange(
  timeframe: TimeframeOption
): { startDate: string; endDate: string } | undefined {
  // Return undefined for "all" to fetch all available data
  if (timeframe === "all") {
    return undefined;
  }

  const endDate = new Date();
  const startDate = new Date();

  switch (timeframe) {
    case "1_month":
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "3_months":
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case "6_months":
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case "1_year":
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}
