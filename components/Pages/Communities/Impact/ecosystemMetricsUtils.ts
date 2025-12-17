/**
 * @file Utility functions for ecosystem metrics
 * @description Shared utilities for formatting and validating ecosystem metrics data
 */

import type { EcosystemMetric, EcosystemMetricsResponse } from "@/types/ecosystem-metrics";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";

export const formatMetricValue = (value: string, unit: string): string => {
  const numValue = parseFloat(value);
  if (Number.isNaN(numValue)) return value;

  // Handle very small numbers (less than 0.0001) with more precision
  if (numValue > 0 && numValue < 0.0001) {
    // Use scientific notation or more decimal places for very small numbers
    if (numValue < 0.000001) {
      return `${numValue.toExponential(2)} ${unit}`;
    }
    // For slightly larger small numbers, show more decimal places
    return `${numValue.toFixed(8).replace(/\.?0+$/, "")} ${unit}`;
  }

  // Use standard formatting for normal-sized numbers
  return `${formatCurrency(numValue)} ${unit}`;
};

export const formatChartValue = (value: number, unit: string): string => {
  // Handle very small numbers for chart tooltips
  if (value > 0 && value < 0.0001) {
    if (value < 0.000001) {
      return `${value.toExponential(2)} ${unit}`;
    }
    return `${value.toFixed(8).replace(/\.?0+$/, "")} ${unit}`;
  }
  return `${formatCurrency(value)} ${unit}`;
};

export const prepareChartDataForMetric = (metric: EcosystemMetric) => {
  if (!metric.datapoints || metric.datapoints.length === 0) {
    return [];
  }

  // Sort datapoints by date ascending
  const sortedDatapoints = [...metric.datapoints].sort(
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
