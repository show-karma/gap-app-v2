"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { useWhitelabel } from "@/utilities/whitelabel-context";

interface GlobalStats {
  activeCommunities: number;
  totalProjectUpdates: number;
  totalProjects: number;
  totalGrants: number;
  totalMilestones: number;
  totalCompletedMilestones: number;
  activeBuilders: number;
}

interface CommunityStatsResponse {
  totalProjects: number;
  totalGrants: number;
  totalMilestones: number;
  projectUpdates: number;
  projectUpdatesBreakdown: {
    projectMilestones: number;
    projectCompletedMilestones: number;
    projectUpdates: number;
    grantMilestones: number;
    grantCompletedMilestones: number;
    grantUpdates: number;
  };
  totalTransactions: number;
  averageCompletion: number;
}

interface MilestoneTotals {
  total: number;
  completed: number;
}

const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "...";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toLocaleString();
};

const fetchGlobalStats = async (): Promise<GlobalStats> => {
  const [response, error] = await fetchData(
    INDEXER.COMMUNITY.GLOBAL_STATS(),
    "GET",
    {},
    {},
    {},
    false
  );
  if (error || !response) {
    throw new Error(error || "Failed to fetch stats");
  }
  return response as GlobalStats;
};

const fetchCommunityStats = async (slug: string): Promise<CommunityStatsResponse> => {
  const [response, error] = await fetchData(
    INDEXER.COMMUNITY.V2.STATS(slug),
    "GET",
    {},
    {},
    {},
    false
  );
  if (error || !response) {
    throw new Error(error || "Failed to fetch community stats");
  }
  return response as CommunityStatsResponse;
};

const MilestonesProgressCard = ({
  milestones,
  isLoading,
}: {
  milestones: MilestoneTotals | undefined;
  isLoading: boolean;
}) => {
  const total = milestones?.total ?? 0;
  const completed = milestones?.completed ?? 0;
  const completedPct = total > 0 ? (completed / total) * 100 : 0;
  const pendingPct = total > 0 ? 100 - completedPct : 0;

  const valueLabel = milestones === undefined ? "..." : `${completed} / ${total}`;

  return (
    <div className="flex flex-col items-center w-full">
      <span
        className={`text-4xl md:text-5xl font-bold text-teal-500 dark:text-teal-400 ${
          isLoading ? "animate-pulse" : ""
        }`}
      >
        {valueLabel}
      </span>
      <span className="text-gray-600 dark:text-gray-400 mt-2">Completed / Total Milestones</span>
      <div
        className="w-full max-w-[180px] mt-3 h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-700 flex"
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
      <div className="flex justify-between w-full max-w-[180px] mt-1.5 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
        <span>{completedPct.toFixed(1)}%</span>
        <span>{pendingPct.toFixed(1)}%</span>
      </div>
    </div>
  );
};

export const ProjectsStatsSection = () => {
  const { isWhitelabel, communitySlug } = useWhitelabel();

  const { data: globalStats, isLoading: isLoadingGlobal } = useQuery<GlobalStats>({
    queryKey: ["projects-global-stats"],
    queryFn: fetchGlobalStats,
    staleTime: 5 * 60 * 1000,
  });

  const { data: communityStats, isLoading: isLoadingCommunity } = useQuery<CommunityStatsResponse>({
    queryKey: ["projects-community-stats", communitySlug],
    queryFn: () => fetchCommunityStats(communitySlug as string),
    enabled: Boolean(isWhitelabel && communitySlug),
    staleTime: 5 * 60 * 1000,
  });

  const milestones: MilestoneTotals | undefined = (() => {
    if (isWhitelabel && communitySlug) {
      if (!communityStats) return undefined;
      const breakdown = communityStats.projectUpdatesBreakdown;
      return {
        total: communityStats.totalMilestones,
        completed: breakdown.projectCompletedMilestones + breakdown.grantCompletedMilestones,
      };
    }
    if (!globalStats) return undefined;
    return {
      total: globalStats.totalMilestones,
      completed: globalStats.totalCompletedMilestones,
    };
  })();

  const isLoadingMilestones = isWhitelabel && communitySlug ? isLoadingCommunity : isLoadingGlobal;

  const displayStats = [
    {
      value: globalStats ? `${formatNumber(globalStats.totalProjects)}+` : "...",
      label: "Total Projects",
    },
    {
      value: globalStats ? `${formatNumber(globalStats.totalGrants)}+` : "...",
      label: "Grants Tracked",
    },
    {
      value: globalStats ? formatNumber(globalStats.activeCommunities) : "...",
      label: "Active Communities",
    },
    {
      value: globalStats ? `${formatNumber(globalStats.activeBuilders)}+` : "...",
      label: "Active Builders",
    },
  ];

  return (
    <section className="w-full py-16 px-4 bg-gradient-to-br from-teal-50/50 via-white to-blue-50/50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900">
      <div className="max-w-7xl mx-auto text-center">
        <div className="flex justify-center mb-4">
          <Image
            src="/logo/karma-logo.svg"
            alt="Karma"
            width={48}
            height={48}
            className="dark:invert"
          />
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-12">
          Karma by the Numbers
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {displayStats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <span
                className={`text-4xl md:text-5xl font-bold text-teal-500 dark:text-teal-400 ${
                  isLoadingGlobal ? "animate-pulse" : ""
                }`}
              >
                {stat.value}
              </span>
              <span className="text-gray-600 dark:text-gray-400 mt-2">{stat.label}</span>
            </div>
          ))}
          <MilestonesProgressCard milestones={milestones} isLoading={isLoadingMilestones} />
        </div>
      </div>
    </section>
  );
};
