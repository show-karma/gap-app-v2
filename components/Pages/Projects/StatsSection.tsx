"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

interface GlobalStats {
  activeCommunities: number;
  totalProjectUpdates: number;
  totalProjects: number;
  totalGrants: number;
  activeBuilders: number;
}

const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "...";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toLocaleString();
};

export const ProjectsStatsSection = () => {
  const { data: stats, isLoading } = useQuery<GlobalStats>({
    queryKey: ["projects-global-stats"],
    queryFn: async () => {
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
    },
    staleTime: 5 * 60 * 1000,
  });

  const displayStats = [
    {
      value: stats ? `${formatNumber(stats.totalProjects)}+` : "...",
      label: "Total Projects",
    },
    {
      value: stats ? `${formatNumber(stats.totalGrants)}+` : "...",
      label: "Grants Tracked",
    },
    {
      value: stats ? formatNumber(stats.activeCommunities) : "...",
      label: "Active Communities",
    },
    {
      value: stats ? `${formatNumber(stats.activeBuilders)}+` : "...",
      label: "Active Builders",
    },
  ];

  return (
    <section className="w-full py-16 px-4 bg-gradient-to-br from-teal-50/50 via-white to-blue-50/50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900">
      <div className="max-w-7xl mx-auto text-center">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image
            src="/logo/karma-logo.svg"
            alt="Karma"
            width={48}
            height={48}
            className="dark:invert"
          />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-12">
          Karma by the Numbers
        </h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {displayStats.map((stat, index) => (
            <div key={index} className="flex flex-col items-center">
              <span
                className={`text-4xl md:text-5xl font-bold text-teal-500 dark:text-teal-400 ${
                  isLoading ? "animate-pulse" : ""
                }`}
              >
                {stat.value}
              </span>
              <span className="text-gray-600 dark:text-gray-400 mt-2">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
