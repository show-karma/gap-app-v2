/**
 * @file Utility functions for ecosystem metrics
 * @description Shared utilities for formatting and validating ecosystem metrics data
 */

import type { EcosystemMetric, EcosystemMetricsResponse } from "@/types/ecosystem-metrics";
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

export const formatChartValue = (value: number, unit: string): string => {
  // Handle very small numbers for chart tooltips
  if (value > 0 && value < 0.0001) {
    return formatSmallNumber(value, unit);
  }
  return `${formatCurrency(value)} ${unit}`;
};

export const prepareChartDataForMetric = (metric: EcosystemMetric) => {
  if (!metric.datapoints || metric.datapoints.length === 0) {
    return [];
  }

  // Filter out datapoints with invalid dates and sort by date ascending
  const validDatapoints = metric.datapoints.filter((dp) => {
    const date = new Date(dp.date);
    return !Number.isNaN(date.getTime());
  });

  const sortedDatapoints = [...validDatapoints].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Build chart data
  return sortedDatapoints.map((dp) => ({
    date: formatDate(new Date(dp.date), "UTC"),
    [metric.name]: parseFloat(dp.value) || 0,
  }));
};

export function isValidEcosystemMetricsResponse(data: unknown): data is EcosystemMetricsResponse {
  return (
    data !== null &&
    typeof data === "object" &&
    "communityUID" in data &&
    typeof (data as { communityUID: unknown }).communityUID === "string" &&
    "metrics" in data &&
    Array.isArray((data as { metrics: unknown }).metrics)
  );
}

export type TimeframeOption = "1_month" | "3_months" | "6_months" | "1_year";

export function calculateDateRange(
  timeframe: TimeframeOption
): { startDate: string; endDate: string } | undefined {
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
