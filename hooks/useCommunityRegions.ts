"use client"
import { useQuery } from "@tanstack/react-query"
import { getCommunityRegions } from "@/utilities/queries/getCommunityRegions"

export interface RegionOption {
  id: string
  name: string
  communityId: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export function useCommunityRegions(communityId: string) {
  return useQuery({
    queryKey: ["community-regions", communityId],
    queryFn: () => getCommunityRegions(communityId),
    enabled: !!communityId,
  })
}
