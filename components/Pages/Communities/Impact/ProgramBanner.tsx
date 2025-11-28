import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import pluralize from "pluralize";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useCommunityProjects } from "@/hooks/useCommunityProjects";
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement";
import { getAllProgramsOfCommunity } from "@/utilities/registry/getAllProgramsOfCommunity";

export const ProgramBanner = () => {
  const { communityId } = useParams();
  const searchParams = useSearchParams();
  const projectSelected = searchParams.get("projectId");
  const programSelected = searchParams.get("programId");
  const { data: impactData, isLoading: isImpactLoading } = useImpactMeasurement(projectSelected);

  const { data } = useQuery({
    queryKey: ["programs"],
    queryFn: () => getAllProgramsOfCommunity(communityId as string),
  });
  const programs = data?.map((program) => ({
    title: program.metadata?.title || "",
    value: `${program.programId}_${program.chainID}` || "", // Match ProgramFilter format
    // id: program.programId || "",
  }));

  const [selectedProgramId] = useQueryState<string | null>("programId", {
    defaultValue: null,
    serialize: (value) => value ?? "",
    parse: (value) => value || null,
  });
  const selectedProgram = programs?.find((program) => program.value === selectedProgramId);

  // Always get total projects count (without program filter)
  const { data: allProjects, isLoading: isAllProjectsLoading } = useCommunityProjects(null);

  // Get filtered projects count when program is selected
  const { data: filteredProjects, isLoading: isFilteredProjectsLoading } =
    useCommunityProjects(programSelected);

  // Use different logic based on what's selected:
  // - If project is selected: show 1 project
  // - If only program is selected: show filtered count
  // - If nothing selected: show total count
  let totalProjects: number;
  let isProjectsLoading: boolean;

  if (projectSelected) {
    totalProjects = 1; // Single project selected
    isProjectsLoading = false;
  } else if (programSelected) {
    totalProjects = filteredProjects?.length || 0; // Program filtered count
    isProjectsLoading = isFilteredProjectsLoading;
  } else {
    totalProjects = allProjects?.length || 0; // All projects count
    isProjectsLoading = isAllProjectsLoading;
  }
  const totalCategories = impactData?.stats.totalCategories;

  return (
    <div className="px-4 py-3 border border-gray-300 rounded">
      <div className="border-l-[#7839EE] border-l-2 pl-4">
        <p className="text-black dark:text-zinc-300 text-2xl font-semibold">
          {projectSelected
            ? selectedProgram
              ? `${selectedProgram?.title} (Project Filtered)`
              : "All Programs (Project Filtered)"
            : selectedProgram
              ? `${selectedProgram?.title}`
              : "All Programs"}
        </p>
        {isImpactLoading || isProjectsLoading ? (
          <Skeleton className="w-40 h-8" />
        ) : (
          <span className="text-gray-500 dark:text-zinc-500 text-lg font-medium">
            {totalProjects} {pluralize("Project", totalProjects)}, {totalCategories}{" "}
            {pluralize("category", totalCategories)}
          </span>
        )}
      </div>
    </div>
  );
};
