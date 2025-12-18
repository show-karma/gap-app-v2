"use client";
import { AreaChart, Card } from "@tremor/react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useEcosystemMetrics } from "@/hooks/useEcosystemMetrics";
import type { EcosystemMetric } from "@/types/ecosystem-metrics";
import { formatDate } from "@/utilities/formatDate";
import {
  calculateDateRange,
  formatChartValue,
  formatMetricValue,
  isValidEcosystemMetricsResponse,
  prepareChartDataForMetric,
  type TimeframeOption,
} from "./ecosystemMetricsUtils";
import { TimeframeSelector } from "./TimeframeSelector";

// Only show ecosystem metrics for Filecoin community
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
const MetricCard = ({ metric, color }: { metric: EcosystemMetric; color: string }) => {
  // Memoize expensive chart data calculation
  const chartData = useMemo(
    () => prepareChartDataForMetric(metric),
    [metric.datapoints, metric.name]
  );
  const hasData = chartData.length > 0;

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
            <div className="text-right">
              <p className="text-center text-slate-600 dark:text-gray-200 text-sm font-semibold px-3 py-1 bg-white dark:bg-zinc-700 rounded">
                {metric.latestValue
                  ? formatMetricValue(metric.latestValue, metric.unitOfMeasure)
                  : "N/A"}
              </p>
              {metric.latestDate && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatDate(new Date(metric.latestDate), "UTC")}
                </p>
              )}
            </div>
          </div>

          {/* Chart Card - matching AggregatedSegmentCard pattern */}
          {hasData ? (
            <Card className="bg-white dark:bg-zinc-700">
              <AreaChart
                data={chartData}
                index="date"
                categories={[metric.name]}
                colors={[color]}
                valueFormatter={(value) => formatChartValue(value, metric.unitOfMeasure)}
                yAxisWidth={60}
                enableLegendSlider
                noDataText="No data available for the selected period"
                className="h-72"
              />
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

export const EcosystemMetricsSection = () => {
  const { communityId } = useParams();
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>("1_month");

  // Only render for Filecoin community
  const isFilecoin = FILECOIN_COMMUNITY_SLUGS.includes((communityId as string)?.toLowerCase());

  // Memoize date range calculation based on timeframe
  const dateRange = useMemo(() => {
    if (!isFilecoin) return undefined;
    return calculateDateRange(selectedTimeframe);
  }, [isFilecoin, selectedTimeframe]);

  // Only fetch metrics for Filecoin community
  const { data, isLoading, error, isError } = useEcosystemMetrics(dateRange, isFilecoin);

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
  if (!data || !isValidEcosystemMetricsResponse(data)) {
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
            Ecosystem-wide metrics from the Filecoin network
          </p>
        </div>

        {/* Empty State */}
        <Card className="p-8">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium mb-2">No metrics available</p>
            <p className="text-sm">Ecosystem metrics for this time period are not yet available.</p>
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
