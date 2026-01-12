/**
 * Shared utilities for impact indicator components
 */

import type { PeriodDatapoint } from "@/types/indicator";

/**
 * Chain ID to name mapping
 */
export const chainNames: Record<string, string> = {
  "1": "Ethereum",
  "10": "Optimism",
  "137": "Polygon",
  "250": "Fantom",
  "8453": "Base",
  "42161": "Arbitrum",
  "42220": "Celo",
  "43114": "Avalanche",
  "534352": "Scroll",
  "7777777": "Zora",
};

/**
 * Chain colors for visualizations
 */
export const chainColors: Record<string, string> = {
  "1": "#627EEA", // Ethereum - blue
  "10": "#FF0420", // Optimism - red
  "137": "#8247E5", // Polygon - purple
  "250": "#1969FF", // Fantom - blue
  "8453": "#0052FF", // Base - blue
  "42161": "#28A0F0", // Arbitrum - light blue
  "42220": "#FCFF52", // Celo - yellow
  "43114": "#E84142", // Avalanche - red
  "534352": "#FFEEDA", // Scroll - cream
  "7777777": "#A1723A", // Zora - brown
};

/**
 * Get chain name by ID
 */
export const getChainName = (chainId: string): string => {
  return chainNames[chainId] || `Chain ${chainId}`;
};

/**
 * Get chain color by ID
 */
export const getChainColor = (chainId: string): string => {
  return chainColors[chainId] || "#6B7280";
};

/**
 * Period labels for aggregated data display
 */
export const aggregatedPeriodLabels: Record<string, string> = {
  monthly: "Monthly",
  weekly: "Weekly",
  daily: "Daily",
  yearly: "Yearly",
};

/**
 * Period order for aggregated data
 */
export const aggregatedPeriodOrder = ["daily", "weekly", "monthly", "yearly"];

/**
 * Rolling period labels (30d, 90d, etc.)
 */
export const rollingPeriodLabels: Record<string, string> = {
  "30d": "30 Days",
  "90d": "90 Days",
  "180d": "180 Days",
  "1y": "1 Year",
  monthly: "Monthly",
};

/**
 * Rolling period order for display
 */
export const rollingPeriodOrder = ["30d", "90d", "180d", "1y"];

/**
 * Parse breakdown string or object to get per-chain values
 * Handles both string (JSON) and object formats
 */
export const parseBreakdown = (
  breakdown?: string | Record<string, unknown>
): Record<string, number> => {
  if (!breakdown) return {};
  try {
    // Handle string (JSON) format
    const parsed = typeof breakdown === "string" ? JSON.parse(breakdown) : breakdown;
    if (typeof parsed === "object" && !Array.isArray(parsed)) {
      const result: Record<string, number> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "number") {
          result[key] = value;
        }
      }
      return result;
    }
    return {};
  } catch {
    return {};
  }
};

/**
 * Check if datapoints have period-based structure (30d, 90d, 180d, 1y)
 */
export const hasPeriodBasedData = (datapoints: PeriodDatapoint[]): boolean => {
  return datapoints.some((dp) => dp.period && rollingPeriodOrder.includes(dp.period));
};

/**
 * Check if datapoints have monthly historical data
 */
export const hasMonthlyData = (datapoints: PeriodDatapoint[]): boolean => {
  return datapoints.some((dp) => dp.period === "monthly");
};

/**
 * Check if this indicator has unique users data structure (period-based)
 */
export const hasUniqueUsersData = (datapoints: PeriodDatapoint[]): boolean => {
  return datapoints.some((dp) => dp.period && rollingPeriodOrder.includes(dp.period));
};

/**
 * Get the latest datapoint for each rolling period (30d, 90d, 180d, 1y)
 * Groups datapoints by period and returns the most recent one for each period
 */
export const getLatestByPeriod = (datapoints: PeriodDatapoint[]): Map<string, PeriodDatapoint> => {
  const latestByPeriod = new Map<string, PeriodDatapoint>();

  for (const dp of datapoints) {
    // Skip if missing required fields
    if (!dp.period || !rollingPeriodOrder.includes(dp.period) || !dp.endDate) continue;

    const existing = latestByPeriod.get(dp.period);
    if (!existing || !existing.endDate || new Date(dp.endDate) > new Date(existing.endDate)) {
      latestByPeriod.set(dp.period, dp);
    }
  }

  return latestByPeriod;
};
