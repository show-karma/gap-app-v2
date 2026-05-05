"use client";
import { CheckIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement";
import { useCommunityStore } from "@/store/community";
import formatCurrency from "@/utilities/formatCurrency";
import { getCommunityStats } from "@/utilities/queries/v2/getCommunityData";

interface StatCardProps {
  title: string;
  value: string;
  color: string;
  isLoading?: boolean;
  tooltip?: ReactNode;
}

const StatCard = ({ title, value, color, isLoading, tooltip }: StatCardProps) => (
  <div className="flex flex-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
    <div className="w-1 my-1.5 ml-3 rounded-full" style={{ background: color }} />
    <div className="flex flex-col items-start justify-center py-3 pl-2 pr-4">
      {isLoading ? (
        <Skeleton className="w-12 h-8 mb-1" />
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

interface MilestonesCardProps {
  completed: number;
  total: number;
  isLoading?: boolean;
}

const MilestonesCard = ({ completed, total, isLoading }: MilestonesCardProps) => {
  const safeCompleted = Math.max(0, Math.min(completed, total));
  const completedPct = total > 0 ? (safeCompleted / total) * 100 : 0;
  const pendingPct = total > 0 ? 100 - completedPct : 0;

  const isComplete = total > 0 && safeCompleted === total;

  return (
    <div className="flex flex-[1.4] rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 max-sm:col-span-2 min-w-0">
      <div className="w-1 my-1.5 ml-3 rounded-full bg-emerald-500" />
      <div className="flex flex-col justify-center py-3 pl-2 pr-3 w-full min-w-0">
        <div className="flex items-start justify-between gap-2 w-full">
          <div className="flex flex-col items-start min-w-0">
            {isLoading ? (
              <Skeleton className="w-20 h-8" />
            ) : (
              <p className="text-gray-900 dark:text-zinc-100 text-[30px] font-semibold leading-none tracking-tight tabular-nums whitespace-nowrap">
                {completed} / {total}
              </p>
            )}
            <span className="mt-1 text-gray-500 dark:text-gray-400 text-sm font-medium leading-tight whitespace-nowrap">
              Completed / Total Milestones
            </span>
          </div>
          {isComplete && !isLoading && (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500">
              <CheckIcon className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 w-full mt-2">
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-700"
            role="progressbar"
            aria-valuenow={completedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${completedPct.toFixed(1)}% of milestones completed`}
          >
            <div
              className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all"
              style={{ width: `${completedPct}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
            {completedPct.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export const ImpactStatCards = () => {
  const { data, isLoading } = useImpactMeasurement();

  const stats = [
    {
      title: "Total Projects",
      value:
        data?.stats.totalProjects || Number(data?.stats.totalProjects) === 0
          ? formatCurrency(Number(data?.stats.totalProjects))
          : "-",
      color: "#84ADFF",
    },
    {
      title: "Total Categories",
      value:
        data?.stats.totalCategories || Number(data?.stats.totalCategories) === 0
          ? formatCurrency(Number(data?.stats.totalCategories))
          : "-",
      color: "#67E3F9",
    },
    {
      title: "Total Funding Allocated (with available data)",
      value:
        data?.stats.totalFundingAllocated && data?.stats.totalFundingAllocated !== "NaN"
          ? data?.stats.totalFundingAllocated
          : "-",
      color: "#A6EF67",
    },
  ];

  return stats.map((item) => (
    <StatCard
      key={item.title}
      title={item.title}
      value={item.value}
      color={item.color}
      isLoading={isLoading}
    />
  ));
};

export const CommunityStatCards = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const communityId = params.communityId as string;
  const programId = searchParams.get("programId");
  const {
    totalProjects: filteredProjectsCount,
    totalGrants: filteredGrantsCount,
    totalMilestones: filteredMilestonesCount,
    isLoadingFilters,
  } = useCommunityStore();
  const { data, isLoading } = useQuery({
    queryKey: ["community-stats", communityId],
    queryFn: () => getCommunityStats(communityId),
    enabled: !!communityId,
  });

  const stats = [
    {
      title: "Total Projects",
      value: filteredProjectsCount,
      displayValue: filteredProjectsCount ? formatCurrency(filteredProjectsCount) : "-",
      color: "#84ADFF",
      showLoading: isLoadingFilters,
      tooltip: null,
    },
    {
      title: "Total Grants",
      value: data?.totalGrants,
      displayValue: data?.totalGrants ? formatCurrency(data.totalGrants) : "-",
      color: "#5FE9D0",
      showLoading: isLoadingFilters,
      tooltip: null,
    },
    {
      title: "Project Updates",
      value: data?.projectUpdates,
      displayValue: data?.projectUpdates ? formatCurrency(data.projectUpdates) : "-",
      color: "#FDB022",
      showLoading: isLoadingFilters,
      tooltip: data?.projectUpdatesBreakdown ? (
        <div className="flex flex-col gap-1.5 p-1">
          <div className="font-semibold text-xs mb-1 border-b border-gray-200 dark:border-zinc-700 pb-1">
            Project Updates Breakdown
          </div>
          <div className="flex justify-between gap-3 text-xs">
            <span className="text-gray-600 dark:text-gray-400">Project Milestones</span>
            <span className="font-medium">
              {formatCurrency(data.projectUpdatesBreakdown.projectMilestones)}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-xs">
            <span className="text-gray-600 dark:text-gray-400">Project Milestone Completions</span>
            <span className="font-medium">
              {formatCurrency(data.projectUpdatesBreakdown.projectCompletedMilestones)}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-xs">
            <span className="text-gray-600 dark:text-gray-400">Project Updates</span>
            <span className="font-medium">
              {formatCurrency(data.projectUpdatesBreakdown.projectUpdates)}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-xs">
            <span className="text-gray-600 dark:text-gray-400">Grant Milestones</span>
            <span className="font-medium">
              {formatCurrency(data.projectUpdatesBreakdown.grantMilestones)}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-xs">
            <span className="text-gray-600 dark:text-gray-400">Grant Milestone Completions</span>
            <span className="font-medium">
              {formatCurrency(data.projectUpdatesBreakdown.grantCompletedMilestones)}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-xs">
            <span className="text-gray-600 dark:text-gray-400">Grant Updates</span>
            <span className="font-medium">
              {formatCurrency(data.projectUpdatesBreakdown.grantUpdates)}
            </span>
          </div>
        </div>
      ) : null,
    },
  ];

  // Filter out "Total Grants" card when programId is present
  const filteredStats = useMemo(
    () => (programId ? stats.filter((stat) => stat.title !== "Total Grants") : stats),
    [programId, stats]
  );

  const breakdown = data?.projectUpdatesBreakdown;
  const completedMilestones = breakdown
    ? breakdown.projectCompletedMilestones + breakdown.grantCompletedMilestones
    : 0;
  const totalMilestones = data?.totalMilestones ?? 0;

  return (
    <>
      {filteredStats.map((item) => (
        <StatCard
          key={item.title}
          title={item.title}
          value={item.displayValue}
          color={item.color}
          isLoading={isLoading || item.showLoading}
          tooltip={item.tooltip}
        />
      ))}
      <MilestonesCard
        completed={completedMilestones}
        total={totalMilestones}
        isLoading={isLoading || isLoadingFilters}
      />
    </>
  );
};

export const CommunityImpactStatCards = () => {
  const pathname = usePathname();
  const isImpactPage = pathname.includes("/impact");

  return (
    <div className="flex flex-1 gap-6 flex-row max-sm:grid max-sm:grid-cols-2 py-2">
      {isImpactPage ? <ImpactStatCards /> : <CommunityStatCards />}
    </div>
  );
};
