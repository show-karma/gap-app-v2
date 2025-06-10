import { Skeleton } from "@/components/Utilities/Skeleton";
import { useCommunityCategory } from "@/hooks/useCommunityCategory";
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement";
import { getAllProgramsOfCommunity } from "@/utilities/registry/getAllProgramsOfCommunity";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import pluralize from "pluralize";

export const ProgramBanner = () => {
  const { communityId } = useParams();
  const searchParams = useSearchParams();
  const projectSelected = searchParams.get("projectId");
  const { data: impactData, isLoading: isImpactLoading } =
    useImpactMeasurement(projectSelected);

  const { data } = useQuery({
    queryKey: ["programs"],
    queryFn: () => getAllProgramsOfCommunity(communityId as string),
  });
  const programs = data?.map((program) => ({
    title: program.metadata?.title || "",
    value: program.programId || "",
    // id: program.programId || "",
  }));

  const [selectedProgramId] = useQueryState<string | null>("programId", {
    defaultValue: null,
    serialize: (value) => value ?? "",
    parse: (value) => value || null,
  });
  const selectedProgram = programs?.find(
    (program) => program.value === selectedProgramId
  );

  const totalProjects = impactData?.stats.totalProjects;
  const totalCategories = impactData?.stats.totalCategories;

  return (
    <div className="px-4 py-3 border border-gray-300 rounded">
      <div className="border-l-[#7839EE] border-l-2 pl-4">
        <p className="text-black dark:text-zinc-300 text-2xl font-semibold">
          {selectedProgram
            ? `Program: ${selectedProgram?.title}`
            : "All Programs"}
        </p>
        {isImpactLoading ? (
          <Skeleton className="w-40 h-8" />
        ) : (
          <span className="text-gray-500 dark:text-zinc-500 text-lg font-medium">
            {totalProjects} {pluralize("Project", totalProjects)},{" "}
            {totalCategories} {pluralize("category", totalCategories)}
          </span>
        )}
      </div>
    </div>
  );
};
