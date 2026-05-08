"use client";

import { AwardIcon, CheckIcon, FileTextIcon, FolderIcon, TargetIcon } from "lucide-react";
import type { ReactNode } from "react";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { Skeleton } from "@/components/Utilities/Skeleton";
import formatCurrency from "@/utilities/formatCurrency";
import { cn } from "@/utilities/tailwind";

type Tone = "sky" | "teal" | "amber" | "emerald";

const TONE_STYLES: Record<
  Tone,
  { iconWrap: string; iconColor: string; ring: string; bg: string; bar: string; barTrack: string }
> = {
  sky: {
    iconWrap: "bg-sky-50 dark:bg-sky-500/10",
    iconColor: "text-sky-600 dark:text-sky-300",
    ring: "ring-sky-100/80 dark:ring-sky-500/15",
    bg: "from-sky-50/60 dark:from-sky-500/5",
    bar: "bg-sky-500",
    barTrack: "bg-sky-100 dark:bg-sky-500/15",
  },
  teal: {
    iconWrap: "bg-teal-50 dark:bg-teal-500/10",
    iconColor: "text-teal-600 dark:text-teal-300",
    ring: "ring-teal-100/80 dark:ring-teal-500/15",
    bg: "from-teal-50/60 dark:from-teal-500/5",
    bar: "bg-teal-500",
    barTrack: "bg-teal-100 dark:bg-teal-500/15",
  },
  amber: {
    iconWrap: "bg-amber-50 dark:bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-300",
    ring: "ring-amber-100/80 dark:ring-amber-500/15",
    bg: "from-amber-50/60 dark:from-amber-500/5",
    bar: "bg-amber-500",
    barTrack: "bg-amber-100 dark:bg-amber-500/15",
  },
  emerald: {
    iconWrap: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-300",
    ring: "ring-emerald-100/80 dark:ring-emerald-500/15",
    bg: "from-emerald-50/60 dark:from-emerald-500/5",
    bar: "bg-emerald-500",
    barTrack: "bg-emerald-100 dark:bg-emerald-500/15",
  },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  tone: Tone;
  icon: ReactNode;
  isLoading?: boolean;
  tooltip?: ReactNode;
}

const StatCard = ({ label, value, tone, icon, isLoading, tooltip }: StatCardProps) => {
  const styles = TONE_STYLES[tone];
  return (
    <div
      className={cn(
        "group relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-2xl bg-white px-3.5 py-3 ring-1 transition-all hover:-translate-y-px hover:shadow-[0_10px_30px_-15px_rgba(15,23,42,0.18)] dark:bg-zinc-900/80",
        styles.ring
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-70",
          styles.bg
        )}
      />
      <div className="relative flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            styles.iconWrap,
            styles.iconColor
          )}
        >
          {icon}
        </span>
        {tooltip ? (
          <InfoTooltip content={tooltip} side="top" align="end" contentClassName="max-w-sm" />
        ) : null}
      </div>
      <div className="relative flex flex-col gap-0.5">
        {isLoading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <span className="text-[22px] font-semibold leading-none tracking-[-0.025em] tabular-nums text-gray-900 dark:text-white truncate">
            {value}
          </span>
        )}
        <span className="truncate text-[12px] font-medium leading-tight text-gray-500 dark:text-zinc-400">
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
  const styles = TONE_STYLES.emerald;

  return (
    <div
      className={cn(
        "group relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-2xl bg-white px-3.5 py-3 ring-1 transition-all hover:-translate-y-px hover:shadow-[0_10px_30px_-15px_rgba(15,23,42,0.18)] dark:bg-zinc-900/80",
        styles.ring
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-70",
          styles.bg
        )}
      />
      <div className="relative flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            styles.iconWrap,
            styles.iconColor
          )}
        >
          <TargetIcon size={14} aria-hidden />
        </span>
        {isComplete && !isLoading ? (
          <span className="inline-flex h-5 items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <CheckIcon size={10} aria-hidden /> Done
          </span>
        ) : (
          <span className="text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {pct.toFixed(0)}%
          </span>
        )}
      </div>
      <div className="relative flex flex-col gap-1.5">
        {isLoading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <span className="text-[22px] font-semibold leading-none tracking-[-0.025em] tabular-nums text-gray-900 dark:text-white whitespace-nowrap truncate">
            {completed} <span className="text-gray-400 dark:text-zinc-500">/</span> {total}
          </span>
        )}
        <div
          className={cn("relative h-1 w-full overflow-hidden rounded-full", styles.barTrack)}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct.toFixed(0)}% of milestones completed`}
        >
          <span
            className={cn("block h-full transition-all", styles.bar)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="truncate text-[12px] font-medium leading-tight text-gray-500 dark:text-zinc-400">
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
  if (!hasData) return null;

  return (
    <div className="flex w-full flex-wrap justify-end gap-2.5 lg:flex-nowrap [&>*]:flex-1 [&>*]:basis-[140px] lg:[&>*]:max-w-[180px]">
      <StatCard
        label="Total projects"
        value={projectsCount ? formatCurrency(projectsCount) : "—"}
        tone="sky"
        icon={<FolderIcon size={14} aria-hidden />}
        isLoading={isLoading}
      />
      <StatCard
        label="Total grants"
        value={totalGrants ? formatCurrency(totalGrants) : "—"}
        tone="teal"
        icon={<AwardIcon size={14} aria-hidden />}
        isLoading={isLoading}
      />
      <StatCard
        label="Project updates"
        value={projectUpdates ? formatCurrency(projectUpdates) : "—"}
        tone="amber"
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
