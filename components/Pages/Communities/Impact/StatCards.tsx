"use client";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement";
import { useParams, useSearchParams } from "next/navigation";

export const CommunityImpactStatCards = () => {
  const { communityId } = useParams();
  const searchParams = useSearchParams();

  const defaultProgramSelected = searchParams.get("programId");

  const { data, isLoading } = useImpactMeasurement();
  const outputs = data?.data;

  const stats = [
    {
      title: "Total Projects",
      value: data?.stats.totalProjects,
      color: "#84ADFF",
    },
    {
      title: "Total Categories",
      value: data?.stats.totalCategories,
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
  return (
    <div className="flex flex-row gap-4">
      <div className="flex flex-1 gap-6 flex-row max-sm:flex-col">
        {stats.map((item) => (
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
        ))}
      </div>
    </div>
  );
};
