"use client";

import { AreaChart, BarChart, Card, Title } from "@tremor/react";
import { useMemo, useState } from "react";
import type { PeriodDatapoint } from "@/types/indicator";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import {
  getChainName,
  hasMonthlyData,
  hasPeriodBasedData,
  parseBreakdown,
  rollingPeriodLabels,
  rollingPeriodOrder,
} from "@/utilities/indicator";
import { cn } from "@/utilities/tailwind";

interface PeriodComparisonSectionProps {
  datapoints: PeriodDatapoint[];
  indicatorName: string;
  unitOfMeasure?: string;
}

export { hasPeriodBasedData, hasMonthlyData };

/**
 * Dynamic chart component for period-based indicators (e.g., Unique users)
 * Shows:
 * - Period comparison chart (30d, 90d, 180d, 1y)
 * - Monthly historical trend
 * - Chain breakdown with filter
 */
export const PeriodComparisonSection = ({
  datapoints,
  indicatorName,
  unitOfMeasure,
}: PeriodComparisonSectionProps) => {
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [showMonthlyTrend, setShowMonthlyTrend] = useState(false);

  // Separate period-based and monthly datapoints
  const { periodDatapoints, monthlyDatapoints, availableChains } = useMemo(() => {
    const periodDps: PeriodDatapoint[] = [];
    const monthlyDps: PeriodDatapoint[] = [];
    const chains = new Set<string>();

    for (const dp of datapoints) {
      // Extract chains from breakdown
      const breakdown = parseBreakdown(dp.breakdown);
      for (const chainId of Object.keys(breakdown)) {
        chains.add(chainId);
      }

      if (dp.period && rollingPeriodOrder.includes(dp.period)) {
        periodDps.push(dp);
      } else if (dp.period === "monthly") {
        monthlyDps.push(dp);
      }
    }

    return {
      periodDatapoints: periodDps,
      monthlyDatapoints: monthlyDps.sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      ),
      availableChains: Array.from(chains).sort((a, b) =>
        getChainName(a).localeCompare(getChainName(b))
      ),
    };
  }, [datapoints]);

  // Period comparison data for bar chart
  const periodComparisonData = useMemo(() => {
    // Group by period and get the latest datapoint for each
    const latestByPeriod = new Map<string, PeriodDatapoint>();
    for (const dp of periodDatapoints) {
      if (!dp.period) continue;
      const existing = latestByPeriod.get(dp.period);
      if (!existing || new Date(dp.endDate) > new Date(existing.endDate)) {
        latestByPeriod.set(dp.period, dp);
      }
    }

    return rollingPeriodOrder
      .filter((period) => latestByPeriod.has(period))
      .map((period) => {
        const dp = latestByPeriod.get(period)!;
        let value: number;

        if (selectedChain !== "all") {
          const breakdown = parseBreakdown(dp.breakdown);
          value = breakdown[selectedChain] || 0;
        } else {
          value = typeof dp.value === "number" ? dp.value : parseFloat(dp.value) || 0;
        }

        return {
          period: rollingPeriodLabels[period] || period,
          [indicatorName]: value,
          value,
        };
      });
  }, [periodDatapoints, selectedChain, indicatorName]);

  // Monthly trend data for area chart
  const monthlyTrendData = useMemo(() => {
    return monthlyDatapoints.map((dp) => {
      let value: number;

      if (selectedChain !== "all") {
        const breakdown = parseBreakdown(dp.breakdown);
        value = breakdown[selectedChain] || 0;
      } else {
        value = typeof dp.value === "number" ? dp.value : parseFloat(dp.value) || 0;
      }

      return {
        date: formatDate(new Date(dp.startDate), "UTC"),
        [indicatorName]: value,
        value,
      };
    });
  }, [monthlyDatapoints, selectedChain, indicatorName]);

  // Period breakdown table data
  const tableData = useMemo(() => {
    // Group by period and get the latest datapoint for each
    const latestByPeriod = new Map<string, PeriodDatapoint>();
    for (const dp of periodDatapoints) {
      if (!dp.period) continue;
      const existing = latestByPeriod.get(dp.period);
      if (!existing || new Date(dp.endDate) > new Date(existing.endDate)) {
        latestByPeriod.set(dp.period, dp);
      }
    }

    return rollingPeriodOrder
      .filter((period) => latestByPeriod.has(period))
      .map((period) => {
        const dp = latestByPeriod.get(period)!;
        let totalValue: number;
        const breakdown = parseBreakdown(dp.breakdown);

        if (selectedChain !== "all") {
          totalValue = breakdown[selectedChain] || 0;
        } else {
          totalValue = typeof dp.value === "number" ? dp.value : parseFloat(dp.value) || 0;
        }

        return {
          period,
          label: rollingPeriodLabels[period] || period,
          value: totalValue,
          breakdown,
          endDate: dp.endDate,
        };
      });
  }, [periodDatapoints, selectedChain]);

  // Don't render if no period-based data
  if (periodComparisonData.length === 0) {
    return null;
  }

  const hasChainFilter = availableChains.length > 1;
  const hasMonthly = monthlyDatapoints.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Period Comparison Section */}
      <div className="flex flex-row gap-4 max-md:flex-col-reverse">
        {/* Chart - Left side */}
        <div className="flex-1">
          <Card className="bg-white dark:bg-zinc-800 rounded h-full">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <Title className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                {showMonthlyTrend ? "Monthly Trend" : "Period Comparison"}
                {selectedChain !== "all" && (
                  <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                    ({getChainName(selectedChain)})
                  </span>
                )}
              </Title>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Chain filter */}
                {hasChainFilter && (
                  <select
                    value={selectedChain}
                    onChange={(e) => setSelectedChain(e.target.value)}
                    className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-zinc-700 border-0 rounded-md text-gray-700 dark:text-zinc-300 focus:ring-2 focus:ring-blue-500 min-w-[100px]"
                  >
                    <option value="all">All Chains</option>
                    {availableChains.map((chainId) => (
                      <option key={chainId} value={chainId}>
                        {getChainName(chainId)}
                      </option>
                    ))}
                  </select>
                )}
                {/* View toggle */}
                {hasMonthly && (
                  <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-zinc-700 rounded-md">
                    <button
                      onClick={() => setShowMonthlyTrend(false)}
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded transition-all",
                        !showMonthlyTrend
                          ? "bg-white dark:bg-zinc-600 text-gray-900 dark:text-zinc-100 shadow-sm"
                          : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
                      )}
                    >
                      Periods
                    </button>
                    <button
                      onClick={() => setShowMonthlyTrend(true)}
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded transition-all",
                        showMonthlyTrend
                          ? "bg-white dark:bg-zinc-600 text-gray-900 dark:text-zinc-100 shadow-sm"
                          : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
                      )}
                    >
                      Monthly
                    </button>
                  </div>
                )}
              </div>
            </div>

            {showMonthlyTrend ? (
              <AreaChart
                className="h-52"
                data={monthlyTrendData}
                index="date"
                categories={[indicatorName]}
                colors={["blue"]}
                valueFormatter={(value) => formatCurrency(value)}
                showLegend={false}
                noDataText="No monthly data available"
              />
            ) : (
              <BarChart
                className="h-52"
                data={periodComparisonData}
                index="period"
                categories={[indicatorName]}
                colors={["blue"]}
                valueFormatter={(value) => formatCurrency(value)}
                showLegend={false}
                noDataText="No period data available"
              />
            )}
          </Card>
        </div>

        {/* Breakdown Table - Right side */}
        <div className="flex-1">
          <Card className="bg-white dark:bg-zinc-800 rounded h-full">
            <Title className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-4">
              Period Breakdown
            </Title>
            <div className="overflow-y-auto max-h-52 rounded border border-gray-200 dark:border-zinc-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
                <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400">
                      Period
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-zinc-400">
                      {unitOfMeasure || "Value"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {tableData.map((item, idx) => (
                    <tr
                      key={item.period}
                      className={cn(
                        "transition-colors",
                        idx === 0
                          ? "bg-blue-50/50 dark:bg-blue-900/10"
                          : "hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                      )}
                    >
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-zinc-300">
                        <div className="flex flex-col">
                          <span>{item.label}</span>
                          <span className="text-xs text-gray-400 dark:text-zinc-500">
                            as of {formatDate(new Date(item.endDate), "UTC")}
                          </span>
                        </div>
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-sm font-semibold tabular-nums text-right",
                          idx === 0
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-900 dark:text-zinc-100"
                        )}
                      >
                        {formatCurrency(item.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Chain Breakdown (if showing all chains) */}
      {selectedChain === "all" &&
        tableData.length > 0 &&
        tableData[0].breakdown &&
        Object.keys(tableData[0].breakdown).length > 1 && (
          <Card className="bg-white dark:bg-zinc-800 rounded">
            <Title className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-4">
              Chain Breakdown (30 Days)
            </Title>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(tableData[0].breakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([chainId, value]) => (
                  <div key={chainId} className="p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-zinc-400 mb-1">
                      {getChainName(chainId)}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-zinc-100 tabular-nums">
                      {formatCurrency(value)}
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}
    </div>
  );
};
