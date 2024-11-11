import { useState } from "react";
import { Card, Title, BarChart, Select, SelectItem } from "@tremor/react";
import { ProgramImpactDataResponse } from "./ProgramImpact";

const aggregateDataByCategory = (data: ProgramImpactDataResponse[]) => {
    // Group data by categories first
    const categoryGroups: { [key: string]: any[] } = {};
    const categoryAmounts: { [key: string]: number } = {};
    const outputMetrics: {
        [key: string]: {
            min: number;
            max: number;
            avg: number;
        }
    } = {};

    data.forEach(category => {
        category.outputs.forEach(output => {
            if (!categoryGroups[output.categoryName]) {
                categoryGroups[output.categoryName] = [];
                categoryAmounts[output.categoryName] = 0;
            }

            // Sum up grant amounts for each category
            categoryAmounts[output.categoryName] += Number(output.amount || 0);

            // Create project-specific entry
            categoryGroups[output.categoryName].push({
                projectName: output.projectTitle,
                name: output.name,
                value: Number(output.value),
                grantAmount: Number(output.amount || 0),
            });

            outputMetrics[output.name] = {
                min: Math.min(...categoryGroups[output.categoryName].map(item => Number(item.value) || 0)),
                max: Math.max(...categoryGroups[output.categoryName].map(item => Number(item.value) || 0)),
                avg: categoryGroups[output.categoryName].reduce((acc, item) => acc + (Number(item.value) || 0), 0) / categoryGroups[output.categoryName].length
            };
        });
    });

    return { categoryGroups, categoryAmounts, outputMetrics };
};

export const ProgramAnalytics = ({ data }: { data: ProgramImpactDataResponse[] }) => {
    const { categoryGroups, categoryAmounts, outputMetrics } = aggregateDataByCategory(data);
    const categories = Object.keys(categoryGroups);
    const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || '');

    // Format category amounts for chart
    const categoryAmountsData = Object.entries(categoryAmounts).map(([category, amount]) => ({
        category,
        amount
    }));

    // Get unique output names for the selected category
    const outputNames = selectedCategory
        ? Array.from(new Set(categoryGroups[selectedCategory].map(item => item.name)))
        : [];

    const [selectedOutput, setSelectedOutput] = useState<string>(outputNames[0] || '');

    // Prepare data for the selected output
    const chartData = selectedCategory && selectedOutput
        ? categoryGroups[selectedCategory]
            .filter(item => item.name === selectedOutput)
            .map(item => ({
                projectName: item.projectName,
                value: item.value,
                unit: item.unit
            }))
        : [];

    return (
        <div className="space-y-6 w-full max-w-4xl">
            <div className="flex gap-4 items-center">
                <Select
                    className="max-w-xs"
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                    placeholder="Select category"
                >
                    {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                            {category}
                        </SelectItem>
                    ))}
                </Select>

                <Select
                    className="max-w-xs"
                    value={selectedOutput}
                    onValueChange={setSelectedOutput}
                    placeholder="Select output metric"
                >
                    {outputNames.map((name) => (
                        <SelectItem key={name} value={name}>
                            {name}
                        </SelectItem>
                    ))}
                </Select>
            </div>



            <div className="grid grid-cols-1 gap-6">
                {selectedCategory && selectedOutput && (
                    <Card>
                        <Title>{`${selectedOutput} by Project`}</Title>
                        <p className="text-sm text-gray-500 mt-1">
                            Unit: {chartData[0]?.unit || 'N/A'}
                        </p>
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
                                        {selectedOutput}: {metric.value.toLocaleString()} {metric.unit}
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


            {/* Output Metrics Card */}
            {selectedCategory && (
                <Card>
                    <Title>Output Metrics Analysis</Title>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {Object.entries(outputMetrics).map(([outputName, metrics]) => (
                            <div key={outputName} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-zinc-800">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {outputName}
                                </h3>
                                <div className="flex gap-4 text-sm">
                                    <div className="flex flex-col items-end">
                                        <span className="text-gray-500 dark:text-gray-400">Min</span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                            {metrics.min.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-gray-500 dark:text-gray-400">Avg</span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                            {metrics.avg.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-gray-500 dark:text-gray-400">Max</span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                            {metrics.max.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Keep the existing Dune iframe */}
            <div className="w-full h-full">
                <iframe className="w-full h-[400px]" src="https://dune.com/embeds/2355896/3859009/" />
            </div>
        </div>
    );
};