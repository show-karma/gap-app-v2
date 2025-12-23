/**
 * @file CommunityMetricsSection component
 * @description
 * Displays community metrics charts for Filecoin network.
 *
 * IMPORTANT: This component and its chart utilities are SEPARATE from other chart types:
 * - Uses prepareCommunityMetricsChartData() - specific to community metrics only
 * - Applies 30-day moving average for all metrics
 * - Only renders for Filecoin community
 *
 * Other chart types use different utilities:
 * - ImpactCharts.tsx: prepareChartData() for program impact measurements
 * - AggregateCategoryRow.tsx: prepareChartData() for aggregated indicators
 */
"use client";
import { AreaChart, Card } from "@tremor/react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useCommunityMetrics } from "@/hooks/useCommunityMetrics";
import type { CommunityMetric } from "@/types/community-metrics";
import formatCurrency from "@/utilities/formatCurrency";
import { getChartConfigForMetric } from "@/utilities/registry/transformCommunityMetrics";
import {
  calculateDateRange,
  isValidCommunityMetricsResponse,
  prepareCommunityMetricsChartData,
  type TimeframeOption,
} from "./communityMetricsUtils";
import { TimeframeSelector } from "./TimeframeSelector";

// Only show community metrics for Filecoin community
const FILECOIN_COMMUNITY_SLUGS = ["filecoin", "fil"];

