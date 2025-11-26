import { BarChart, Card, Select, SelectItem, Title } from "@tremor/react";
import { useState } from "react";
import type { ProgramImpactDataResponse } from "@/types/programs";

const aggregateDataByCategory = (data: ProgramImpactDataResponse[]) => {
  // Group data by categories first
  const categoryGroups: { [key: string]: any[] } = {};
  const categoryAmounts: { [key: string]: number } = {};
  const indicatorMetrics: {
    [key: string]: {
      min: number;
      max: number;
      avg: number;
    };
  } = {};

  data.forEach((category) => {
    category.impacts.forEach((impact) => {
      impact.indicators?.forEach((indicator) => {
        if (!categoryGroups[category.categoryName]) {
          categoryGroups[category.categoryName] = [];
          categoryAmounts[category.categoryName] = 0;
        }

        // Sum up grant amounts for each category
        categoryAmounts[category.categoryName] += Number(
          indicator?.amount?.replace(/[^0-9]/g, "") || 0
        );

        const currentValue =
          indicator.datapoints.length > 0
            ? Number(indicator.datapoints[indicator.datapoints.length - 1].value)
            : 0;

        // Create project-specific entry
        categoryGroups[category.categoryName].push({
          projectName: indicator.projectTitle,
          name: indicator.indicatorName,
          segmentName: impact.impactSegmentName,
          segmentType: impact.impactSegmentType,
          value: currentValue,
          grantAmount: Number(indicator?.amount || 0),
          unit: indicator.indicatorUnitOfMeasure,
        });

        indicatorMetrics[indicator.indicatorName] = {
          min: Math.min(
            ...categoryGroups[category.categoryName]
              .filter((item) => item.name === indicator.indicatorName)
              .map((item) => Number(item.value) || 0)
          ),
          max: Math.max(
            ...categoryGroups[category.categoryName]
              .filter((item) => item.name === indicator.indicatorName)
              .map((item) => Number(item.value) || 0)
          ),
          avg:
            categoryGroups[category.categoryName]
              .filter((item) => item.name === indicator.indicatorName)
              .reduce((acc, item) => acc + (Number(item.value) || 0), 0) /
            categoryGroups[category.categoryName].filter(
              (item) => item.name === indicator.indicatorName
            ).length,
        };
      });
    });
  });

  return { categoryGroups, categoryAmounts, indicatorMetrics };
};

export const ProgramAnalytics = ({ data }: { data: ProgramImpactDataResponse[] }) => {
  const { categoryGroups, categoryAmounts, indicatorMetrics } = aggregateDataByCategory(data);
  const categories = Object.keys(categoryGroups);
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || "");

  // Format category amounts for chart
  const categoryAmountsData = Object.entries(categoryAmounts).map(([category, amount]) => ({
    category,
    amount,
  }));

  // Get unique segment names for the selected category
  const segments = selectedCategory
    ? Array.from(new Set(categoryGroups[selectedCategory].map((item) => item.segmentName)))
    : [];

  const [selectedSegment, setSelectedSegment] = useState<string>(segments[0] || "");

  // Get unique indicator names for the selected segment
  const indicatorNames =
    selectedCategory && selectedSegment
      ? Array.from(
          new Set(
            categoryGroups[selectedCategory]
              .filter((item) => item.segmentName === selectedSegment)
              .map((item) => item.name)
          )
        )
      : [];

  const [selectedIndicator, setSelectedIndicator] = useState<string>(indicatorNames[0] || "");

  // Prepare data for the selected indicator
  const chartData =
    selectedCategory && selectedSegment && selectedIndicator
      ? categoryGroups[selectedCategory]
          .filter((item) => item.segmentName === selectedSegment && item.name === selectedIndicator)
          .map((item) => ({
            projectName: item.projectName,
            value: item.value,
            unit: item.unit,
          }))
      : [];

  return (
    <div className="space-y-6 w-full max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <div className="flex flex-col gap-2 w-full">
          <label
            htmlFor="category-select"
            className="text-sm font-medium text-gray-700 dark:text-zinc-300"
          >
            Category
          </label>
          <Select
            id="category-select"
            className="w-full"
            value={selectedCategory}
            onValueChange={(value) => {
              setSelectedCategory(value);
              setSelectedSegment("");
              setSelectedIndicator("");
            }}
            placeholder="Select category"
          >
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <label
            htmlFor="segment-select"
            className="text-sm font-medium text-gray-700 dark:text-zinc-300"
          >
            Impact Segment
          </label>
          <Select
            id="segment-select"
            className="w-full"
            value={selectedSegment}
            onValueChange={(value) => {
              setSelectedSegment(value);
              setSelectedIndicator("");
            }}
            placeholder="Select impact segment"
          >
            {segments.map((segment) => (
              <SelectItem key={segment} value={segment}>
                {segment}
              </SelectItem>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <label
            htmlFor="indicator-select"
            className="text-sm font-medium text-gray-700 dark:text-zinc-300"
          >
            Impact Indicator
          </label>
          <Select
            id="indicator-select"
            className="w-full"
            value={selectedIndicator}
            onValueChange={setSelectedIndicator}
            placeholder="Select indicator"
          >
            {indicatorNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {selectedCategory && selectedSegment && selectedIndicator && (
          <Card>
            <Title>{`${selectedIndicator} by Project`}</Title>
            <p className="text-sm text-gray-500 mt-1">Unit: {chartData[0]?.unit || "N/A"}</p>
            <BarChart
              className="mt-4 h-72"
              data={chartData}
              index="projectName"
              categories={["value"]}
              colors={["blue"]}
              valueFormatter={(value) => value.toLocaleString()}
            />
          </Card>
        )}

        {/* Stats Grid showing individual project metrics */}
        <Card>
          <Title>Project Metrics</Title>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {chartData.map((metric) => (
              <div key={metric.projectName} className="p-4 rounded-lg bg-gray-50 dark:bg-zinc-800">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {metric.projectName}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {selectedIndicator}: {metric.value} {metric.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Grant Amounts by Category Chart */}
      <Card>
        <Title>Grant amount funded by Category</Title>
        <BarChart
          className="mt-4 h-72"
          data={categoryAmountsData}
          index="category"
          categories={["amount"]}
          colors={["green"]}
          valueFormatter={(value) => `$${value.toLocaleString()}`}
        />
      </Card>

      {/* Indicator Metrics Card */}
      {selectedIndicator && (
        <Card>
          <Title>Indicator Metrics Analysis</Title>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex flex-col items-center p-3 rounded-lg bg-gray-50 dark:bg-zinc-800">
              <span className="text-gray-500 dark:text-gray-400">Min</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {indicatorMetrics[selectedIndicator]?.min.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-gray-50 dark:bg-zinc-800">
              <span className="text-gray-500 dark:text-gray-400">Avg</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {indicatorMetrics[selectedIndicator]?.avg.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-gray-50 dark:bg-zinc-800">
              <span className="text-gray-500 dark:text-gray-400">Max</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {indicatorMetrics[selectedIndicator]?.max.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
