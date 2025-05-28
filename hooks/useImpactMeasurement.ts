"use client";
import { getProgramsImpact } from "@/utilities/registry/getProgramsImpact";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { useCommunityCategory } from "./useCommunityCategory";

export function useImpactMeasurement(projectSelected?: string | null) {
  const { communityId } = useParams();
  const searchParams = useSearchParams();
  const programSelected = searchParams.get("programId");
  const { data: allCategories } = useCommunityCategory();

  const queryKey = [
    "impact-measurement",
    communityId,
    programSelected || "all",
    projectSelected || "all",
  ];

  const queryFn = () => {
    return getProgramsImpact(
      communityId as string,
      allCategories,
      programSelected,
      projectSelected
    );
  };

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!communityId && !!allCategories,
  });
}
