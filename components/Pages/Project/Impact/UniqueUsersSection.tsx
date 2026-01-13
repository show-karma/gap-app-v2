"use client";

import { AreaChart, Card, DonutChart, Title } from "@tremor/react";
import { useMemo, useState } from "react";
import type { PeriodDatapoint } from "@/types/indicator";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import {
  getChainColor,
  getChainName,
  getLatestByPeriod,
  hasUniqueUsersData,
  parseBreakdown,
  rollingPeriodLabels,
  rollingPeriodOrder,
} from "@/utilities/indicator";
import { cn } from "@/utilities/tailwind";

interface UniqueUsersSectionProps {
  datapoints: PeriodDatapoint[];
  indicatorName: string;
}

export { hasUniqueUsersData };

/**
 * Beautiful dashboard for Unique Users indicator
 * Inspired by Apple Health / Screen Time design
 */
export const UniqueUsersSection = ({ datapoints, indicatorName }: UniqueUsersSectionProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30d");
  const [selectedChain, setSelectedChain] = useState<string>("all");

  // Separate rolling periods and monthly data
  const { rollingPeriods, monthlyData, availableChains } = useMemo(() => {
    const monthly: PeriodDatapoint[] = [];
    const chains = new Set<string>();

    for (const dp of datapoints) {
      const breakdown = parseBreakdown(dp.breakdown);
      for (const chainId of Object.keys(breakdown)) {
        if (breakdown[chainId] > 0) chains.add(chainId);
      }

      if (dp.period === "monthly") {
        monthly.push(dp);
      }
    }

    // Use shared utility to get latest by period, then convert Map to Record
    const latestByPeriodMap = getLatestByPeriod(datapoints);
    const rolling: Record<string, PeriodDatapoint> = {};
    for (const [period, dp] of latestByPeriodMap) {
      rolling[period] = dp;
    }

    return {
      rollingPeriods: rolling,
      monthlyData: monthly.sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      ),
      availableChains: Array.from(chains).sort((a, b) =>
        getChainName(a).localeCompare(getChainName(b))
      ),
    };
  }, [datapoints]);

  // Get value for a period (filtered by chain if selected)
  const getPeriodValue = (period: string): number => {
    const dp = rollingPeriods[period];
    if (!dp) return 0;

    if (selectedChain !== "all") {
      const breakdown = parseBreakdown(dp.breakdown);
      return breakdown[selectedChain] || 0;
    }
    return typeof dp.value === "number" ? dp.value : parseFloat(dp.value) || 0;
  };

  // Monthly chart data
  const monthlyChartData = useMemo(() => {
    return monthlyData.map((dp) => {
      let value: number;
      if (selectedChain !== "all") {
        const breakdown = parseBreakdown(dp.breakdown);
        value = breakdown[selectedChain] || 0;
      } else {
        value = typeof dp.value === "number" ? dp.value : parseFloat(dp.value) || 0;
      }

      const date = new Date(dp.startDate);
      return {
        month: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        [indicatorName]: value,
        value,
      };
    });
  }, [monthlyData, selectedChain, indicatorName]);

  // Chain breakdown for donut chart (using selected period)
  const chainBreakdownData = useMemo(() => {
    const dp = rollingPeriods[selectedPeriod];
    if (!dp) return [];

    const breakdown = parseBreakdown(dp.breakdown);
    return Object.entries(breakdown)
      .filter(([, value]) => value > 0)
      .map(([chainId, value]) => ({
        name: getChainName(chainId),
        value,
        color: getChainColor(chainId),
      }))
      .sort((a, b) => b.value - a.value);
  }, [rollingPeriods, selectedPeriod]);

  // Bar list data for chain comparison
  const chainBarData = useMemo(() => {
    return chainBreakdownData.map((item) => ({
      name: item.name,
      value: item.value,
      color: item.color,
    }));
  }, [chainBreakdownData]);

  if (Object.keys(rollingPeriods).length === 0) {
    return null;
  }

  const currentValue = getPeriodValue(selectedPeriod);
  const selectedDp = rollingPeriods[selectedPeriod];

  return (
    <div className="flex flex-col gap-4">
      {/* Hero Section - Period Cards */}
      <fieldset
        aria-label="Select time period for unique users data"
        className="grid grid-cols-2 md:grid-cols-4 gap-3 border-0 m-0 p-0"
      >
        {rollingPeriodOrder.map((period) => {
          const value = getPeriodValue(period);
          const isSelected = selectedPeriod === period;

          return (
            <button
              key={period}
              type="button"
              onClick={() => setSelectedPeriod(period)}
              aria-pressed={isSelected}
              aria-label={`${rollingPeriodLabels[period]}: ${formatCurrency(value)} unique users${isSelected ? " (selected)" : ""}`}
              className={cn(
                "p-4 rounded-xl text-left transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                isSelected
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-md"
                  : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-500 hover:shadow-sm cursor-pointer"
              )}
            >
              <div className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
                {rollingPeriodLabels[period]}
              </div>
              <div
                aria-hidden="true"
                className={cn(
                  "text-2xl md:text-3xl font-bold mt-1 tabular-nums",
                  isSelected
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-900 dark:text-zinc-100"
                )}
              >
                {formatCurrency(value)}
              </div>
              <div aria-hidden="true" className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
                unique users
              </div>
            </button>
          );
        })}
      </fieldset>

      {/* Chain Filter */}
      {availableChains.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span
            id="chain-filter-label"
            className="text-xs font-medium text-gray-500 dark:text-zinc-400"
          >
            Filter by chain:
          </span>
          <fieldset
            aria-labelledby="chain-filter-label"
            className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-700 rounded-lg border-0 m-0 p-0.5"
          >
            <button
              type="button"
              onClick={() => setSelectedChain("all")}
              aria-pressed={selectedChain === "all"}
              aria-label="Show data for all blockchain networks"
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                selectedChain === "all"
                  ? "bg-white dark:bg-zinc-600 text-gray-900 dark:text-zinc-100 shadow-sm"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
              )}
            >
              All Chains
            </button>
            {availableChains.map((chainId) => (
              <button
                key={chainId}
                type="button"
                onClick={() => setSelectedChain(chainId)}
                aria-pressed={selectedChain === chainId}
                aria-label={`Filter by ${getChainName(chainId)} network`}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                  selectedChain === chainId
                    ? "bg-white dark:bg-zinc-600 text-gray-900 dark:text-zinc-100 shadow-sm"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
                )}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  aria-hidden="true"
                  style={{ backgroundColor: getChainColor(chainId) }}
                />
                {getChainName(chainId)}
              </button>
            ))}
          </fieldset>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Trend Chart - Takes 2 columns */}
        {monthlyChartData.length > 0 && (
          <Card className="lg:col-span-2 bg-white dark:bg-zinc-800 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <Title className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                Monthly Trend
                {selectedChain !== "all" && (
                  <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                    ({getChainName(selectedChain)})
                  </span>
                )}
              </Title>
              {selectedDp && (
                <span className="text-xs text-gray-400 dark:text-zinc-500">
                  Last updated: {formatDate(new Date(selectedDp.endDate), "UTC")}
                </span>
              )}
            </div>
            <AreaChart
              className="h-56"
              data={monthlyChartData}
              index="month"
              categories={[indicatorName]}
              colors={["blue"]}
              valueFormatter={(value) => formatCurrency(value)}
              showLegend={false}
              showGridLines={false}
              curveType="monotone"
            />
          </Card>
        )}

        {/* Chain Distribution - Takes 1 column */}
        {chainBreakdownData.length > 1 && selectedChain === "all" && (
          <Card className="bg-white dark:bg-zinc-800 rounded-xl">
            <Title className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-4">
              Chain Distribution ({rollingPeriodLabels[selectedPeriod]})
            </Title>
            <DonutChart
              className="h-40"
              data={chainBreakdownData}
              category="value"
              index="name"
              colors={chainBreakdownData.map((d) => {
                // Map color hex to tremor color name
                const colorMap: Record<string, string> = {
                  "#627EEA": "indigo",
                  "#FF0420": "red",
                  "#8247E5": "violet",
                  "#1969FF": "blue",
                  "#0052FF": "blue",
                  "#28A0F0": "cyan",
                  "#FCFF52": "yellow",
                  "#E84142": "rose",
                  "#FFEEDA": "amber",
                  "#A1723A": "orange",
                };
                return colorMap[d.color] || "gray";
              })}
              valueFormatter={(value) => formatCurrency(value)}
              showLabel={true}
              label={formatCurrency(currentValue)}
            />
            <ul
              aria-label="Top chains by unique users"
              className="mt-4 space-y-2 list-none m-0 p-0"
            >
              {chainBarData.slice(0, 5).map((item) => (
                <li key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      aria-hidden="true"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-600 dark:text-zinc-400">{item.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-zinc-100 tabular-nums">
                    {formatCurrency(item.value)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Single chain selected - show period comparison */}
        {selectedChain !== "all" && (
          <Card className="bg-white dark:bg-zinc-800 rounded-xl">
            <Title className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-4">
              Period Comparison ({getChainName(selectedChain)})
            </Title>
            <ul aria-label="Period comparison values" className="space-y-3 list-none m-0 p-0">
              {rollingPeriodOrder.map((period) => {
                const value = getPeriodValue(period);
                const maxValue = Math.max(...rollingPeriodOrder.map((p) => getPeriodValue(p)));
                const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

                return (
                  <li key={period}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-zinc-400">
                        {rollingPeriodLabels[period]}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-zinc-100 tabular-nums">
                        {formatCurrency(value)}
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={Math.round(percentage)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${rollingPeriodLabels[period]}: ${formatCurrency(value)} unique users`}
                      className="h-2 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      {/* Period Details Table */}
      <Card className="bg-white dark:bg-zinc-800 rounded-xl">
        <Title className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-4">
          Period Details
        </Title>
        <div className="overflow-x-auto">
          <table
            className="min-w-full"
            aria-label="Detailed unique users data by period and blockchain network"
          >
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-700">
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400"
                >
                  Period
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-zinc-400"
                >
                  Users
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400"
                >
                  Date Range
                </th>
                {availableChains.slice(0, 3).map((chainId) => (
                  <th
                    key={chainId}
                    scope="col"
                    className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-zinc-400"
                  >
                    {getChainName(chainId)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
              {rollingPeriodOrder.map((period) => {
                const dp = rollingPeriods[period];
                if (!dp) return null;

                const breakdown = parseBreakdown(dp.breakdown);
                const value = typeof dp.value === "number" ? dp.value : parseFloat(dp.value) || 0;

                return (
                  <tr
                    key={period}
                    className={cn(
                      "transition-colors",
                      selectedPeriod === period
                        ? "bg-blue-50/50 dark:bg-blue-900/10"
                        : "hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                    )}
                  >
                    <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-zinc-100">
                      {rollingPeriodLabels[period]}
                    </td>
                    <td className="px-3 py-3 text-sm font-bold text-right tabular-nums text-blue-600 dark:text-blue-400">
                      {formatCurrency(value)}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 dark:text-zinc-400">
                      {formatDate(new Date(dp.startDate), "UTC")} -{" "}
                      {formatDate(new Date(dp.endDate), "UTC")}
                    </td>
                    {availableChains.slice(0, 3).map((chainId) => (
                      <td
                        key={chainId}
                        className="px-3 py-3 text-sm text-right tabular-nums text-gray-700 dark:text-zinc-300"
                      >
                        {formatCurrency(breakdown[chainId] || 0)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
