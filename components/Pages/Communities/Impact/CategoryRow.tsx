"use client";
import { Card } from "@tremor/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ChartSkeleton } from "@/components/Utilities/ChartSkeleton";

const AreaChart = dynamic(() => import("@tremor/react").then((mod) => mod.AreaChart), {
  ssr: false,
  loading: () => <ChartSkeleton height="h-72" />,
});

import { useSearchParams } from "next/navigation";
import pluralize from "pluralize";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { useAggregatedIndicators } from "@/hooks/useAggregatedIndicators";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import type { ProgramImpactDataResponse, ProgramImpactSegment } from "@/types/programs";
import formatCurrency, { formatWeiToEth } from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import { SegmentSkeleton } from "./SegmentSkeleton";
import { type TimeframeOption, TimeframeSelector, timeframeOptions } from "./TimeframeSelector";

export const fundedAmountFormatter = (value: string) => {
  const amount = Number(value.includes(" ") ? value.split(" ")[0] : value);
  const formattedAmount = Number(amount.toFixed(2));
  if (Number.isNaN(formattedAmount)) {
    return value;
  }
  return formattedAmount;
};

const prepareAggregatedChartData = (indicators: any[]) => {
  if (!indicators.length) return [];

  // Combine all datapoints from all indicators into a single timeline
  // Use rawDate for sorting and date for display
  const allDatapoints: any[] = [];

  indicators.forEach((indicator) => {
    indicator.aggregatedData.forEach((datapoint: any) => {
      const formattedDate = formatDate(new Date(datapoint.timestamp), "UTC");
      const existingIndex = allDatapoints.findIndex((dp) => dp.rawDate === datapoint.timestamp);
      if (existingIndex >= 0) {
        // Add this indicator's value to existing timestamp
        allDatapoints[existingIndex][indicator.name] = datapoint.value;
      } else {
        // Create new datapoint entry with formatted date for display
        const newDatapoint: any = {
          rawDate: datapoint.timestamp,
          date: formattedDate,
        };
        newDatapoint[indicator.name] = datapoint.value;
        allDatapoints.push(newDatapoint);
      }
    });
  });

  // Sort by rawDate (original timestamp) and fill missing values with 0
  const sortedData = allDatapoints.sort(
    (a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime()
  );
  const indicatorNames = indicators.map((ind) => ind.name);

  return sortedData.map((datapoint) => {
    const filledDatapoint = { ...datapoint };
    indicatorNames.forEach((name) => {
      if (!(name in filledDatapoint)) {
        filledDatapoint[name] = 0;
      }
    });
    // Remove rawDate from final output, keep only formatted date
    const { rawDate: _, ...displayDatapoint } = filledDatapoint;
    return displayDatapoint;
  });
};

const AggregatedSegmentCard = ({ segment }: { segment: ProgramImpactSegment }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>("3_months");

  const { isVisible, ref } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: "200px", // Start loading 200px before segment comes into view
    triggerOnce: true, // Once loaded, don't unload
  });

  const selectedTimeframeConfig = timeframeOptions.find(
    (option) => option.value === selectedTimeframe
  );
  // For "all" timeframe, pass undefined to fetch all data without date filtering
  const timeframeMonths = selectedTimeframeConfig?.months;

  const {
    data: aggregatedIndicators,
    isLoading,
    error,
  } = useAggregatedIndicators(
    segment.impactIndicatorIds,
    isVisible && segment.impactIndicatorIds.length > 0,
    timeframeMonths
  );

  // Listen for filter changes to reset timeframe
  const searchParams = useSearchParams();
  const _projectSelected = searchParams.get("projectId");
  const _programSelected = searchParams.get("programId");

  useEffect(() => {
    // Reset timeframe to 3 months when filters change
    setSelectedTimeframe("3_months");
  }, []);

  const chartData = aggregatedIndicators ? prepareAggregatedChartData(aggregatedIndicators) : [];
  const indicatorNames = aggregatedIndicators?.map((ind) => ind.name) || [];
  const colors = ["blue", "green", "yellow", "purple", "red", "pink"];

  // Check if ALL indicators have wei as unit of measure
  // Using .every() to avoid mislabeling non-wei series when mixed with wei series
  const hasWeiUnit = aggregatedIndicators?.every(
    (ind) => ind.unitOfMeasure?.toLowerCase() === "wei"
  );

  // Use ETH formatter for wei values, otherwise use default currency formatter
  const valueFormatter = hasWeiUnit
    ? (value: number) => formatWeiToEth(value)
    : (value: number) => formatCurrency(value);

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

  const isOutcome = segment.impactSegmentType === "outcome";

  return (
    <div
      ref={ref}
      className="mb-4 flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-background"
    >
      {/* Segment header — soft accent bar */}
      <div
        className={cn(
          "flex flex-row items-center justify-between gap-3 border-b border-border px-5 py-4",
          isOutcome ? "bg-brand-50/60 dark:bg-brand-500/10" : "bg-secondary/60 dark:bg-secondary/40"
        )}
      >
        <div className="flex flex-row items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              isOutcome
                ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400"
                : "bg-muted text-muted-foreground"
            )}
            aria-hidden
          >
            <Image
              src={isOutcome ? "/icons/outcome.svg" : "/icons/activity.svg"}
              alt=""
              width={18}
              height={18}
            />
          </span>
          <div className="flex flex-col">
            <p className="text-base font-semibold tracking-[-0.01em] text-foreground">
              {segment.impactSegmentName}
            </p>
            {segment.impactSegmentDescription ? (
              <p className="text-[13px] text-muted-foreground">
                {segment.impactSegmentDescription}
              </p>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {segment.impactIndicatorIds.length}{" "}
          {pluralize("metric", segment.impactIndicatorIds.length)}
        </span>
      </div>

      {/* Chart body */}
      <div className="px-5 py-5">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-dashed border-red-300 px-6 py-10 text-center dark:border-red-800/60">
            <p className="text-base font-medium text-red-600 dark:text-red-400">
              Error loading metrics
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Unable to fetch indicator data</p>
          </div>
        ) : segment.impactIndicatorIds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <p className="text-base font-medium text-foreground">No metrics available yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Impact indicators will appear here once projects start reporting data.
            </p>
          </div>
        ) : aggregatedIndicators && aggregatedIndicators.length > 0 && chartData.length > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <h4 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                  Aggregated impact metrics
                </h4>
                <p className="text-xs text-muted-foreground">
                  Combined indicator values across all participating projects.
                </p>
              </div>
              <TimeframeSelector
                selectedTimeframe={selectedTimeframe}
                onTimeframeChange={setSelectedTimeframe}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {aggregatedIndicators.map((indicator) => (
                <span
                  key={indicator.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-[12px] font-medium text-foreground"
                >
                  {indicator.name}
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {indicator.totalProjects} {pluralize("project", indicator.totalProjects)}
                  </span>
                </span>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <AreaChart
                data={chartData}
                index="date"
                categories={indicatorNames}
                colors={colors.slice(0, indicatorNames.length)}
                valueFormatter={valueFormatter}
                yAxisWidth={64}
                enableLegendSlider
                noDataText="No data available for the selected period"
                className="h-72"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                Aggregated impact metrics
              </h4>
              <TimeframeSelector
                selectedTimeframe={selectedTimeframe}
                onTimeframeChange={setSelectedTimeframe}
              />
            </div>
            <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
              <p className="text-base font-medium text-foreground">No data available</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No data available for the selected period. Try a different timeframe.
              </p>
            </div>
          </div>
        )}
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
          src={type === "outcome" ? "/icons/outcome.svg" : "/icons/activity.svg"}
          alt={type}
          width={32}
          height={32}
        />
        <div className="flex flex-col gap-0">
          <p className="text-center text-gray-900 dark:text-zinc-100 text-xl font-bold">
            No {type}s have been defined yet
          </p>
          <p className="text-center text-gray-900 dark:text-zinc-200 text-base font-normal">
            No {type}s have been defined for projects funded within the {category}
          </p>
        </div>
      </div>
    </div>
  );
};

