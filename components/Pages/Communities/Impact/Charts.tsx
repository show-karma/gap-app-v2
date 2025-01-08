"use client";
import { Spinner } from "@/components/Utilities/Spinner";
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement";
import { CategoryRow } from "./CategoryRow";

export const CommunityImpactCharts = () => {
  const { data, isLoading } = useImpactMeasurement();

  const orderedData = data?.sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName)
  );

  return (
    <div className="flex flex-col gap-4 flex-1 mb-10">
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner />
        </div>
      ) : (
        orderedData?.map((program) => (
          <CategoryRow key={program.categoryName} program={program} />
        ))
      )}
    </div>
  );
};
