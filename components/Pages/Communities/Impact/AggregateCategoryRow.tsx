"use client";
import { Carousel, CarouselItem } from "@/components/SnapCarousel";
import {
    ImpactAggregateData,
    ImpactAggregateOutput,
} from "@/types/programs";
import { AreaChart, Card } from "@tremor/react";
import Image from "next/image";
import pluralize from "pluralize";
import { formatDate } from "@/utilities/formatDate";


export const prepareChartData = (
    timestamps: string[],
    avg_values: number[],
    total_values: number[],
    min_values: number[],
    max_values: number[]
): { date: string;[key: string]: number | string }[] => {
    const abacaxi = timestamps
        .map((timestamp, index) => {
            return {
                date: formatDate(new Date(timestamp), true),
                'Avg': Number(avg_values[index]) || 0,
                'Total': Number(total_values[index]) || 0,
                'Min': Number(min_values[index]) || 0,
                'Max': Number(max_values[index]) || 0,
            };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return abacaxi;
};


// Create a reusable card component to reduce duplication
const MetricCard = ({ item }: { item: ImpactAggregateOutput }) => (
    <Card className="rounded-lg bg-white dark:bg-zinc-800 flex-1">
        <div className="flex justify-between items-start w-full">
            <div className="flex flex-row gap-2 justify-between w-full max-md:flex-wrap max-md:gap-1">
                <div className="flex flex-col gap-0">
                    <div className="font-bold text-lg text-black dark:text-white">
                        {item.name}
                    </div>
                </div>
                <div className="flex flex-row gap-2 flex-wrap items-center">
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
                item.datapoints.map(
                    (datapoint) => datapoint.outputTimestamp || new Date().toISOString()
                ),
                item.datapoints.map((datapoint) => datapoint.avg_value).filter((val): val is number => val !== undefined),
                item.datapoints.map((datapoint) => datapoint.total_value).filter((val): val is number => val !== undefined),
                item.datapoints.map((datapoint) => datapoint.min_value).filter((val): val is number => val !== undefined),
                item.datapoints.map((datapoint) => datapoint.max_value).filter((val): val is number => val !== undefined),
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

export const AggregateCategoryRow = ({
    program,
}: {
    program: ImpactAggregateData;
}) => {
    // Group outputs and outcomes by their names
    const outputsById = program.outputs
        .filter((output) => output.type === "output")
        .reduce((acc, curr) => {
            const output = curr.outputId + curr.categoryId;
            if (!acc[output]) {
                acc[output] = [];
            }
            acc[output].push(curr);
            return acc;
        }, {} as Record<string, typeof program.outputs>);

    const outcomesById = program.outputs
        .filter((output) => output.type === "outcome")
        .reduce((acc, curr) => {
            const output = curr.outputId + curr.categoryId;
            if (!acc[output]) {
                acc[output] = [];
            }
            acc[output].push(curr);
            return acc;
        }, {} as Record<string, typeof program.outputs>);

    // Sort function to get the most recent datapoint timestamp
    const getLatestDatapointTimestamp = (item: ImpactAggregateOutput) => {
        if (!item.datapoints.length) return 0;
        return Math.max(
            ...item.datapoints.map((dp) =>
                dp.outputTimestamp ? new Date(dp.outputTimestamp).getTime() : 0
            )
        );
    };

    // Sort the items in each group by their latest datapoint
    Object.keys(outputsById).forEach((key) => {
        outputsById[key].sort(
            (a, b) => getLatestDatapointTimestamp(b) - getLatestDatapointTimestamp(a)
        );
    });

    Object.keys(outcomesById).forEach((key) => {
        outcomesById[key].sort(
            (a, b) => getLatestDatapointTimestamp(b) - getLatestDatapointTimestamp(a)
        );
    });

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-row gap-3 items-center">
                <h2 className="text-2xl leading-6 font-bold text-black dark:text-white">
                    {program.categoryName}
                </h2>
                <p className="text-lg leading-6 text-gray-500 dark:text-zinc-200 font-medium">
                    {program.outputs.length}{" "}
                    {pluralize("project", program.outputs.length)}
                </p>
            </div>
            {program.outputs.length ? (
                <div className={`${Object.entries(outputsById).length == 0 ||
                    Object.entries(outcomesById).length == 0
                    ? "flex justify-between items-center"
                    : "grid grid-cols-2 gap-6 w-full"} max-md:flex max-md:flex-col`}>
                    {/* Outputs Column */}
                    <div
                        className={`${Object.entries(outcomesById).length == 0
                            ? "grid grid-cols-2 gap-6 w-full"
                            : "flex flex-col"
                            }`}
                    >
                        {Object.entries(outputsById).map(([name, items], index) => (
                            <Carousel
                                key={`output-${name}-${index}`}
                                items={items}
                                renderItem={({ item, isSnapPoint }) => (
                                    <CarouselItem
                                        key={`${item.outputId}-${item.categoryId}`}
                                        isSnapPoint={isSnapPoint}
                                    >
                                        <MetricCard item={item} />
                                    </CarouselItem>
                                )}
                            />
                        ))}
                    </div>

                    {/* Outcomes Column */}
                    <div className={`${Object.entries(outputsById).length == 0
                        ? "grid grid-cols-2 gap-6 w-full"
                        : "flex flex-col"
                        }`}>
                        {Object.entries(outcomesById).map(([name, items], index) => (
                            <Carousel
                                key={`outcome-${name}-${index}`}
                                items={items}
                                renderItem={({ item, isSnapPoint }) => (
                                    <CarouselItem
                                        key={`${item.outputId}-${item.categoryId}`}
                                        isSnapPoint={isSnapPoint}
                                    >
                                        <MetricCard item={item} />
                                    </CarouselItem>
                                )}
                            />
                        ))}
                    </div>
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
