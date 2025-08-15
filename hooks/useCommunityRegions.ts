"use client";
import { getCommunityRegions } from "@/utilities/queries/getCommunityRegions";
import { useQuery } from "@tanstack/react-query";

export interface RegionOption {
  id: string;
  name: string;
  communityId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useCommunityRegions(communityId: string) {
  return useQuery({
    queryKey: ["community-regions", communityId],
    queryFn: () => getCommunityRegions(communityId),
    enabled: !!communityId,
  });
}