"use client";
import { getAllProgramsImpactAggregate } from "@/utilities/registry/getAllProgramsImpactAggregate";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useCommunityCategory } from "./useCommunityCategory";

export function useImpactCommunityAggregate() {
  const { communityId } = useParams();
  const { data: allCategories } = useCommunityCategory();

  const queryKey = ["impact-measurement-aggregate"];

  const queryFn = () => {
    if (!allCategories) return;
    return getAllProgramsImpactAggregate(communityId as string);
  };

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!communityId && !!allCategories,
  });
}
