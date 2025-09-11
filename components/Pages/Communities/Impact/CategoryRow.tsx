"use client";
import {
  ProgramImpactDataResponse,
  ProgramImpactSegment,
} from "@/types/programs";
import { cn } from "@/utilities/tailwind";
import { AreaChart, Card } from "@tremor/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import pluralize from "pluralize";
import { useAggregatedIndicators } from "@/hooks/useAggregatedIndicators";
import formatCurrency from "@/utilities/formatCurrency";
import { Spinner } from "@/components/Utilities/Spinner";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { SegmentSkeleton } from "./SegmentSkeleton";

export const fundedAmountFormatter = (value: string) => {
  const amount = Number(value.includes(" ") ? value.split(" ")[0] : value);
  const formattedAmount = Number(amount.toFixed(2));
  if (isNaN(formattedAmount)) {
    return value;
  }
  return formattedAmount;
};

const prepareAggregatedChartData = (indicators: any[]) => {
  if (!indicators.length) return [];
  
  // Combine all datapoints from all indicators into a single timeline
  const allDatapoints: any[] = [];
  
  indicators.forEach(indicator => {
    indicator.aggregatedData.forEach((datapoint: any) => {
      const existingIndex = allDatapoints.findIndex(dp => dp.date === datapoint.timestamp);
      if (existingIndex >= 0) {
        // Add this indicator's value to existing timestamp
        allDatapoints[existingIndex][indicator.name] = datapoint.value;
      } else {
        // Create new datapoint entry
        const newDatapoint: any = { date: datapoint.timestamp };
        newDatapoint[indicator.name] = datapoint.value;
        allDatapoints.push(newDatapoint);
      }
    });
  });
  
  // Sort by date and fill missing values with 0
  const sortedData = allDatapoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const indicatorNames = indicators.map(ind => ind.name);
  
  return sortedData.map(datapoint => {
    const filledDatapoint = { ...datapoint };
    indicatorNames.forEach(name => {
      if (!(name in filledDatapoint)) {
        filledDatapoint[name] = 0;
      }
    });
    return filledDatapoint;
  });
};

