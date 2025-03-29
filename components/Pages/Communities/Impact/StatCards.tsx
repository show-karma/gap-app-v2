"use client";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement";
import formatCurrency from "@/utilities/formatCurrency";
import { getHeaderStats } from "@/utilities/karma/getHeaderStats";
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
  const { data, isLoading } = useQuery({
    queryKey: ["headerStats", communityId],
    queryFn: () => getHeaderStats(communityId),
    enabled: !!communityId,
  });

  const stats = [
    {
      title: "Total Projects",
      value: data?.noOfProjects ? formatCurrency(data.noOfProjects) : "-",
      color: "#9b59b6",
    },
    {
      title: "Total Grants",
      value: data?.noOfGrants ? formatCurrency(data.noOfGrants) : "-",
      color: "#e67e22",
    },
    {
      title: "Total Programs",
      value: data?.noOfPrograms ? formatCurrency(data.noOfPrograms) : "-",
      color: "#3498db",
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
export const CommunityImpactStatCards = () => {
  const pathname = usePathname();
  const isImpactPage = pathname.includes("/impact");

  return (
    <div className="flex flex-1 gap-6 flex-row max-sm:flex-col py-2">
      {isImpactPage ? <ImpactStatCards /> : <CommunityStatCards />}
    </div>
  );
};
