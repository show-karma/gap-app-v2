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
import { prepareChartData } from "../../Admin/ProgramImpact";

// Create a reusable card component to reduce duplication
const MetricCard = ({ item }: { item: ImpactIndicator }) => (
  <Card className="rounded-lg bg-white dark:bg-zinc-800 flex-1">
    <div className="flex justify-between items-start w-full">
      <div className="flex flex-row gap-2 justify-between w-full max-md:flex-wrap max-md:gap-1">
        <div className="flex flex-col gap-0">
          <div className="font-bold text-lg text-black dark:text-white">
            {item.indicatorName}
          </div>
          <div className="flex flex-row gap-2 text-sm">
            <span className="text-[#079455] dark:text-[#079455] text-base">
              Funded Amount
            </span>
            <span className="text-[#079455] dark:text-[#079455] font-bold text-base">
              {item.amount ? item.amount : null}
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
      categories={[item.indicatorName, "Running"]}
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
    <div className={"flex flex-col w-full"}>
      <div className="flex flex-row gap-2 flex-wrap">
        {orderedSegments.map((item, index) => (
          <Button
            className={cn(
              "px-2 py-2 rounded hover:opacity-80 hover:bg-white dark:hover:opacity-80 dark:hover:bg-zinc-800 font-normal bg-white dark:bg-zinc-800 text-sm text-black border border-gray-300 dark:border-zinc-700 dark:text-white",
              selectedSegment?.impactSegmentId === item.impactSegmentId
                ? "bg-zinc-800 dark:bg-zinc-600 text-white dark:text-white border border-zinc-800 dark:border-zinc-600 hover:bg-zinc-800 dark:hover:bg-zinc-600"
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
              key={`${item.categoryId}-${item.impactSegmentId}-${item.impactSegmentType}-${item.impactIndicatorId}-${item.indicatorName}-${item.projectUID}`}
              isSnapPoint={isSnapPoint}
            >
              <MetricCard item={item} />
            </CarouselItem>
          )}
        />
      ) : null}
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
      <div
        className={
          Object.entries(outputsById).length === 0
            ? "hidden"
            : "flex flex-col w-full"
        }
      >
        <SegmentCard segmentsByType={outputsById} />
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
          <SegmentCard segmentsByType={outcomesById} />
        ) : null}
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
