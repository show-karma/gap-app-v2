"use client";

import { ArrowTrendingUpIcon, CodeBracketIcon, UsersIcon } from "@heroicons/react/24/outline";
import { useProjectImpactIndicators } from "@/hooks/useProjectImpactIndicators";
import { useProjectStore } from "@/store";
import formatCurrency from "@/utilities/formatCurrency";
import { cn } from "@/utilities/tailwind";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
}

function StatCard({ label, value, icon, subtitle = "last 30 days" }: StatCardProps) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700">
      <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
        {typeof value === "number" ? formatCurrency(value) : value}
      </div>
      <span className="text-xs text-gray-400 dark:text-zinc-500">{subtitle}</span>
    </div>
  );
}

interface ImpactStatsSummaryProps {
  className?: string;
}

/**
 * ImpactStatsSummary displays key metrics (Total Transactions, Git Commits, Unique Users)
 * for the last 30 days at the top of the Impact page.
 *
 * Uses the indicator-dashboard-metrics endpoint which provides pre-calculated
 * aggregated values matching production behavior.
 */
export function ImpactStatsSummary({ className }: ImpactStatsSummaryProps) {
  const { project } = useProjectStore();

  // Use the dashboard metrics endpoint which returns pre-calculated stats
  const { data: dashboardMetrics, isLoading } = useProjectImpactIndicators(
    project?.uid as string,
    30 // 30 days range
  );

  // Extract stats from dashboard metrics
  const stats = {
    transactions: dashboardMetrics?.metrics?.transactions?.value ?? null,
    gitCommits: dashboardMetrics?.metrics?.gitCommits?.value ?? null,
    uniqueUsers: dashboardMetrics?.metrics?.uniqueUsers?.value ?? null,
  };

  // Don't render if no data or all values are null/0
  const hasData =
    (stats.transactions !== null && stats.transactions > 0) ||
    (stats.gitCommits !== null && stats.gitCommits > 0) ||
    (stats.uniqueUsers !== null && stats.uniqueUsers > 0);

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-4", className)}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[104px] bg-gray-100 dark:bg-zinc-800 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!hasData) {
    return null;
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-4", className)}>
      {stats.transactions !== null && stats.transactions > 0 && (
        <StatCard
          label="Total Transactions"
          value={stats.transactions}
          icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
        />
      )}
      {stats.gitCommits !== null && stats.gitCommits > 0 && (
        <StatCard
          label="Git Commits"
          value={stats.gitCommits}
          icon={<CodeBracketIcon className="h-5 w-5" />}
        />
      )}
      {stats.uniqueUsers !== null && stats.uniqueUsers > 0 && (
        <StatCard
          label="Unique Users"
          value={stats.uniqueUsers}
          icon={<UsersIcon className="h-5 w-5" />}
        />
      )}
    </div>
  );
}
