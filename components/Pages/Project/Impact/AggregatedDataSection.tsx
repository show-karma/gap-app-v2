"use client";

import { AreaChart, Card, Title } from "@tremor/react";
import { useMemo, useState } from "react";
import type { AggregatedDatapoint } from "@/types/impactMeasurement";
import type { RawDatapoint } from "@/types/indicator";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import {
  aggregatedPeriodLabels,
  aggregatedPeriodOrder,
  getChainName,
  parseBreakdown,
} from "@/utilities/indicator";
import { cn } from "@/utilities/tailwind";

interface AggregatedDataSectionProps {
  aggregatedData: Record<string, AggregatedDatapoint[]>;
  indicatorName: string;
  maxItems?: number;
  rawDatapoints?: RawDatapoint[];
}

/**
 * Combined chart + breakdown section for aggregated data
 * Matches the Historical Values layout
 */
export const AggregatedDataSection = ({
  aggregatedData,
  indicatorName,
  maxItems = 10,
  rawDatapoints = [],
}: AggregatedDataSectionProps) => {
  const periods = useMemo(() => {
    return Object.keys(aggregatedData).sort(
      (a, b) => aggregatedPeriodOrder.indexOf(a) - aggregatedPeriodOrder.indexOf(b)
    );
  }, [aggregatedData]);

  const [selectedPeriod, setSelectedPeriod] = useState(periods[0] || "monthly");
  const [selectedChain, setSelectedChain] = useState<string>("all");

  // Extract available chains from raw datapoints breakdown
  const availableChains = useMemo(() => {
    const chains = new Set<string>();
    for (const dp of rawDatapoints) {
      const breakdown = parseBreakdown(dp.breakdown);
      for (const chainId of Object.keys(breakdown)) {
        chains.add(chainId);
      }
    }
    return Array.from(chains).sort((a, b) => {
      const nameA = getChainName(a);
      const nameB = getChainName(b);
      return nameA.localeCompare(nameB);
    });
  }, [rawDatapoints]);

  const chartData = useMemo(() => {
    const datapoints = aggregatedData[selectedPeriod] || [];

    // If filtering by chain and we have raw data, recalculate from raw datapoints
    if (selectedChain !== "all" && rawDatapoints.length > 0) {
      // Group raw datapoints by period (weekly/monthly)
      const groupedData = new Map<string, number>();

      for (const dp of rawDatapoints) {
        const breakdown = parseBreakdown(dp.breakdown);
        const chainValue = breakdown[selectedChain] || 0;

        if (chainValue > 0) {
          const date = new Date(dp.startDate);
          let periodKey: string;

          if (selectedPeriod === "weekly") {
            // Group by week (start of week - Monday)
            const dayOfWeek = date.getUTCDay();
            const diff = date.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const weekStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
            periodKey = formatDate(weekStart, "UTC");
          } else if (selectedPeriod === "monthly") {
            // Group by month (first day of month)
            const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
            periodKey = formatDate(monthStart, "UTC");
          } else {
            // Default: use the date as-is
            periodKey = formatDate(date, "UTC");
          }

          groupedData.set(periodKey, (groupedData.get(periodKey) || 0) + chainValue);
        }
      }

      return Array.from(groupedData.entries())
        .map(([date, value]) => ({
          date,
          [indicatorName]: value,
          value,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // Default: use aggregated data (all chains)
    return datapoints
      .map((dp) => ({
        date: formatDate(new Date(dp.startDate), "UTC"),
        [indicatorName]: dp.totalValue,
        value: dp.totalValue,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [aggregatedData, selectedPeriod, indicatorName, selectedChain, rawDatapoints]);

  const tableData = useMemo(() => {
    return [...chartData].reverse();
  }, [chartData]);

  if (periods.length === 0 || chartData.length === 0) {
    return null;
  }

  const displayData = tableData.slice(0, maxItems);
  const hasMore = tableData.length > maxItems;
  const hasChainFilter = availableChains.length > 1;

  return (
    <div className="flex flex-row gap-4 max-md:flex-col-reverse">
      {/* Chart - Left side */}
      <div className="flex-1">
        <Card className="bg-white dark:bg-zinc-800 rounded h-full">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <Title className="text-sm font-medium text-gray-700 dark:text-zinc-300">
              Aggregated Values
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
                  aria-label="Filter aggregated data by blockchain network"
                  className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-zinc-700 border-0 rounded-md text-gray-700 dark:text-zinc-300 focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[100px]"
                >
                  <option value="all">All Chains</option>
                  {availableChains.map((chainId) => (
                    <option key={chainId} value={chainId}>
                      {getChainName(chainId)}
                    </option>
                  ))}
                </select>
              )}
              {/* Period selector */}
              {periods.length > 1 && (
                <fieldset
                  aria-label="Select aggregation period"
                  className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-700 rounded-md border-0 m-0 p-0.5"
                >
                  {periods.map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setSelectedPeriod(period)}
                      aria-pressed={selectedPeriod === period}
                      aria-label={`View ${aggregatedPeriodLabels[period] || period} aggregation`}
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                        selectedPeriod === period
                          ? "bg-white dark:bg-zinc-600 text-gray-900 dark:text-zinc-100 shadow-sm"
                          : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
                      )}
                    >
                      {aggregatedPeriodLabels[period] || period}
                    </button>
                  ))}
                </fieldset>
              )}
            </div>
          </div>
          <AreaChart
            className="h-52"
            data={chartData}
            index="date"
            categories={[indicatorName]}
            colors={["blue"]}
            valueFormatter={(value) => formatCurrency(value)}
            showLegend={false}
            noDataText="No aggregated data available"
          />
        </Card>
      </div>

      {/* Breakdown Table - Right side */}
      <div className="flex-1">
        <Card className="bg-white dark:bg-zinc-800 rounded h-full">
          <Title className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-4">
            Breakdown
          </Title>
          <div className="overflow-y-auto max-h-52 rounded border border-gray-200 dark:border-zinc-700">
            <table
              className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700"
              aria-label="Aggregated values breakdown by period"
            >
              <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400"
                  >
                    Period
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-zinc-400"
                  >
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {displayData.map((item, idx) => (
                  <tr
                    key={item.date}
                    className={cn(
                      "transition-colors",
                      idx === 0
                        ? "bg-blue-50/50 dark:bg-blue-900/10"
                        : "hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                    )}
                  >
                    <td className="px-3 py-2 text-sm text-gray-700 dark:text-zinc-300">
                      {item.date}
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
          {hasMore && (
            <p className="text-xs text-gray-400 dark:text-zinc-600 mt-2 text-center">
              Showing {maxItems} of {tableData.length} periods
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};
