/**
 * @file Transformation utilities for community metrics
 * @description Converts raw API response to internal CommunityMetricsResponse format
 */

import type {
  CommunityMetric,
  CommunityMetricsRawResponse,
  CommunityMetricsResponse,
} from "@/types/community-metrics";

/**
 * Configuration for metric transformations
 * Maps raw API field names to metric metadata
 */
interface MetricConfig {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  sourceField: string;
  // Optional secondary source field for combined metrics (e.g., total_value_fil + total_gas_used)
  secondarySourceField?: string;
  // Chart display configuration
  chartDisplayLabel?: string; // Override for y-axis label (e.g., "FIL (Millions)")
  yTransform?: (value: number) => number; // Transform function for display
  yDomain?: [number, number]; // Y-axis domain [min, max]
  showArea?: boolean; // Use area chart instead of line
}

/**
 * Metric configurations based on Filecoin Data Portal KPI Metrics
 * Maps raw API field names (camelCase from API response) to metric metadata
 * All metrics use 30-day moving average for visualization
 */
const METRIC_CONFIGS: MetricConfig[] = [
  {
    id: "daily-data-onboarding",
    name: "Daily Data Onboarding",
    description: "How much raw power was onboarded to the network at a given time.",
    unitOfMeasure: "PiB",
    sourceField: "sectorOnboardingRawPowerPibs",
    chartDisplayLabel: "PiBs",
    showArea: true,
  },
  {
    id: "clients-with-1tib",
    name: "Clients with 1 TiB or more active data",
    description: "Number of clients with 1 TiB or more active data on State Market Deals.",
    unitOfMeasure: "clients",
    sourceField: "clientsWithActiveDataGt1Tibs",
    chartDisplayLabel: "Number of Clients",
    showArea: true,
  },
  {
    id: "total-fil-paid-deals",
    name: "Total FIL in Paid Deals",
    description: "Total FIL in paid deals on the network.",
    unitOfMeasure: "FIL",
    sourceField: "dealStorageCostFil",
    chartDisplayLabel: "FIL",
    showArea: true,
  },
  {
    id: "total-value-flow",
    name: "Total Value Flow",
    description: "Total value flow on the network.",
    unitOfMeasure: "FIL",
    // Check if API provides pre-combined totalValueFlow, otherwise combine totalValueFil + totalGasUsedMillions
    sourceField: "totalValueFlow", // Try pre-combined field first
    secondarySourceField: undefined, // Will handle combination in transform if needed
    chartDisplayLabel: "FIL (Millions)",
    // Transform to millions for display: value / 1e6
    // This gives us the total in millions of FIL for the Y-axis
    yTransform: (d) => d / 1e6,
    showArea: true,
  },
];

/**
 * Transforms raw API response to CommunityMetricsResponse format
 * @param rawResponse - The raw API response
 * @returns Transformed response in CommunityMetricsResponse format
 */
