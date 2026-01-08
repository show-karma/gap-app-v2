"use client";
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
    <div className="py-3 pl-3">
      <div className="w-1 h-full rounded-full" style={{ background: color }} />
    </div>
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

  return filteredStats.map((item) => (
    <StatCard
      key={item.title}
      title={item.title}
      value={item.displayValue}
      color={item.color}
      isLoading={isLoading || item.showLoading}
      tooltip={item.tooltip}
    />
  ));
};

export const CommunityImpactStatCards = () => {
  const pathname = usePathname();
  const isImpactPage = pathname.includes("/impact");

  return (
    <div className="flex flex-1 gap-6 flex-row max-sm:flex-col py-2">
      {isImpactPage ? <ImpactStatCards /> : <CommunityStatCards />}
    </div>
  );
};
