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
import { AreaChart, Card } from "@tremor/react";
import Image from "next/image";
import { useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import * as Tooltip from "@radix-ui/react-tooltip";
import { EmptySegment, fundedAmountFormatter } from "./CategoryRow";
import pluralize from "pluralize";
import { prepareChartDataTimestamp } from "@/src/lib/analytics/chart";

// Create a reusable card component to reduce duplication
const AggregateMetricCard = ({
  item,
  index,
  maxItems,
}: {
  item: ImpactAggregateIndicator;
  index: number;
  maxItems: number;
}) => (
  <Card className="rounded-lg bg-white dark:bg-zinc-800 flex-1">
    <div className="flex justify-between items-start w-full">
      <div className="flex flex-row gap-2 justify-between w-full max-md:flex-wrap max-md:gap-1">
        <div className="flex flex-col gap-0">
          <p className="text-slate-600 text-sm font-semibold">
            Metric {index + 1} of {maxItems}
          </p>
          <div className="font-bold text-lg text-black dark:text-white">
            {item.indicatorName}
          </div>
          {item?.amount ? (
            <div className="flex flex-row gap-2 text-sm">
              <span className="text-[#079455] dark:text-[#079455] text-base">
                Funded Amount
              </span>
              <span className="text-[#079455] dark:text-[#079455] font-bold text-base">
                {item?.amount ? fundedAmountFormatter(item.amount) : null}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
    <AreaChart
      data={prepareChartDataTimestamp(
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
    <div
      className={"flex flex-col w-full bg-[#F9FAFB] dark:bg-zinc-800 rounded"}
    >
      {orderedSegments.length > 1 ? (
        <div className="flex flex-row gap-y-2 gap-x-0 flex-wrap border-b border-gray-100 dark:border-zinc-700">
          {orderedSegments.map((item, index) => (
            <button
              key={`${item.impactSegmentType}-${item.impactSegmentName}-${index}`}
              className={cn(
                "px-3 py-4 flex-1 rounded-none border-t-none border-l-none border-r-none flex items-center text-center justify-center gap-2 cursor-pointer text-slate-800 text-base font-bold",
                selectedSegment?.impactSegmentId === item.impactSegmentId
                  ? "border-b-4 border-b-[#155EEF]"
                  : "bg-transparent border-b border-b-zinc-100"
              )}
              type="button"
              onClick={() => setSelectedSegment(item)}
            >
              <span className="text-sm text-black dark:text-white">
                {item.impactSegmentName}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="px-6 pb-6">
        {selectedSegment ? (
          <div className="pt-3 flex flex-col gap-3">
            <div
              className={cn(
                "p-3 flex flex-row gap-3 justify-between items-start rounded",
                selectedSegment.impactSegmentType === "outcome"
                  ? "bg-green-100 dark:bg-green-900"
                  : "bg-indigo-100 dark:bg-indigo-900"
              )}
            >
              <div className="flex flex-row gap-3 items-center">
                <Image
                  src={
                    selectedSegment.impactSegmentType === "outcome"
                      ? "/icons/outcome.svg"
                      : "/icons/activity.svg"
                  }
                  alt="outcome"
                  width={32}
                  height={32}
                />
                <div className="flex flex-col gap-0">
                  <p className="text-black dark:text-white text-lg font-semibold">
                    {selectedSegment.impactSegmentName}
                  </p>
                  <p className="text-black dark:text-white text-base font-normal">
                    {selectedSegment.impactSegmentDescription}
                  </p>
                </div>
              </div>
              <p className="text-center text-slate-600 dark:text-gray-200 text-sm font-semibold px-3 py-1 bg-white dark:bg-zinc-700 rounded justify-start items-center">
                {selectedSegment.indicators.length}{" "}
                {pluralize("metric", selectedSegment.indicators.length)}
              </p>
            </div>
            <Carousel
              key={`${selectedSegment.impactSegmentType}-${selectedSegment.impactSegmentName}-${selectedSegment.impactSegmentId}`}
              items={selectedSegment.indicators}
              renderItem={({ item, isSnapPoint, index }) => (
                <CarouselItem
                  key={`${item.categoryId}-${item.impactSegmentId}-${item.impactSegmentType}-${item.impactIndicatorId}-${item.indicatorName}`}
                  isSnapPoint={isSnapPoint}
                >
                  <AggregateMetricCard
                    item={item}
                    index={index}
                    maxItems={selectedSegment.indicators.length}
                  />
                </CarouselItem>
              )}
            />
          </div>
        ) : null}
      </div>
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
      {Object.entries(outputsById).length === 0 ? (
        <EmptySegment type="output" category={category.categoryName} />
      ) : (
        <div className={"flex flex-col w-full"}>
          <AggregateSegmentCard segmentsByType={outputsById} />
        </div>
      )}

      {/* Outcomes Column */}
      {Object.entries(outcomesById).length === 0 ? (
        <EmptySegment type="outcome" category={category.categoryName} />
      ) : (
        <div className={"flex flex-col w-full"}>
          {outcomesById.length ? (
            <AggregateSegmentCard segmentsByType={outcomesById} />
          ) : null}
        </div>
      )}
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
