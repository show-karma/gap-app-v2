"use client";
import { AreaChart, Card } from "@tremor/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { useEcosystemMetrics } from "@/hooks/useEcosystemMetrics";
import type { EcosystemMetric } from "@/types/ecosystem-metrics";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import { type TimeframeOption, TimeframeSelector } from "./TimeframeSelector";

const formatMetricValue = (value: string, unit: string): string => {
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

const formatChartValue = (value: number, unit: string): string => {
  // Handle very small numbers for chart tooltips
  if (value > 0 && value < 0.0001) {
    if (value < 0.000001) {
      return `${value.toExponential(2)} ${unit}`;
    }
    return `${value.toFixed(8).replace(/\.?0+$/, "")} ${unit}`;
  }
  return `${formatCurrency(value)} ${unit}`;
};

const prepareChartDataForMetric = (metric: EcosystemMetric) => {
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

// Only show ecosystem metrics for Filecoin community
const FILECOIN_COMMUNITY_SLUGS = ["filecoin", "fil"];

export const EcosystemMetricsSection = () => {
  const { communityId } = useParams();
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>("1_month");

  // Only render for Filecoin community
  const isFilecoin = FILECOIN_COMMUNITY_SLUGS.includes((communityId as string)?.toLowerCase());

  // Calculate date range based on timeframe
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();

    switch (selectedTimeframe) {
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
  };

  const dateRange = isFilecoin ? getDateRange() : undefined;

  // Call without date filters to get all metrics (fallback if filtered data is empty)
  const { data: allData } = useEcosystemMetrics(isFilecoin ? undefined : undefined);
  const { data, isLoading, error, isError } = useEcosystemMetrics(dateRange);

  // Only render for Filecoin community
  if (!isFilecoin) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner />
      </div>
    );
  }

  // Show error state (only if there's an actual error, not just no data)
  if (isError || error) {
    // Don't show error UI - just return null so it doesn't break the page
    // The backend might not have this endpoint implemented yet
    return null;
  }

  // Use allData if filtered data is empty (date range might be filtering out all metrics)
  const metricsData = data?.metrics && data.metrics.length > 0 ? data : allData;

  // Don't render if data is null or metrics array doesn't exist
  if (!metricsData || !metricsData.metrics) {
    return null;
  }

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
      <div className={`grid grid-cols-2 gap-6 max-md:flex max-md:flex-col`}>
        {metrics.map((metric, index) => {
          const chartData = prepareChartDataForMetric(metric);
          const hasData = chartData.length > 0;

          return (
            <div
              key={metric.id}
              className="flex flex-col w-full bg-[#F9FAFB] dark:bg-zinc-800 rounded"
            >
              <div className="px-6 pb-6 flex flex-col gap-y-4">
                <div className="pt-3 flex flex-col gap-3">
                  {/* Metric Header - similar to segment header */}
                  <div className="p-3 flex flex-row gap-3 justify-between items-start rounded bg-indigo-100 dark:bg-indigo-900">
                    <div className="flex flex-col gap-0 flex-1">
                      <p className="text-black dark:text-white text-lg font-semibold">
                        {metric.name}
                      </p>
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
                        colors={[colors[index % colors.length]]}
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
        })}
      </div>
    </div>
  );
};
