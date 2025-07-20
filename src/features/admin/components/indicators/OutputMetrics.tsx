import { useEffect, useState } from "react";
import { Card, Title, AreaChart, Grid, Metric, Text } from "@tremor/react";
import axios from "axios";
import { envVars } from "@/config/env";
import { Field, Label, Radio, RadioGroup } from "@headlessui/react";
import { cn } from "@/utilities/tailwind";

type MetricDataPoint = {
  _id: {
    metric_name: string;
    year: number;
    month: number;
  };
  min_amount: number;
  max_amount: number;
  total_amount: number;
  avg_amount: number;
};

const metricNames = [
  "fulltime_developers",
  "parttime_developers",
  "active_developers",
  "ISSUE_OPENED",
  "RELEASE_PUBLISHED",
  "PULL_REQUEST_CLOSED",
  "CONTRACT_INVOCATION_SUCCESS_DAILY_COUNT",
  "ISSUE_CLOSED",
  "STARRED",
  "ISSUE_COMMENT",
  "ISSUE_REOPENED",
  "FORKED",
  "PULL_REQUEST_REVIEW_COMMENT",
  "PULL_REQUEST_MERGED",
  "CONTRACT_INVOCATION_DAILY_L2_GAS_USED",
  "COMMIT_CODE",
  "PULL_REQUEST_OPENED",
  "CONTRACT_INVOCATION_DAILY_COUNT",
  "PULL_REQUEST_REOPENED",
] as const;

type MetricName = (typeof metricNames)[number];

const formatMetricName = (name: string) => {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const OutputMetrics = ({ communitySlug }: { communitySlug: string }) => {
  const [selectedMetric, setSelectedMetric] =
    useState<MetricName>("active_developers");
  const [metricData, setMetricData] = useState<MetricDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetricData = async (metricName: MetricName) => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/communities/${communitySlug}/output-metrics/${metricName}`
      );
      setMetricData(response.data);
    } catch (error) {
      console.error("Error fetching metric data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricData(selectedMetric);
  }, [selectedMetric, communitySlug]);

  const chartData = metricData.map((point) => ({
    date: `${point._id.year}-${String(point._id.month).padStart(2, "0")}`,
    "Daily Average": point.avg_amount,
    "Daily Maximum": point.max_amount,
    "Daily Minimum": point.min_amount,
  }));

  const chartDataTotal = metricData.map((point) => ({
    date: `${point._id.year}-${String(point._id.month).padStart(2, "0")}`,
    "Daily Total": point.total_amount,
  }));

  // Calculate overall statistics
  const overallStats = metricData.reduce(
    (acc, curr) => ({
      maxValue: Math.max(acc.maxValue, curr.max_amount),
      minValue: Math.min(acc.minValue, curr.min_amount),
      avgValue: acc.avgValue + curr.avg_amount,
      totalDays: acc.totalDays + 1,
    }),
    { maxValue: -Infinity, minValue: Infinity, avgValue: 0, totalDays: 0 }
  );

  return (
    <div className="space-y-6">
      <Title>Output Metrics Analysis</Title>

      <div className="grid grid-cols-12 gap-6">
        {/* Left sidebar with radio buttons */}
        <div className="col-span-3">
          <Card className="h-fit">
            <Text className="mb-4 font-medium">Select Metric</Text>
            <RadioGroup
              value={selectedMetric}
              onChange={(value) => setSelectedMetric(value as MetricName)}
              className="space-y-2"
            >
              {metricNames.map((metric) => (
                <Field
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  className={cn(
                    selectedMetric === metric
                      ? "bg-[#eef4ff] dark:bg-zinc-800 dark:text-primary-300 text-[#155eef]"
                      : "text-gray-700 hover:text-primary-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700",
                    "flex items-center rounded-md text-sm leading-6 font-semibold w-full py-1 hover:cursor-pointer px-2"
                  )}
                >
                  <Radio
                    value={metric}
                    className="group flex size-4 items-center justify-center rounded-full border bg-white data-[checked]:bg-blue-400"
                  >
                    <span className="invisible size-2 rounded-full bg-white group-data-[checked]:visible" />
                  </Radio>
                  <Label className="ml-2 hover:cursor-pointer">
                    {formatMetricName(metric)}
                  </Label>
                </Field>
              ))}
            </RadioGroup>
          </Card>
        </div>

        {/* Right side content */}
        <div className="col-span-9">
          {isLoading ? (
            <div className="h-72 flex items-center justify-center">
              <Text>Loading data...</Text>
            </div>
          ) : (
            <div className="space-y-6">
              <Grid numItems={2} numItemsLg={4} className="gap-6">
                <Card>
                  <Text>Overall Maximum</Text>
                  <Metric>{overallStats.maxValue.toLocaleString()}</Metric>
                </Card>
                <Card>
                  <Text>Overall Minimum</Text>
                  <Metric>{overallStats.minValue.toLocaleString()}</Metric>
                </Card>
                <Card>
                  <Text>Average</Text>
                  <Metric>
                    {(
                      overallStats.avgValue / overallStats.totalDays
                    ).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </Metric>
                </Card>
                <Card>
                  <Text>Days Tracked</Text>
                  <Metric>{overallStats.totalDays}</Metric>
                </Card>
              </Grid>

              <Card>
                <Title>
                  {formatMetricName(selectedMetric)} - Community Wide Total
                </Title>
                <AreaChart
                  className="h-72 mt-4"
                  data={chartDataTotal}
                  index="date"
                  categories={["Daily Total"]}
                  colors={["yellow"]}
                  valueFormatter={(value) => value.toLocaleString()}
                  showLegend
                  showGridLines
                  showAnimation
                />
              </Card>

              <Card>
                <Title>
                  {formatMetricName(selectedMetric)} - Project Wise Avg, Max,
                  Min
                </Title>
                <AreaChart
                  className="h-72 mt-4"
                  data={chartData}
                  index="date"
                  categories={[
                    "Daily Average",
                    "Daily Maximum",
                    "Daily Minimum",
                  ]}
                  colors={["green", "red", "blue"]}
                  valueFormatter={(value) => value.toLocaleString()}
                  showLegend
                  showGridLines
                  showAnimation
                />
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutputMetrics;
