"use client";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@/components/Utilities/Spinner";
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement";
import type { ProgramImpactDataResponse } from "@/types/programs";
import { formatDate } from "@/utilities/formatDate";
import { CategoryRow } from "./CategoryRow";
import { CommunityMetricsSection } from "./CommunityMetricsSection";
import { ProgramBanner } from "./ProgramBanner";

export const prepareChartData = (
  values: number[],
  timestamps: string[],
  name: string,
  runningValues?: number[],
  proofs?: string[]
): { date: string; [key: string]: number | string }[] => {
  const chartData = timestamps
    .map((timestamp, index) => {
      if (runningValues?.length) {
        return {
          date: formatDate(new Date(timestamp), "UTC"),
          [name]: Number(values[index]) || 0,
          Cumulative: Number(runningValues[index]) || 0,
          proof: proofs?.[index] || "",
        };
      }
      return {
        date: formatDate(new Date(timestamp), "UTC"),
        [name]: Number(values[index]) || 0,
        proof: proofs?.[index] || "",
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return chartData;
};

export const CommunityImpactCharts = () => {
  const searchParams = useSearchParams();
  const projectSelected = searchParams.get("projectId");
  const programSelected = searchParams.get("programId");
  const { data, isLoading } = useImpactMeasurement(projectSelected);

  const categories = data?.data as ProgramImpactDataResponse[] | undefined;

  const orderedData = categories?.sort((a, b) => {
    // First, compare by whether they have impacts
    const aHasImpacts = a.impacts?.length > 0;
    const bHasImpacts = b.impacts?.length > 0;

    if (aHasImpacts !== bHasImpacts) {
      return aHasImpacts ? -1 : 1; // Categories with impacts come first
    }

    // If both have or don't have impacts, sort alphabetically
    return a.categoryName.localeCompare(b.categoryName);
  });

  // Hide community metrics when filtered by program or project
  // Community metrics show network-wide data, not program/project specific
  const showCommunityMetrics = !programSelected && !projectSelected;

  return (
    <div className="flex flex-col gap-4 flex-1 mb-10">
      <ProgramBanner />
      {showCommunityMetrics && <CommunityMetricsSection />}
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner />
        </div>
      ) : orderedData?.length ? (
        orderedData.map((category, index) => (
          <div
            key={`category-container-${category.categoryName}-${
              projectSelected || "all"
            }-${programSelected || "all"}-${index}`}
          >
            <CategoryRow
              key={`category-row-${category.categoryName}-${
                projectSelected || "all"
              }-${programSelected || "all"}-${index}`}
              category={category}
            />
            {index !== orderedData.length - 1 && (
              <div
                key={`category-divider-${category.categoryName}-${
                  projectSelected || "all"
                }-${programSelected || "all"}-${index}`}
                className="w-full my-8 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent"
              />
            )}
          </div>
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            This community has not reported any impact segments yet.
          </p>
        </div>
      )}
    </div>
  );
};
