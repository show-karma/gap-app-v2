"use client";
import { useCommunityCategory } from "@/features/communities/hooks/use-community-category";
import { getAllProgramsImpactAggregate } from "@/features/program-registry/lib/getAllProgramsImpactAggregate";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

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
