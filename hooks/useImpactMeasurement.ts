"use client";
import { getAllProgramsImpact } from "@/utilities/registry/getAllProgramsImpact";
import { getProgramImpact } from "@/utilities/registry/getProgramImpact";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { useCommunityCategory } from "./useCommunityCategory";

export function useImpactMeasurement() {
  const { communityId } = useParams();
  const searchParams = useSearchParams();
  const defaultProgramSelected = searchParams.get("programId");
  const { data: allCategories } = useCommunityCategory();

  const queryKey = defaultProgramSelected
    ? ["impact-measurement-project", defaultProgramSelected]
    : ["impact-measurement-projects"];

  const queryFn = () => {
    if (!allCategories) return;
    if (defaultProgramSelected) {
      return getProgramImpact(
        communityId as string,
        defaultProgramSelected,
        allCategories
      );
    }
    return getAllProgramsImpact(communityId as string, allCategories);
  };

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!communityId && !!allCategories,
  });
}
