"use client"
import { useQuery } from "@tanstack/react-query"
import { useParams, useSearchParams } from "next/navigation"
import type { ProgramImpactData } from "@/types/programs"
import { getProgramsImpact } from "@/utilities/registry/getProgramsImpact"
import { useCommunityCategory } from "./useCommunityCategory"

export function useImpactMeasurement(projectSelected?: string | null) {
  const { communityId } = useParams()
  const searchParams = useSearchParams()
  const programSelected = searchParams.get("programId")
  const { data: allCategories } = useCommunityCategory()

  const queryKey = [
    "impact-measurement",
    communityId,
    programSelected || "all",
    projectSelected || "all",
  ]

  const queryFn = async (): Promise<ProgramImpactData> => {
    return await getProgramsImpact(
      communityId as string,
      allCategories,
      programSelected,
      projectSelected
    )
  }

  return useQuery<ProgramImpactData>({
    queryKey,
    queryFn,
    enabled: !!communityId,
  })
}
