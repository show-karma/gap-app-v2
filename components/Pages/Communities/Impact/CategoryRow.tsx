"use client";
import { Carousel, CarouselItem } from "@/components/SnapCarousel";
import { ProgramImpactDataResponse } from "@/types/programs";
import formatCurrency from "@/utilities/formatCurrency";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AreaChart, Card, Title } from "@tremor/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import pluralize from "pluralize";
import { prepareChartData } from "../../Admin/ProgramImpact";

export const CategoryRow = ({
  program,
}: {
  program: ProgramImpactDataResponse;
}) => {
  const searchParams = useSearchParams();
  const projectSelected = searchParams.get("projectId");
  const uniqueProjects = program.outputs.filter(
    (output, index, self) =>
      self.findIndex((t) => t.projectUID === output.projectUID) === index
  );
  const outputs = program.outputs
    .filter((output) => output.type === "output")
    .sort((a, b) => b.datapoints.length - a.datapoints.length);
  const outcomes = program.outputs
    .filter((output) => output.type === "outcome")
    .sort((a, b) => b.datapoints.length - a.datapoints.length);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-3 items-center">
        <h2 className="text-2xl leading-6 font-bold text-black dark:text-white">
          {program.categoryName}
        </h2>
        {!projectSelected ? (
          <p className="text-lg leading-6 text-gray-500 dark:text-zinc-200 font-medium">
            {uniqueProjects.length}{" "}
            {pluralize("project", uniqueProjects.length)}
          </p>
        ) : null}
      </div>
      {program.outputs.length ? (
        <div className="grid grid-cols-2 gap-6 max-md:flex max-md:flex-col">
          {outputs.length > 0 && (
            <Carousel
              items={outputs}
              renderItem={({ item, isSnapPoint }) => (
                <CarouselItem
                  key={`${item.outputId}-${item.lastUpdated}-${item.projectUID}`}
                  isSnapPoint={isSnapPoint}
                >
                  <Card
                    key={`${item.outputId}-${item.lastUpdated}-${item.projectUID}`}
                    className="rounded-lg bg-white dark:bg-zinc-800 flex-1"
                  >
                    <div className="flex justify-between items-start w-full">
                      <div className="flex flex-row gap-2 justify-between w-full max-md:flex-wrap max-md:gap-1">
                        <div className="flex flex-col gap-0">
                          <div className="font-bold text-lg text-black dark:text-white">
                            {item.name}
                          </div>
                          <div className="flex flex-row gap-2 text-sm">
                            <span className="text-[#079455] dark:text-[#079455] text-base">
                              Funded Amount
                            </span>
                            <span className="text-[#079455] dark:text-[#079455] font-bold text-base">
                              {item.amount
                                ? formatCurrency(
                                    Number(
                                      item.amount.includes(" ")
                                        ? item.amount.split(" ")[0]
                                        : item.amount
                                    )
                                  )
                                : null}
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
                          {item.type === "outcome" ? (
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
                          (datapoint) =>
                            datapoint.outputTimestamp ||
                            new Date().toISOString()
                        ),
                        item.name
                      )}
                      index={"date"}
                      categories={[item.name]}
                      colors={["blue"]}
                      valueFormatter={(value) => `${value}`}
                      yAxisWidth={40}
                      noDataText="Awaiting grantees to submit values"
                    />
                  </Card>
                </CarouselItem>
              )}
            />
          )}
          <Carousel
            items={outcomes}
            renderItem={({ item, isSnapPoint }) => (
              <CarouselItem
                key={`${item.outputId}-${item.lastUpdated}-${item.projectUID}`}
                isSnapPoint={isSnapPoint}
              >
                <Card
                  key={`${item.outputId}-${item.lastUpdated}-${item.projectUID}`}
                  className="rounded-lg bg-white dark:bg-zinc-800 flex-1"
                >
                  <Title className="flex justify-between items-start w-full">
                    <div className="flex flex-row gap-2 justify-between w-full">
                      <div className="flex flex-col gap-0">
                        <div className="font-bold text-lg text-black dark:text-white">
                          {item.name}
                        </div>
                        <div className="flex flex-row gap-2 text-sm">
                          <span className="text-[#079455] dark:text-[#079455] text-base">
                            Funded Amount
                          </span>
                          <span className="text-[#079455] dark:text-[#079455] font-bold text-base">
                            {item.amount
                              ? formatCurrency(
                                  Number(
                                    item.amount.includes(" ")
                                      ? item.amount.split(" ")[0]
                                      : item.amount
                                  )
                                )
                              : null}
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
                        {item.type === "outcome" ? (
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
                  </Title>
                  <AreaChart
                    data={prepareChartData(
                      item.datapoints.map((datapoint) => datapoint.value),
                      item.datapoints.map(
                        (datapoint) =>
                          datapoint.outputTimestamp || new Date().toISOString()
                      ),
                      item.name
                    )}
                    index={"date"}
                    categories={[item.name]}
                    colors={["blue"]}
                    valueFormatter={(value) => `${value}`}
                    yAxisWidth={40}
                    noDataText="Awaiting grantees to submit values"
                  />
                </Card>
              </CarouselItem>
            )}
          />
        </div>
      ) : (
        <div
          className="flex flex-col justify-center items-center gap-8 rounded-xl px-12 py-6 min-h-[280px]"
          style={{
            border: "1px dashed #667085",
            background: "#F9FAFB",
          }}
        >
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
