"use client";
import { Carousel, CarouselItem } from "@/components/SnapCarousel";
import { Button } from "@/components/Utilities/Button";
import {
  ImpactAggregateData,
  ImpactAggregateIndicator,
  ImpactAggregateSegment,
} from "@/types/programs";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AreaChart, Card } from "@tremor/react";
import Image from "next/image";
import { useState } from "react";

export const prepareChartData = (
  timestamps: string[],
  avg_values: number[],
  total_values: number[],
  min_values: number[],
  max_values: number[]
): { date: string; [key: string]: number | string }[] => {
  const timestampsData = timestamps
    .map((timestamp, index) => {
      return {
        date: formatDate(new Date(timestamp), true),
        Avg: Number(avg_values[index]) || 0,
        Total: Number(total_values[index]) || 0,
        Min: Number(min_values[index]) || 0,
        Max: Number(max_values[index]) || 0,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return timestampsData;
};

// Create a reusable card component to reduce duplication
const AggregateMetricCard = ({ item }: { item: ImpactAggregateIndicator }) => (
  <Card className="rounded-lg bg-white dark:bg-zinc-800 flex-1">
    <div className="flex justify-between items-start w-full">
      <div className="flex flex-row gap-2 justify-between w-full max-md:flex-wrap max-md:gap-1">
        <div className="flex flex-col gap-0">
          <div className="font-bold text-lg text-black dark:text-white">
            {item.indicatorName}
          </div>
          {item?.amount ? (
            <div className="flex flex-row gap-2 text-sm">
              <span className="text-[#079455] dark:text-[#079455] text-base">
                Funded Amount
              </span>
              <span className="text-[#079455] dark:text-[#079455] font-bold text-base">
                {item?.amount ? item.amount : null}
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex flex-row gap-2 flex-wrap items-center">
          <p className="text-sm text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3">
            {item.impactSegmentName}
          </p>

          <Tooltip.Provider>
            <Tooltip.Root delayDuration={0}>
              <Tooltip.Trigger asChild>
                <p className="text-sm text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3 truncate max-w-[200px]">
                  {item.indicatorName}
                </p>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="text-sm z-50 text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3 truncate"
                  sideOffset={5}
                  side="top"
                >
                  <p className="text-sm text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3 truncate">
                    {item.indicatorName}
                  </p>
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
          {item.impactSegmentType === "outcome" ? (
            <p className="text-sm text-[#F79009] font-semibold dark:text-orange-400 bg-[#FFFAEB] dark:bg-yellow-950  rounded-2xl py-1 px-3">
              Outcome
            </p>
          ) : (
            <p className="text-sm text-[#5925DC] font-semibold dark:text-purple-400 bg-[#F4F3FF] dark:bg-purple-950 rounded-2xl py-1 px-3">
              Output
            </p>
          )}
        </div>
      </div>
    </div>
    <AreaChart
      data={prepareChartData(
        item.datapoints.map(
          (datapoint) => datapoint.outputTimestamp || new Date().toISOString()
        ),
        item.datapoints
          .map((datapoint) => datapoint.avg_value)
          .filter((val): val is number => val !== undefined),
        item.datapoints
          .map((datapoint) => datapoint.total_value)
          .filter((val): val is number => val !== undefined),
        item.datapoints
          .map((datapoint) => datapoint.min_value)
          .filter((val): val is number => val !== undefined),
        item.datapoints
          .map((datapoint) => datapoint.max_value)
          .filter((val): val is number => val !== undefined)
      )}
      index={"date"}
      categories={["Avg", "Total", "Min", "Max"]}
      colors={["blue", "green", "red", "yellow"]}
      valueFormatter={(value) => `${value}`}
      yAxisWidth={40}
      enableLegendSlider
      noDataText="Awaiting grantees to submit values"
    />
  </Card>
);

const AggregateSegmentCard = ({
  segmentsByType,
}: {
  segmentsByType: ImpactAggregateSegment[];
}) => {
  const [selectedSegment, setSelectedSegment] =
    useState<ImpactAggregateSegment | null>(segmentsByType[0]);
  const orderedSegments = segmentsByType.sort((a, b) => {
    return a.impactSegmentName.localeCompare(b.impactSegmentName);
  });
  return (
    <div className={"flex flex-col w-full"}>
      <div className="flex flex-row gap-2 flex-wrap">
        {orderedSegments.map((item, index) => (
          <Button
            className={cn(
              "px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 font-normal bg-white dark:bg-zinc-800 text-sm text-black border border-gray-300 dark:border-zinc-700 dark:text-white",
              selectedSegment?.impactSegmentId === item.impactSegmentId
                ? "bg-zinc-800 dark:bg-zinc-600 text-white dark:text-white border border-zinc-800 dark:border-zinc-600"
                : ""
            )}
            key={`${item.impactSegmentType}-${item.impactSegmentName}-${index}`}
            onClick={() => setSelectedSegment(item)}
          >
            {item.impactSegmentName}
          </Button>
        ))}
      </div>
      <p className="my-1 text-base text-gray-500 dark:text-zinc-400">
        {selectedSegment?.impactSegmentDescription}
      </p>
      {selectedSegment ? (
        <Carousel
          key={`${selectedSegment.impactSegmentType}-${selectedSegment.impactSegmentName}-${selectedSegment.impactSegmentId}`}
          items={selectedSegment.indicators}
          renderItem={({ item, isSnapPoint }) => (
            <CarouselItem
              key={`${item.categoryId}-${item.impactSegmentId}-${item.impactSegmentType}-${item.impactIndicatorId}-${item.indicatorName}`}
              isSnapPoint={isSnapPoint}
            >
              <AggregateMetricCard item={item} />
            </CarouselItem>
          )}
        />
      ) : null}
    </div>
  );
};

const AggregateCategoryBlocks = ({
  category,
}: {
  category: ImpactAggregateData;
}) => {
  const outputsById = category.impacts.filter(
    (impact) =>
      impact?.impactSegmentType === "output" ||
      impact?.indicators?.[0]?.impactSegmentType === "output"
  );
  const outcomesById = category.impacts.filter(
    (impact) =>
      impact?.impactSegmentType === "outcome" ||
      impact?.indicators?.[0]?.impactSegmentType === "outcome"
  );
  return (
    <div className={`grid grid-cols-2 gap-6 max-md:flex max-md:flex-col`}>
      {/* Outputs Column */}
      <div
        className={
          Object.entries(outputsById).length === 0
            ? "hidden"
            : "flex flex-col w-full"
        }
      >
        <AggregateSegmentCard segmentsByType={outputsById} />
      </div>

      {/* Outcomes Column */}
      <div
        className={
          Object.entries(outcomesById).length === 0
            ? "hidden"
            : "flex flex-col w-full"
        }
      >
        {outcomesById.length ? (
          <AggregateSegmentCard segmentsByType={outcomesById} />
        ) : null}
      </div>
    </div>
  );
};

export const AggregateCategoryRow = ({
  program,
}: {
  program: ImpactAggregateData;
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-3 items-center">
        <h2 className="text-2xl leading-6 font-bold text-black dark:text-white">
          {program.categoryName}
        </h2>
        {/* <p className="text-lg leading-6 text-gray-500 dark:text-zinc-200 font-medium">
          {program.outputs.length}{" "}
          {pluralize("project", program.outputs.length)}
        </p> */}
      </div>
      {program.impacts.length ? (
        <AggregateCategoryBlocks category={program} />
      ) : (
        <div className="flex flex-col justify-center items-center gap-8 rounded-xl px-12 py-6 min-h-[280px] border border-dashed border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-zinc-900">
          <Image
            src={"/icons/poker-face.png"}
            alt="no data"
            width={40}
            height={40}
          />
          <p className="text-center text-gray-900 dark:text-zinc-100 text-base font-bold leading-normal">
            We are waiting for project to submit values for this metric
          </p>
        </div>
      )}
    </div>
  );
};
