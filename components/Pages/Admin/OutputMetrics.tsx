import { useEffect, useState } from "react";
import { Card, Title, AreaChart, Select, SelectItem, Grid, Metric, Text } from "@tremor/react";
import axios from "axios";
import { envVars } from "@/utilities/enviromentVars";

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
    'fulltime_developers',
    'parttime_developers',
    'active_developers',
    'grants_received_usd',
    // 'FORKED',
    // 'STARRED',
    // 'COMMIT_CODE',
    // 'ISSUE_CLOSED',
    // 'ISSUE_OPENED',
    // 'ISSUE_COMMENT',
    // 'ISSUE_REOPENED',
    // 'RELEASE_PUBLISHED',
    // 'PULL_REQUEST_CLOSED',
    // 'PULL_REQUEST_MERGED',
    // 'PULL_REQUEST_OPENED',
    // 'PULL_REQUEST_REOPENED',
    // 'PULL_REQUEST_REVIEW_COMMENT',
    // 'CONTRACT_INVOCATION_DAILY_COUNT',
    // 'CONTRACT_INVOCATION_DAILY_L2_GAS_USED',
    // 'CONTRACT_INVOCATION_SUCCESS_DAILY_COUNT'
] as const;

type MetricName = typeof metricNames[number];

const formatMetricName = (name: string) => {
    return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

export const OutputMetrics = ({ communitySlug }: { communitySlug: string }) => {
    const [selectedMetric, setSelectedMetric] = useState<MetricName>('active_developers');
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
            console.error('Error fetching metric data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMetricData(selectedMetric);
    }, [selectedMetric, communitySlug]);

    // Process data for the area chart
    const chartAvgData = metricData.map(point => ({
        date: `${point._id.year}-${String(point._id.month).padStart(2, '0')}`,
        "Daily Average": point.avg_amount,
    }));

    const chartMaxData = metricData.map(point => ({
        date: `${point._id.year}-${String(point._id.month).padStart(2, '0')}`,
        "Daily Maximum": point.max_amount,
    }));

    const chartMinData = metricData.map(point => ({
        date: `${point._id.year}-${String(point._id.month).padStart(2, '0')}`,
        "Daily Minimum": point.min_amount,
    }));

    const chartTotalData = metricData.map(point => ({
        date: `${point._id.year}-${String(point._id.month).padStart(2, '0')}`,
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
            <div className="flex items-center justify-between">
                <Title>Output Metrics Analysis</Title>
                <Select
                    className="max-w-xs"
                    value={selectedMetric}
                    onValueChange={(value) => setSelectedMetric(value as MetricName)}
                >
                    {metricNames.map((metric) => (
                        <SelectItem key={metric} value={metric}>
                            {formatMetricName(metric)}
                        </SelectItem>
                    ))}
                </Select>
            </div>

            {isLoading ? (
                <div className="h-72 flex items-center justify-center">
                    <Text>Loading data...</Text>
                </div>
            ) : (
                <>
                    <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6">
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
                                {(overallStats.avgValue / overallStats.totalDays).toLocaleString(undefined, {
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
                        <Title>{formatMetricName(selectedMetric)} - Monthly Average</Title>
                        <AreaChart
                            className="h-72 mt-4"
                            data={chartAvgData}
                            index="date"
                            categories={["Daily Average"]}
                            colors={["blue"]}
                            valueFormatter={(value) => value.toLocaleString()}
                            showLegend
                            showGridLines
                            showAnimation
                        />
                    </Card>

                    <Card>
                        <Title>{formatMetricName(selectedMetric)} - Monthly Maximum</Title>
                        <AreaChart
                            className="h-72 mt-4"
                            data={chartMaxData}
                            index="date"
                            categories={["Daily Maximum"]}
                            colors={["green"]}
                            valueFormatter={(value) => value.toLocaleString()}
                            showLegend
                            showGridLines
                            showAnimation
                        />
                    </Card>

                    <Card>
                        <Title>{formatMetricName(selectedMetric)} - Monthly Minimum</Title>
                        <AreaChart
                            className="h-72 mt-4"
                            data={chartMinData}
                            index="date"
                            categories={["Daily Minimum"]}
                            colors={["red"]}
                            valueFormatter={(value) => value.toLocaleString()}
                            showLegend
                            showGridLines
                            showAnimation
                        />
                    </Card>

                    <Card>
                        <Title>{formatMetricName(selectedMetric)} - Daily Total</Title>
                        <AreaChart
                            className="h-72 mt-4"
                            data={chartTotalData}
                            index="date"
                            categories={["Daily Total"]}
                            colors={["purple"]}
                            valueFormatter={(value) => value.toLocaleString()}
                            showLegend
                            showGridLines
                            showAnimation
                        />
                    </Card>
                </>
            )}
        </div>
    );
};

export default OutputMetrics;
