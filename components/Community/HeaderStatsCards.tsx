"use client";

import { CheckIcon } from "lucide-react";
import type { ReactNode } from "react";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { Skeleton } from "@/components/Utilities/Skeleton";
import formatCurrency from "@/utilities/formatCurrency";
import { cn } from "@/utilities/tailwind";

interface StatCardProps {
  label: string;
  value: ReactNode;
  accentClass: string;
  isLoading?: boolean;
  tooltip?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

const StatCard = ({
  label,
  value,
  accentClass,
  isLoading,
  tooltip,
  trailing,
  className,
}: StatCardProps) => (
  <div
    className={cn(
      "group relative flex min-w-0 flex-col gap-1 rounded-xl border border-gray-200/80 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] dark:border-zinc-800 dark:bg-zinc-900/80",
      className
    )}
  >
    <span
      aria-hidden
      className={cn("absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full", accentClass)}
    />
    <div className="flex items-baseline justify-between gap-2 pl-1.5">
      {isLoading ? (
        <Skeleton className="h-6 w-12" />
      ) : (
        <span className="text-[20px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-gray-900 dark:text-white truncate">
          {value}
        </span>
      )}
      {trailing}
    </div>
    <div className="flex items-center gap-1 pl-1.5 min-w-0">
      <span className="truncate text-[11.5px] font-medium leading-tight text-gray-500 dark:text-zinc-400">
        {label}
      </span>
      {tooltip ? (
        <InfoTooltip content={tooltip} side="top" align="start" contentClassName="max-w-sm" />
      ) : null}
    </div>
  </div>
);

interface MilestoneStatCardProps {
  completed: number;
  total: number;
  isLoading?: boolean;
}

const MilestoneStatCard = ({ completed, total, isLoading }: MilestoneStatCardProps) => {
  const safeCompleted = Math.max(0, Math.min(completed, total));
  const pct = total > 0 ? (safeCompleted / total) * 100 : 0;
  const isComplete = total > 0 && safeCompleted === total;

  return (
    <div className="group relative flex min-w-0 flex-col gap-1 rounded-xl border border-gray-200/80 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] dark:border-zinc-800 dark:bg-zinc-900/80 sm:col-span-2 lg:col-span-1">
      <span
        aria-hidden
        className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-emerald-500"
      />
      <div className="flex items-baseline justify-between gap-2 pl-1.5">
        {isLoading ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <span className="text-[20px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-gray-900 dark:text-white whitespace-nowrap truncate">
            {completed} <span className="text-gray-400 dark:text-zinc-500">/</span> {total}
          </span>
        )}
        {isComplete && !isLoading ? (
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <CheckIcon size={10} aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 pl-1.5">
        <div
          className="relative h-1 flex-1 min-w-0 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct.toFixed(0)}% of milestones completed`}
        >
          <span
            className="block h-full bg-emerald-500 transition-all dark:bg-emerald-400"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11px] font-semibold tabular-nums text-gray-500 dark:text-zinc-400 shrink-0">
          {pct.toFixed(0)}%
        </span>
      </div>
      <span className="pl-1.5 text-[11.5px] font-medium leading-tight text-gray-500 dark:text-zinc-400 truncate">
        Milestones
      </span>
    </div>
  );
};

export interface HeaderStatsCardsProps {
  projectsCount?: number;
  totalGrants?: number;
  projectUpdates?: number;
  completedMilestones: number;
  totalMilestones?: number;
  updatesBreakdown?: ReactNode;
  isLoading?: boolean;
}

export const HeaderStatsCards = ({
  projectsCount,
  totalGrants,
  projectUpdates,
  completedMilestones,
  totalMilestones,
  updatesBreakdown,
  isLoading,
}: HeaderStatsCardsProps) => {
  const hasData =
    !!projectsCount || !!totalGrants || !!projectUpdates || !!totalMilestones || isLoading;
  if (!hasData) return null;

  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total projects"
        value={projectsCount ? formatCurrency(projectsCount) : "—"}
        accentClass="bg-sky-500"
        isLoading={isLoading}
      />
      <StatCard
        label="Total grants"
        value={totalGrants ? formatCurrency(totalGrants) : "—"}
        accentClass="bg-teal-500"
        isLoading={isLoading}
      />
      <StatCard
        label="Project updates"
        value={projectUpdates ? formatCurrency(projectUpdates) : "—"}
        accentClass="bg-amber-500"
        isLoading={isLoading}
        tooltip={updatesBreakdown}
      />
      <MilestoneStatCard
        completed={completedMilestones}
        total={totalMilestones ?? 0}
        isLoading={isLoading}
      />
    </div>
  );
};
