"use client";
import { getAllProgramsImpact } from "@/utilities/registry/getAllProgramsImpact";
import { getProgramImpact } from "@/utilities/registry/getProgramImpact";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { useCommunityCategory } from "./useCommunityCategory";

export function useImpactMeasurement(projectSelected?: string | null) {
  const { communityId } = useParams();
  const searchParams = useSearchParams();
  const programSelected = searchParams.get("programId");
  const { data: allCategories } = useCommunityCategory();

  const queryKey =
    programSelected || projectSelected
      ? ["impact-measurement-project", programSelected, projectSelected]
      : ["impact-measurement-projects"];

  const queryFn = () => {
    if (!allCategories) return;
    if (programSelected) {
      return getProgramImpact(
        communityId as string,
        programSelected,
        allCategories,
        projectSelected
      );
    }
    return getAllProgramsImpact(
      communityId as string,
      allCategories,
      projectSelected
    );
  };

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!communityId && !!allCategories,
  });
}
