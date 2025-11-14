"use client"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { getCommunityCategory } from "@/utilities/queries/getCommunityCategory"

export function useCommunityCategory() {
  const { communityId } = useParams()

  return useQuery({
    queryKey: ["community-category", communityId],
    queryFn: () => getCommunityCategory(communityId as string),
  })
}