const CategoryBlocks = ({ category }: { category: ProgramImpactDataResponse }) => {
  const outputSegments = category.impacts
    .filter((impact) => impact?.impactSegmentType === "output")
    .sort((a, b) => a.impactSegmentName.localeCompare(b.impactSegmentName));

  const outcomeSegments = category.impacts
    .filter((impact) => impact?.impactSegmentType === "outcome")
    .sort((a, b) => a.impactSegmentName.localeCompare(b.impactSegmentName));

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

export const CategoryRow = ({ category }: { category: ProgramImpactDataResponse }) => {
  const searchParams = useSearchParams();
  const projectSelected = searchParams.get("projectId");

  // Calculate total number of projects based on unique indicator IDs across all segments
  const allIndicatorIds = category.impacts.flatMap((impact) => impact.impactIndicatorIds || []);
  const uniqueIndicatorCount = new Set(allIndicatorIds).size;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-row items-center gap-3 border-b border-border pb-3">
        <span aria-hidden className="inline-block h-5 w-1 rounded-full bg-foreground/80" />
        <h3 className="text-lg md:text-xl font-semibold tracking-[-0.01em] text-foreground">
          {category.categoryName}
        </h3>
        {!projectSelected && uniqueIndicatorCount > 0 ? (
          <span className="ml-1 inline-flex items-center rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {uniqueIndicatorCount} {pluralize("indicator", uniqueIndicatorCount)}
          </span>
        ) : null}
      </div>
      <CategoryBlocks category={category} />
    </div>
  );
};
