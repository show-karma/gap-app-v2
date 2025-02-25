"use client";
import { Carousel, CarouselItem } from "@/components/SnapCarousel";
import { Button } from "@/components/Utilities/Button";
import {
  ImpactIndicator,
  ProgramImpactDataResponse,
  ProgramImpactSegment,
} from "@/types/programs";
import { cn } from "@/utilities/tailwind";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AreaChart, Card } from "@tremor/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import pluralize from "pluralize";
import { useState } from "react";
import { prepareChartData } from "./ImpactCharts";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

export const fundedAmountFormatter = (value: string) => {
  const amount = Number(value.includes(" ") ? value.split(" ")[0] : value);
  const formattedAmount = Number(amount.toFixed(2));
  if (isNaN(formattedAmount)) {
    return value;
  }
  return formattedAmount;
};

// Create a reusable card component to reduce duplication
const MetricCard = ({
  item,
  index,
  maxItems,
}: {
  item: ImpactIndicator;
  index: number;
  maxItems: number;
}) => (
  <Card className="rounded-lg bg-white dark:bg-zinc-800 flex-1">
    <div className="flex justify-between items-start w-full">
      <div className="flex flex-row gap-2 justify-between w-full max-md:flex-wrap max-md:gap-1">
        <div className="flex flex-col gap-0">
          <p className="text-slate-600 dark:text-slate-200 text-sm font-semibold">
            Metric {index + 1} of {maxItems}
          </p>
          <div className="font-bold text-lg text-black dark:text-white">
            {item.indicatorName}
          </div>
          <div className="flex flex-row gap-2 text-sm">
            <span className="text-[#079455] dark:text-[#079455] text-base">
              Funded Amount
            </span>
            <span className="text-[#079455] dark:text-[#079455] font-bold text-base">
              {item.amount ? fundedAmountFormatter(item.amount) : null}
            </span>
          </div>
        </div>

        <div className="flex flex-row gap-2 flex-wrap items-center">
          <p className="text-sm text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3">
            {item.grantTitle}
          </p>

          <Tooltip.Provider>
            <Tooltip.Root delayDuration={0}>
              <Tooltip.Trigger asChild>
                <p className="text-sm text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3 truncate max-w-[200px]">
                  {item.projectTitle}
                </p>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="text-sm z-50 text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3 truncate"
                  sideOffset={5}
                  side="top"
                >
                  <p className="text-sm text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3 truncate">
                    {item.projectTitle}
                  </p>
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      </div>
    </div>
    <AreaChart
      data={prepareChartData(
        item.datapoints.map((datapoint) => datapoint.value),
        item.datapoints.map(
          (datapoint) => datapoint.outputTimestamp || new Date().toISOString()
        ),
        item.indicatorName,
        item.datapoints
          ?.map((datapoint) => datapoint.running)
          .filter((val): val is number => val !== undefined)
      )}
      index={"date"}
      categories={[item.indicatorName, "Cumulative"]}
      colors={["blue", "green"]}
      valueFormatter={(value) => `${value}`}
      yAxisWidth={40}
      enableLegendSlider
      noDataText="Awaiting grantees to submit values"
    />
  </Card>
);

const SegmentCard = ({
  segmentsByType,
}: {
  segmentsByType: ProgramImpactSegment[];
}) => {
  const [selectedSegment, setSelectedSegment] =
    useState<ProgramImpactSegment | null>(segmentsByType[0]);
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
      <div className="px-6 pb-6 flex flex-col gap-y-4">
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
                  key={`${item.categoryId}-${item.impactSegmentId}-${item.impactSegmentType}-${item.impactIndicatorId}-${item.indicatorName}-${item.projectUID}`}
                  isSnapPoint={isSnapPoint}
                >
                  <MetricCard
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

export const EmptySegment = ({ type }: { type: "output" | "outcome" }) => {
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
            No {type}s have been defined for projects funded within the
            Community Category
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
        <EmptySegment type="output" />
      ) : (
        <div
          className={
            Object.entries(outputsById).length === 0
              ? "hidden"
              : "flex flex-col w-full"
          }
        >
          <SegmentCard segmentsByType={outputsById} />
        </div>
      )}

      {/* Outcomes Column */}
      {Object.entries(outcomesById).length === 0 ? (
        <EmptySegment type="outcome" />
      ) : (
        <div className="flex flex-col w-full">
          {outcomesById.length ? (
            <SegmentCard segmentsByType={outcomesById} />
          ) : null}
        </div>
      )}
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

  const uniqueProjects = category.impacts
    .flatMap((item) => item.indicators)
    .filter(
      (output, index, self) =>
        self.findIndex((t) => t.projectUID === output.projectUID) === index
    );

  // // Group outputs and outcomes by their names

  // // Sort function to get the most recent datapoint timestamp
  // const getLatestDatapointTimestamp = (item: ProgramImpactSegment) => {
  //   if (!item.datapoints.length) return 0;
  //   return Math.max(
  //     ...item.datapoints.map((dp) =>
  //       dp.outputTimestamp ? new Date(dp.outputTimestamp).getTime() : 0
  //     )
  //   );
  // };

  // // Sort the items in each group by their latest datapoint
  // Object.keys(outputsById).forEach((key) => {
  //   outputsById[key].sort(
  //     (a, b) => getLatestDatapointTimestamp(b) - getLatestDatapointTimestamp(a)
  //   );
  // });

  // Object.keys(outcomesById).forEach((key) => {
  //   outcomesById[key].sort(
  //     (a, b) => getLatestDatapointTimestamp(b) - getLatestDatapointTimestamp(a)
  //   );
  // });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-3 items-center">
        <h2 className="text-2xl leading-6 font-bold text-black dark:text-white">
          {category.categoryName}
        </h2>
        {!projectSelected ? (
          <p className="text-lg leading-6 text-gray-500 dark:text-zinc-200 font-medium">
            {uniqueProjects.length}{" "}
            {pluralize("project", uniqueProjects.length)}
          </p>
        ) : null}
      </div>
      {category.impacts.length ? (
        <CategoryBlocks category={category} />
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
