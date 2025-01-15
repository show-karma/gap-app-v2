"use client";
import { Spinner } from "@/components/Utilities/Spinner";
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement";
import { useSearchParams } from "next/navigation";
import { CategoryRow } from "./CategoryRow";

export const CommunityImpactCharts = () => {
  const searchParams = useSearchParams();
  const projectSelected = searchParams.get("projectId");
  const { data, isLoading } = useImpactMeasurement(projectSelected);

  const outputs = data?.data;

  const orderedData = outputs?.sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName)
  );

  return (
    <div className="flex flex-col gap-4 flex-1 mb-10">
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner />
        </div>
      ) : (
        orderedData?.map((program, index) => (
          <>
            <CategoryRow key={program.categoryName} program={program} />
            {index !== orderedData.length - 1 && (
              <div className="w-full my-8 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
            )}
          </>
        ))
      )}
    </div>
  );
};
