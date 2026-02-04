"use client";

import type { ReactNode } from "react";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { Skeleton } from "@/components/Utilities/Skeleton";
import type { CurrencyBreakdown, ProgramFinancialSummary } from "@/types/financials";
import formatCurrency from "@/utilities/formatCurrency";

interface StatCardProps {
  title: string;
  value: string;
  color: string;
  isLoading?: boolean;
  tooltip?: ReactNode;
}

function StatCard({ title, value, color, isLoading, tooltip }: StatCardProps) {
  return (
    <div className="flex flex-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      <div className="py-3 pl-3">
        <div className="w-1 h-full rounded-full" style={{ background: color }} />
      </div>
      <div className="flex flex-col items-start justify-center py-3 pl-2 pr-4">
        {isLoading ? (
          <Skeleton className="w-24 h-8 mb-1" />
        ) : (
          <p className="text-gray-900 dark:text-zinc-100 text-[30px] font-semibold leading-none tracking-tight">
            {value}
          </p>
        )}
        <div className="flex items-center gap-1">
          <span className="text-gray-900 dark:text-zinc-100 text-sm font-medium leading-normal">
            {title}
          </span>
          {tooltip && (
            <InfoTooltip content={tooltip} side="top" align="start" contentClassName="max-w-sm" />
          )}
        </div>
      </div>
    </div>
  );
}

function formatAmount(amount: string, currency: string): string {
  const numAmount = Number(amount);
  if (Number.isNaN(numAmount)) return amount;
  return `${formatCurrency(numAmount)} ${currency}`;
}

function CurrencyBreakdownTooltip({ breakdown }: { breakdown: CurrencyBreakdown[] }) {
  if (breakdown.length <= 1) return null;

  return (
    <div className="flex flex-col gap-1.5 p-1">
      <div className="font-semibold text-xs mb-1 border-b border-gray-200 dark:border-zinc-700 pb-1">
        Currency Breakdown
      </div>
      {breakdown.map((item) => (
        <div
          key={`${item.currency}-${item.chainID}`}
          className="flex justify-between gap-3 text-xs"
        >
          <span className="text-gray-600 dark:text-gray-400">{item.currency}</span>
          <span className="font-medium">{formatCurrency(Number(item.allocated))} allocated</span>
        </div>
      ))}
    </div>
  );
}

interface FinancialsSummaryProps {
  summary: ProgramFinancialSummary | undefined;
  isLoading: boolean;
}

export function FinancialsSummary({ summary, isLoading }: FinancialsSummaryProps) {
  const hasMultipleCurrencies = (summary?.currencyBreakdown?.length ?? 0) > 1;
  const currency = summary?.primaryCurrency || "USD";

  const stats = [
    {
      title: "Total Allocated",
      value: summary ? formatAmount(summary.totalAllocated, currency) : "-",
      color: "#84ADFF",
      tooltip:
        hasMultipleCurrencies && summary?.currencyBreakdown ? (
          <CurrencyBreakdownTooltip breakdown={summary.currencyBreakdown} />
        ) : null,
    },
    {
      title: "Total Disbursed",
      value: summary ? formatAmount(summary.totalDisbursed, currency) : "-",
      color: "#67E3F9",
      tooltip: null,
    },
    {
      title: "Remaining",
      value: summary ? formatAmount(summary.totalRemaining, currency) : "-",
      color: "#A6EF67",
      tooltip: null,
    },
  ];

  return (
    <div
      className="flex flex-1 gap-6 flex-row max-sm:flex-col py-2"
      data-testid="financials-summary"
    >
      {stats.map((stat) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          color={stat.color}
          isLoading={isLoading}
          tooltip={stat.tooltip}
        />
      ))}
    </div>
  );
}
