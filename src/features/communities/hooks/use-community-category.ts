"use client";
import { getCommunityCategory } from "@/utilities/queries/getCommunityCategory";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

function useCommunityCategory() {
  const { communityId } = useParams();

  return useQuery({
    queryKey: ["community-category", communityId],
    queryFn: () => getCommunityCategory(communityId as string),
  });
}

export default useCommunityCategory;