const AggregatedSegmentCard = ({
  segment,
}: {
  segment: ProgramImpactSegment;
}) => {
  const { isVisible, ref } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '200px', // Start loading 200px before segment comes into view
    triggerOnce: true, // Once loaded, don't unload
  });

  const { data: aggregatedIndicators, isLoading, error } = useAggregatedIndicators(
    segment.impactIndicatorIds,
    isVisible && segment.impactIndicatorIds.length > 0
  );

  // Performance debugging - can be removed in production
  if (isVisible && segment.impactIndicatorIds.length > 0) {
    console.log(`🚀 Loading segment: ${segment.impactSegmentName} (${segment.impactIndicatorIds.length} indicators)`);
  }

  const chartData = aggregatedIndicators ? prepareAggregatedChartData(aggregatedIndicators) : [];
  const indicatorNames = aggregatedIndicators?.map(ind => ind.name) || [];
  const colors = ["blue", "green", "yellow", "purple", "red", "pink"];

  // If not visible yet, show skeleton
  if (!isVisible) {
    return (
      <div ref={ref}>
        <SegmentSkeleton
          segmentType={segment.impactSegmentType}
          segmentName={segment.impactSegmentName}
          segmentDescription={segment.impactSegmentDescription}
          indicatorCount={segment.impactIndicatorIds.length}
        />
      </div>
    );
  }

  return (
    <div ref={ref} className="flex flex-col w-full bg-[#F9FAFB] dark:bg-zinc-800 rounded mb-4">
      <div className="px-6 pb-6 flex flex-col gap-y-4">
        <div className="pt-3 flex flex-col gap-3">
          <div
            className={cn(
              "p-3 flex flex-row gap-3 justify-between items-start rounded",
              segment.impactSegmentType === "outcome"
                ? "bg-green-100 dark:bg-green-900"
                : "bg-indigo-100 dark:bg-indigo-900"
            )}
          >
            <div className="flex flex-row gap-3 items-center">
              <Image
                src={
                  segment.impactSegmentType === "outcome"
                    ? "/icons/outcome.svg"
                    : "/icons/activity.svg"
                }
                alt={segment.impactSegmentType}
                width={32}
                height={32}
              />
              <div className="flex flex-col gap-0">
                <p className="text-black dark:text-white text-lg font-semibold">
                  {segment.impactSegmentName}
                </p>
                <p className="text-black dark:text-white text-base font-normal">
                  {segment.impactSegmentDescription}
                </p>
              </div>
            </div>
            <p className="text-center text-slate-600 dark:text-gray-200 text-sm font-semibold px-3 py-1 bg-white dark:bg-zinc-700 rounded justify-start items-center">
              {segment.impactIndicatorIds.length}{" "}
              {pluralize("metric", segment.impactIndicatorIds.length)}
            </p>
          </div>
          
          {/* Aggregated Chart Display */}
          {isLoading ? (
            <div className="flex justify-center items-center h-32 bg-white dark:bg-zinc-700 rounded-lg">
              <Spinner />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 dark:text-red-400 bg-white dark:bg-zinc-700 rounded-lg border-2 border-dashed border-red-300 dark:border-red-600">
              <p className="text-lg font-medium">Error loading metrics</p>
              <p className="text-sm mt-1">Unable to fetch indicator data</p>
            </div>
          ) : segment.impactIndicatorIds.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-zinc-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <p className="text-lg font-medium">No metrics available yet</p>
              <p className="text-sm mt-1">Impact indicators will appear here once projects start reporting data</p>
            </div>
          ) : aggregatedIndicators && aggregatedIndicators.length > 0 && chartData.length > 0 ? (
            <Card className="bg-white dark:bg-zinc-700">
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-black dark:text-white mb-2">
                  Aggregated Impact Metrics
                </h4>
                <div className="flex flex-wrap gap-2">
                  {aggregatedIndicators.map((indicator, index) => (
                    <span
                      key={indicator.id}
                      className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
                    >
                      {indicator.name} ({indicator.totalProjects} {pluralize("project", indicator.totalProjects)})
                    </span>
                  ))}
                </div>
              </div>
              <AreaChart
                data={chartData}
                index="date"
                categories={indicatorNames}
                colors={colors.slice(0, indicatorNames.length)}
                valueFormatter={(value) => `${formatCurrency(value)}`}
                yAxisWidth={60}
                enableLegendSlider
                noDataText="No data available for the selected period"
                className="h-72"
              />
            </Card>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-zinc-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <p className="text-lg font-medium">No data available</p>
              <p className="text-sm mt-1">Metrics are configured but no data has been reported yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const EmptySegment = ({
  type,
  category,
}: {
  type: "output" | "outcome";
  category: string;
}) => {
  return (
    <div className="p-6 bg-[#f8f9fb] dark:bg-zinc-800 flex flex-col justify-center items-center w-full h-full">
      <div className="flex flex-col justify-center items-center gap-8 h-full w-full border border-dashed border-gray-400 dark:border-gray-600 rounded-xl px-12 py-6">
        <Image
          src={
            type === "outcome" ? "/icons/outcome.svg" : "/icons/activity.svg"
          }
          alt={type}
          width={32}
          height={32}
        />
        <div className="flex flex-col gap-0">
          <p className="text-center text-gray-900 dark:text-zinc-100 text-xl font-bold">
            No {type}s have been defined yet
          </p>
          <p className="text-center text-gray-900 dark:text-zinc-200 text-base font-normal">
            No {type}s have been defined for projects funded within the{" "}
            {category}
          </p>
        </div>
      </div>
    </div>
  );
};

const CategoryBlocks = ({
  category,
}: {
  category: ProgramImpactDataResponse;
}) => {
  const outputSegments = category.impacts.filter(
    (impact) => impact?.impactSegmentType === "output"
  ).sort((a, b) => a.impactSegmentName.localeCompare(b.impactSegmentName));
  
  const outcomeSegments = category.impacts.filter(
    (impact) => impact?.impactSegmentType === "outcome"
  ).sort((a, b) => a.impactSegmentName.localeCompare(b.impactSegmentName));

  return (
    <div className={`grid grid-cols-2 gap-6 max-md:flex max-md:flex-col`}>
      {/* Outputs Column */}
      <div className="flex flex-col w-full">
        {outputSegments.length === 0 ? (
          <EmptySegment type="output" category={category.categoryName} />
        ) : (
          outputSegments.map((segment, index) => (
            <AggregatedSegmentCard
              key={`output-segment-${segment.impactSegmentId}-${index}`}
              segment={segment}
            />
          ))
        )}
      </div>

      {/* Outcomes Column */}
      <div className="flex flex-col w-full">
        {outcomeSegments.length === 0 ? (
          <EmptySegment type="outcome" category={category.categoryName} />
        ) : (
          outcomeSegments.map((segment, index) => (
            <AggregatedSegmentCard
              key={`outcome-segment-${segment.impactSegmentId}-${index}`}
              segment={segment}
            />
          ))
        )}
      </div>
    </div>
  );
};

export const CategoryRow = ({
  category,
}: {
  category: ProgramImpactDataResponse;
}) => {
  const searchParams = useSearchParams();
  const projectSelected = searchParams.get("projectId");

  // Calculate total number of projects based on unique indicator IDs across all segments
  const allIndicatorIds = category.impacts.flatMap(impact => impact.impactIndicatorIds || []);
  const uniqueIndicatorCount = new Set(allIndicatorIds).size;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-3 items-center">
        <h2 className="text-2xl leading-6 font-bold text-black dark:text-white">
          {category.categoryName}
        </h2>
        {!projectSelected ? (
          <p className="text-lg leading-6 text-gray-500 dark:text-zinc-200 font-medium">
            {uniqueIndicatorCount}{" "}
            {pluralize("indicator", uniqueIndicatorCount)}
          </p>
        ) : null}
      </div>
      <CategoryBlocks category={category} />
    </div>
  );
};