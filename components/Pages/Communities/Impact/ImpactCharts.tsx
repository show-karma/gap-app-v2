"use client";
import { Spinner } from "@/components/Utilities/Spinner";
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement";
import { useSearchParams } from "next/navigation";
import { CategoryRow } from "./CategoryRow";

export const CommunityImpactCharts = () => {
  const searchParams = useSearchParams();
  const projectSelected = searchParams.get("projectId");
  const { data, isLoading } = useImpactMeasurement(projectSelected);

  const categories = data?.data;

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

  return (
    <div className="flex flex-col gap-4 flex-1 mb-10">
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner />
        </div>
      ) : orderedData?.length ? (
        orderedData.map((category, index) => (
          <>
            <CategoryRow key={category.categoryName} category={category} />
            {index !== orderedData.length - 1 && (
              <div className="w-full my-8 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
            )}
          </>
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
