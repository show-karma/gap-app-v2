"use client";

import { AwardIcon, CheckIcon, FileTextIcon, FolderIcon, TargetIcon } from "lucide-react";
import type { ReactNode } from "react";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { Skeleton } from "@/components/Utilities/Skeleton";
import formatCurrency from "@/utilities/formatCurrency";

const CARD_BASE =
  "group relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-2xl border border-border bg-background px-3.5 py-3 transition-all hover:-translate-y-px hover:border-foreground/15 hover:shadow-[0_10px_30px_-15px_rgba(15,23,42,0.18)]";

const ICON_WRAP =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  isLoading?: boolean;
  tooltip?: ReactNode;
}

const StatCard = ({ label, value, icon, isLoading, tooltip }: StatCardProps) => {
  return (
    <div className={CARD_BASE}>
      <div className="relative flex items-start justify-between gap-2">
        <span className={ICON_WRAP}>{icon}</span>
        {tooltip ? (
          <InfoTooltip content={tooltip} side="top" align="end" contentClassName="max-w-sm" />
        ) : null}
      </div>
      <div className="relative flex flex-col gap-0.5">
        {isLoading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <span className="text-[22px] font-semibold leading-none tracking-[-0.025em] tabular-nums text-foreground truncate">
            {value}
          </span>
        )}
        <span className="truncate text-[12px] font-medium leading-tight text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
};

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
    <div className={CARD_BASE}>
      <div className="relative flex items-start justify-between gap-2">
        <span className={ICON_WRAP}>
          <TargetIcon size={14} aria-hidden />
        </span>
        {isComplete && !isLoading ? (
          <span className="inline-flex h-5 items-center gap-1 rounded-full bg-brand-50 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
            <CheckIcon size={10} aria-hidden /> Done
          </span>
        ) : (
          <span className="text-[11px] font-semibold tabular-nums text-brand-700 dark:text-brand-400">
            {pct.toFixed(0)}%
          </span>
        )}
      </div>
      <div className="relative flex flex-col gap-1.5">
        {isLoading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <span className="text-[22px] font-semibold leading-none tracking-[-0.025em] tabular-nums text-foreground whitespace-nowrap truncate">
            {completed} <span className="text-muted-foreground/60">/</span> {total}
          </span>
        )}
        <div
          className="relative h-1 w-full overflow-hidden rounded-full bg-brand-50 dark:bg-brand-500/10"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct.toFixed(0)}% of milestones completed`}
        >
          <span className="block h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="truncate text-[12px] font-medium leading-tight text-muted-foreground">
          Milestones
        </span>
      </div>
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
  if (!hasData) {
    return (
      <output className="flex w-full items-center justify-end text-[12px] text-muted-foreground">
        No stats yet — check back once projects start posting updates.
      </output>
    );
  }

  return (
    <div className="flex w-full flex-wrap justify-end gap-2.5 lg:flex-nowrap [&>*]:flex-1 [&>*]:basis-[140px] lg:[&>*]:max-w-[180px]">
      <StatCard
        label="Total projects"
        value={projectsCount ? formatCurrency(projectsCount) : "—"}
        icon={<FolderIcon size={14} aria-hidden />}
        isLoading={isLoading}
      />
      <StatCard
        label="Total grants"
        value={totalGrants ? formatCurrency(totalGrants) : "—"}
        icon={<AwardIcon size={14} aria-hidden />}
        isLoading={isLoading}
      />
      <StatCard
        label="Project updates"
        value={projectUpdates ? formatCurrency(projectUpdates) : "—"}
        icon={<FileTextIcon size={14} aria-hidden />}
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
