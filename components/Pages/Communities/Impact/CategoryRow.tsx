import { Carousel, CarouselItem } from "@/components/SnapCarousel";
import { ProgramImpactDataResponse } from "@/types/programs";
import { AreaChart, Card, Title } from "@tremor/react";
import Image from "next/image";
import pluralize from "pluralize";
import { prepareChartData } from "../../Admin/ProgramImpact";

export const CategoryRow = ({
  program,
}: {
  program: ProgramImpactDataResponse;
}) => {
  const uniqueProjects = program.outputs.filter(
    (output, index, self) =>
      self.findIndex((t) => t.projectUID === output.projectUID) === index
  );
  const allOutputs = program.outputs;
  const uniqueClone = [...allOutputs].map((item) => ({
    ...item,
    type: "outcome" as const,
  }));
  const outputs = program.outputs;
  const outcomes = program.outputs;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-3 items-center">
        <h2 className="text-2xl leading-6 font-bold text-black dark:text-white">
          {program.categoryName}
        </h2>
        <p className="text-lg leading-6 text-gray-500 dark:text-zinc-200 font-medium">
          {uniqueProjects.length} {pluralize("project", uniqueProjects.length)}
        </p>
      </div>
      {program.outputs.length ? (
        <div className="grid grid-cols-2 gap-6 max-md:flex max-md:flex-col">
          <Carousel
            items={outputs}
            renderItem={({ item, isSnapPoint }) => (
              <CarouselItem key={item.outputId} isSnapPoint={isSnapPoint}>
                <Card
                  key={`${item.outputId}-${item.lastUpdated}`}
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
                            {item.amount}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-row gap-2 flex-wrap items-center">
                        <p className="text-sm text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3">
                          {item.grantTitle}
                        </p>
                        <p className="text-sm text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3">
                          {item.projectTitle}
                        </p>
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
                    data={prepareChartData(item.value, item.outputTimestamp)}
                    index={"date"}
                    categories={["value"]}
                    colors={["blue"]}
                    valueFormatter={(value) => `${value}`}
                    yAxisWidth={40}
                  />
                </Card>
              </CarouselItem>
            )}
          />
          <Carousel
            items={outcomes}
            renderItem={({ item, isSnapPoint }) => (
              <CarouselItem key={item.outputId} isSnapPoint={isSnapPoint}>
                <Card
                  key={`${item.outputId}-${item.lastUpdated}`}
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
                            {item.amount}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-row gap-2 flex-wrap items-center">
                        <p className="text-sm text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3">
                          {item.grantTitle}
                        </p>
                        <p className="text-sm text-[#404968] font-semibold dark:text-gray-400 bg-[#F8F9FC] dark:bg-zinc-700 rounded-2xl py-1 px-3">
                          {item.projectTitle}
                        </p>
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
                    data={prepareChartData(item.value, item.outputTimestamp)}
                    index={"date"}
                    categories={["value"]}
                    colors={["blue"]}
                    valueFormatter={(value) => `${value}`}
                    yAxisWidth={40}
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
            There are no outputs being tracked for this category of applications
          </p>
        </div>
      )}
    </div>
  );
};
