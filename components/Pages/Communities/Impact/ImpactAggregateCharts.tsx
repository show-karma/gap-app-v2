"use client";
import { Spinner } from "@/components/Utilities/Spinner";
import { useImpactCommunityAggregate } from "@/hooks/useImpactCommunityAggregate";
import { AggregateCategoryRow } from "./AggregateCategoryRow";

export const CommunityImpactAggregateCharts = () => {
  const { data, isLoading } = useImpactCommunityAggregate();

  const outputs = data?.data;

  const orderedData = outputs?.sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  return (
    <div className="flex flex-col gap-4 flex-1 mb-10">
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner />
        </div>
      ) : orderedData?.length ? (
        orderedData.map((program, index) => (
          <>
            <AggregateCategoryRow key={program.categoryName} program={program} />
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