// Chart skeleton component for loading state
const ChartSkeleton = () => {
  return (
    <div className="flex flex-col w-full bg-[#F9FAFB] dark:bg-zinc-800 rounded">
      <div className="px-6 pb-6 flex flex-col gap-y-4">
        <div className="pt-3 flex flex-col gap-3">
          {/* Metric Header Skeleton */}
          <div className="p-3 flex flex-row gap-3 justify-between items-start rounded bg-indigo-100 dark:bg-indigo-900 animate-pulse">
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full" />
            </div>
            <div className="text-right">
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-24" />
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20 mt-2" />
            </div>
          </div>

          {/* Chart Card Skeleton */}
          <Card className="bg-white dark:bg-zinc-700">
            <div className="h-72 bg-gray-100 dark:bg-gray-600 rounded animate-pulse flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-500 rounded-full mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading chart data...</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Metric card component with memoized chart data
const MetricCard = ({ metric, color }: { metric: CommunityMetric; color: string }) => {
  // Get chart configuration for this metric
  const chartConfig = getChartConfigForMetric(metric.id);

  // Memoize expensive chart data calculation with chart config options
  // Apply 30-day moving average as per Filecoin Data Portal specification
  // NOTE: This uses prepareCommunityMetricsChartData which is specific to community metrics only
  // Intentionally using specific metric properties (datapoints, name) as dependencies
  // rather than the entire metric object to avoid unnecessary recalculations when
  // the metric reference changes but the data hasn't
  const chartData = useMemo(
    () =>
      prepareCommunityMetricsChartData(metric, {
        yTransform: chartConfig?.yTransform,
        applyMovingAverage: true, // All community metrics use 30-day moving average
        movingAverageWindow: 30,
      }),
    [metric.datapoints, metric.name, chartConfig?.yTransform]
  );
  const hasData = chartData.length > 0;

  // Calculate Y-axis domain based on moving average values only (not raw values)
  // This allows extreme raw values to overflow without affecting the chart scale
  // Filter/clip chart data to focus on moving average range
  const filteredChartData = useMemo(() => {
    if (!hasData) {
      return chartData;
    }

    // Extract moving average values (exclude NaNs and undefined)
    const movingAvgKey = `${metric.name} (30-day avg)`;
    const movingAvgValues = chartData
      .map((d) => d[movingAvgKey])
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

    if (movingAvgValues.length === 0) {
      return chartData;
    }

    const min = Math.min(...movingAvgValues);
    const max = Math.max(...movingAvgValues);

    // Add 10% padding above and below for better visualization
    const padding = (max - min) * 0.1 || max * 0.1 || 1;
    const domainMin = Math.max(0, min - padding); // Don't go below 0
    const domainMax = max + padding;

    const calculatedDomain: [number, number] = chartConfig?.yDomain || [domainMin, domainMax];

    // Filter/clip raw values to domain range - extreme values will be clipped
    // This focuses the chart on the moving average while still showing raw data within range
    return chartData.map((d) => {
      const rawValue = d[metric.name];
      const movingAvgValue = d[movingAvgKey];

      // Clip raw values to domain range (extreme values will be clipped at boundaries)
      let clippedRawValue: number | undefined;
      if (typeof rawValue === "number" && !Number.isNaN(rawValue)) {
        clippedRawValue = Math.max(calculatedDomain[0], Math.min(calculatedDomain[1], rawValue));
      }

      return {
        ...d,
        [metric.name]: clippedRawValue, // Clipped raw value
        [movingAvgKey]: movingAvgValue, // Keep moving average as-is
      };
    });
  }, [chartData, hasData, metric.name, chartConfig?.yDomain]);

  // Determine categories and colors for both raw and moving average lines
  const categories = useMemo(() => [metric.name, `${metric.name} (30-day avg)`], [metric.name]);
  // Use extremely faint colors for raw data, bold colors for moving average
  // Raw data should be barely visible - use the lightest possible color
  const colors = useMemo(() => {
    // Use "neutral" (extremely light gray, barely visible) for raw data
    // Moving average uses the primary color (bold and prominent)
    return ["neutral", color]; // [barely visible neutral for raw, bold primary color for moving average]
  }, [color]);

  // Get display label for y-axis and value formatting
  const displayLabel = chartConfig?.chartDisplayLabel || metric.unitOfMeasure;

  return (
    <div className="flex flex-col w-full bg-[#F9FAFB] dark:bg-zinc-800 rounded">
      <div className="px-6 pb-6 flex flex-col gap-y-4">
        <div className="pt-3 flex flex-col gap-3">
          {/* Metric Header - similar to segment header */}
          <div className="p-3 flex flex-row gap-3 justify-between items-start rounded bg-indigo-100 dark:bg-indigo-900">
            <div className="flex flex-col gap-0 flex-1">
              <p className="text-black dark:text-white text-lg font-semibold">{metric.name}</p>
              {metric.description && (
                <p className="text-black dark:text-white text-base font-normal">
                  {metric.description}
                </p>
              )}
            </div>
          </div>

          {/* Chart Card - matching AggregatedSegmentCard pattern */}
          {hasData ? (
            <Card className="bg-white dark:bg-zinc-700">
              {/* Y-axis label */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-2">{displayLabel}</p>
              </div>
              {/* CSS opacity workaround for Tremor AreaChart - makes raw data (first series) 
                  nearly invisible while keeping moving average prominent. 
                  Note: This relies on Recharts DOM structure within Tremor. */}
              <div className="[&_svg_.recharts-area:first-child]:opacity-[0.12] [&_svg_.recharts-area:first-child_path]:opacity-[0.12] [&_svg_.recharts-area:first-child_polygon]:opacity-[0.12] [&_svg_.recharts-area:first-child_path]:fill-opacity-[0.12] [&_svg_.recharts-area:first-child_polygon]:fill-opacity-[0.12]">
                <AreaChart
                  data={filteredChartData}
                  index="date"
                  categories={categories}
                  colors={colors}
                  // Chart focuses on moving average range - extreme raw values are clipped
                  // Y-axis scale is determined by moving average values only
                  // Raw data (first category) is extremely faint (12% opacity) via CSS
                  // 30-day average (second category) remains fully visible
                  valueFormatter={(value) => {
                    // Format value without unit for cleaner Y-axis labels
                    // Unit is shown in the chart display label above
                    const numValue = typeof value === "number" ? value : parseFloat(String(value));
                    if (Number.isNaN(numValue)) return "0";

                    // If the value is already transformed to millions (yTransform applied),
                    // show the number with comma separators for clarity
                    // The label already indicates "(Millions)" so we don't need K/M/B notation
                    if (chartConfig?.yTransform) {
                      // Values are already in millions - show with appropriate precision and commas
                      if (numValue >= 1) {
                        return numValue.toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                          minimumFractionDigits: 0,
                        });
                      } else {
                        return numValue.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                          minimumFractionDigits: 0,
                        });
                      }
                    }

                    // Use formatCurrency for non-transformed values
                    return formatCurrency(numValue);
                  }}
                  yAxisWidth={80}
                  enableLegendSlider
                  noDataText="No data available for the selected period"
                  className="h-72"
                  // Stack mode off so lines overlay instead of stack
                  stack={false}
                />
              </div>
            </Card>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-zinc-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <p className="text-lg font-medium">No data available</p>
              <p className="text-sm mt-1">No data available for the selected period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CommunityMetricsSection = () => {
  const { communityId } = useParams();
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>("all");

  // Only render for Filecoin community
  const isFilecoin = FILECOIN_COMMUNITY_SLUGS.includes((communityId as string)?.toLowerCase());

  // Memoize date range calculation based on timeframe
  const dateRange = useMemo(() => {
    if (!isFilecoin) return undefined;
    return calculateDateRange(selectedTimeframe);
  }, [isFilecoin, selectedTimeframe]);

  // Only fetch metrics for Filecoin community
  const { data, isLoading, error, isError } = useCommunityMetrics(dateRange, isFilecoin);

  // Only render for Filecoin community
  if (!isFilecoin) {
    return null;
  }

  // Show loading state with skeletons
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 mb-8">
        {/* Section Header */}
        <div className="flex flex-row gap-3 items-center justify-between">
          <div className="flex flex-row gap-3 items-center">
            <h2 className="text-2xl leading-6 font-bold text-black dark:text-white">
              Filecoin Network Metrics
            </h2>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
          </div>
          <TimeframeSelector
            selectedTimeframe={selectedTimeframe}
            onTimeframeChange={setSelectedTimeframe}
          />
        </div>

        {/* Loading Skeletons - show 2 skeleton cards */}
        <div className="grid grid-cols-2 gap-6 max-md:flex max-md:flex-col">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  // Show error state (only if there's an actual error, not just no data)
  if (isError || error) {
    // Don't show error UI - just return null so it doesn't break the page
    // The backend might not have this endpoint implemented yet
    return null;
  }

  // Validate and use the fetched data
  if (!data || !isValidCommunityMetricsResponse(data)) {
    return null;
  }

  const metricsData = data;

  // If metrics array is empty, show empty state instead of hiding
  if (metricsData.metrics.length === 0) {
    return (
      <div className="flex flex-col gap-6 mb-8">
        {/* Section Header */}
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-black dark:text-white">
            Filecoin Network Metrics
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Community-wide metrics from the Filecoin network
          </p>
        </div>

        {/* Empty State */}
        <Card className="p-8">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium mb-2">No metrics available</p>
            <p className="text-sm">Community metrics for this time period are not yet available.</p>
          </div>
        </Card>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
      </div>
    );
  }

  const metrics = metricsData.metrics || [];
  const colors = ["blue", "green", "yellow", "purple", "red", "pink"];

  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* Section Header */}
      <div className="flex flex-row gap-3 items-center justify-between">
        <div className="flex flex-row gap-3 items-center">
          <h2 className="text-2xl leading-6 font-bold text-black dark:text-white">
            Filecoin Network Metrics
          </h2>
          <p className="text-lg leading-6 text-gray-500 dark:text-zinc-200 font-medium">
            {metrics.length} {metrics.length === 1 ? "metric" : "metrics"}
          </p>
        </div>
        <TimeframeSelector
          selectedTimeframe={selectedTimeframe}
          onTimeframeChange={setSelectedTimeframe}
        />
      </div>

      {/* Individual Metric Cards with Charts - in 2x2 grid like activities/outputs */}
      <div className="grid grid-cols-2 gap-6 max-md:flex max-md:flex-col">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.id} metric={metric} color={colors[index % colors.length]} />
        ))}
      </div>
    </div>
  );
};
