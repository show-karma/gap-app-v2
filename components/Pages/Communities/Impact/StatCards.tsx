"use client";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement";
import { useCommunityStore } from "@/store/community";
import formatCurrency from "@/utilities/formatCurrency";
import { getCommunityStatsV2 } from "@/utilities/queries/getCommunityDataV2";
import { useQuery } from "@tanstack/react-query";
import { useParams, usePathname } from "next/navigation";

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
        data?.stats.totalFundingAllocated &&
          data?.stats.totalFundingAllocated !== "NaN"
          ? data?.stats.totalFundingAllocated
          : "-",
      color: "#A6EF67",
    },
  ];

  return stats.map((item) => (
    <div
      key={item.title}
      className="flex flex-1 rounded-lg border border-gray-300 dark:border-zinc-600"
    >
      <div className="px-3 py-3 rounded-full">
        <div
          className="w-1 h-[84px] max-sm:h-full rounded-full"
          style={{
            background: item.color,
          }}
        />
      </div>
      <div className="h-full flex flex-col items-start justify-end py-2">
        <h3 className="text-slate-800 dark:text-zinc-100 text-base font-semibold font-['Inter']">
          {item.title}
        </h3>
        {isLoading ? (
          <Skeleton className="w-10 h-10" />
        ) : (
          <p className="text-center text-slate-800 dark:text-zinc-100 text-2xl font-bold font-['Inter']">
            {item.value}
          </p>
        )}
      </div>
    </div>
  ));
};

export const CommunityStatCards = () => {
  const params = useParams();
  const communityId = params.communityId as string;
  const {
    totalProjects: filteredProjectsCount,
    totalGrants: filteredGrantsCount,
    totalMilestones: filteredMilestonesCount,
    isLoadingFilters
  } = useCommunityStore();
  const { data, isLoading } = useQuery({
    queryKey: ["community-stats", communityId],
    queryFn: () => getCommunityStatsV2(communityId),
    enabled: !!communityId,
  });

  const stats = [
    {
      title: "Total Projects",
      value: filteredProjectsCount,
      displayValue: filteredProjectsCount ? formatCurrency(filteredProjectsCount) : "-",
      color: "#9b59b6",
      showLoading: isLoadingFilters, // Show loading when filters are being applied
    },
    {
      title: "Total Grants",
      value: data?.totalGrants,
      displayValue: data?.totalGrants ? formatCurrency(data.totalGrants) : "-",
      color: "#e67e22",
      showLoading: isLoadingFilters, // Show loading when filters are being applied
    },
    {
      title: "Total Milestones",
      value: data?.totalMilestones,
      displayValue: data?.totalMilestones ? formatCurrency(data.totalMilestones) : "-",
      color: "#3498db",
      showLoading: isLoadingFilters, // Show loading when filters are being applied
    },
  ];
  return stats.map((item) => (
    <div
      key={item.title}
      className="flex flex-1 rounded-lg border border-gray-300 dark:border-zinc-600"
    >
      <div className="px-3 py-3 rounded-full">
        <div
          className="w-1 h-[84px] max-sm:h-full rounded-full"
          style={{
            background: item.color,
          }}
        />
      </div>
      <div className="h-full flex flex-col items-start justify-end py-2">
        <h3 className="text-slate-800 dark:text-zinc-100 text-base font-semibold font-['Inter']">
          {item.title}
        </h3>
        {isLoading || item.showLoading ? (
          <Skeleton className="w-10 h-10" />
        ) : (
          <p className="text-center text-slate-800 dark:text-zinc-100 text-2xl font-bold font-['Inter']">
            {item.displayValue}
          </p>
        )}
      </div>
    </div>
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