export function transformCommunityMetrics(
  rawResponse: CommunityMetricsRawResponse
): CommunityMetricsResponse {
  const { communityUID, data, dateRange } = rawResponse;

  // Group datapoints by metric
  const metrics: CommunityMetric[] = METRIC_CONFIGS.map((config) => {
    const datapoints = data
      .map((datapoint) => {
        // Handle Total Value Flow specially - check if pre-combined or needs combination
        if (config.id === "total-value-flow") {
          // First try pre-combined totalValueFlow field
          let combinedValue: number | null = null;

          if (datapoint.totalValueFlow !== undefined && datapoint.totalValueFlow !== null) {
            // Use pre-combined value if available
            combinedValue =
              typeof datapoint.totalValueFlow === "number"
                ? datapoint.totalValueFlow
                : parseFloat(String(datapoint.totalValueFlow));
          } else if (datapoint.totalValueFil !== undefined && datapoint.totalValueFil !== null) {
            // Otherwise combine totalValueFil + totalGasUsedMillions
            const totalValueFil =
              typeof datapoint.totalValueFil === "number"
                ? datapoint.totalValueFil
                : parseFloat(String(datapoint.totalValueFil));

            if (!Number.isNaN(totalValueFil)) {
              combinedValue = totalValueFil;

              // Add gas usage if available (convert from millions to FIL)
              if (
                datapoint.totalGasUsedMillions !== undefined &&
                datapoint.totalGasUsedMillions !== null
              ) {
                const gasUsedMillions =
                  typeof datapoint.totalGasUsedMillions === "number"
                    ? datapoint.totalGasUsedMillions
                    : parseFloat(String(datapoint.totalGasUsedMillions));

                if (!Number.isNaN(gasUsedMillions)) {
                  // Convert millions back to FIL: gasUsedMillions * 1e6
                  combinedValue += gasUsedMillions * 1e6;
                }
              }
            }
          }

          if (combinedValue === null || Number.isNaN(combinedValue)) {
            return null;
          }

          return { date: datapoint.date, value: combinedValue.toString(), proof: null };
        }

        // For other metrics, use standard field lookup
        const primaryValue = datapoint[config.sourceField];
        if (primaryValue === undefined || primaryValue === null) return null;

        // Parse primary value (handle both string and number types)
        const primaryNum =
          typeof primaryValue === "number" ? primaryValue : parseFloat(String(primaryValue));
        if (Number.isNaN(primaryNum)) return null;

        // Add secondary value if configured (for metrics that need combination)
        let combinedValue = primaryNum;
        if (config.secondarySourceField) {
          const secondaryValue = datapoint[config.secondarySourceField];
          if (secondaryValue !== undefined && secondaryValue !== null) {
            const secondaryNum =
              typeof secondaryValue === "number"
                ? secondaryValue
                : parseFloat(String(secondaryValue));
            if (!Number.isNaN(secondaryNum)) {
              combinedValue += secondaryNum;
            }
          }
        }

        return { date: datapoint.date, value: combinedValue.toString(), proof: null };
      })
      .filter((dp): dp is NonNullable<typeof dp> => dp !== null);

    // Sort by date to find latest value
    const sortedDatapoints = [...datapoints].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const latestDatapoint = sortedDatapoints[sortedDatapoints.length - 1];

    return {
      id: config.id,
      name: config.name,
      description: config.description,
      unitOfMeasure: config.unitOfMeasure,
      sourceField: config.sourceField,
      metadata: null,
      datapoints,
      latestValue: latestDatapoint?.value ?? null,
      latestDate: latestDatapoint?.date ?? null,
      datapointCount: datapoints.length,
    };
  }).filter((metric) => metric.datapointCount > 0); // Only include metrics with data

  return {
    communityUID,
    metrics,
    totalMetrics: metrics.length,
    dateRange: {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
  };
}

/**
 * Chart display configuration for a metric
 */
export interface ChartDisplayConfig {
  chartDisplayLabel?: string;
  yTransform?: (value: number) => number;
  yDomain?: [number, number];
  showArea?: boolean;
}

/**
 * Gets chart display configuration for a metric by its ID
 * @param metricId - The metric ID
 * @returns Chart display configuration or undefined if not found
 */
export function getChartConfigForMetric(metricId: string): ChartDisplayConfig | undefined {
  const config = METRIC_CONFIGS.find((c) => c.id === metricId);
  if (!config) return undefined;

  return {
    chartDisplayLabel: config.chartDisplayLabel,
    yTransform: config.yTransform,
    yDomain: config.yDomain,
    showArea: config.showArea,
  };
}

/**
 * Validates if the data matches the raw API response structure
 */
export function isValidCommunityMetricsRawResponse(
  data: unknown
): data is CommunityMetricsRawResponse {
  return (
    data !== null &&
    typeof data === "object" &&
    "communityUID" in data &&
    typeof (data as { communityUID: unknown }).communityUID === "string" &&
    "data" in data &&
    Array.isArray((data as { data: unknown }).data) &&
    "totalRecords" in data &&
    typeof (data as { totalRecords: unknown }).totalRecords === "number" &&
    "dateRange" in data &&
    typeof (data as { dateRange: unknown }).dateRange === "object" &&
    (data as { dateRange: unknown }).dateRange !== null &&
    "startDate" in ((data as { dateRange: unknown }).dateRange as object) &&
    "endDate" in ((data as { dateRange: unknown }).dateRange as object)
  );
}
