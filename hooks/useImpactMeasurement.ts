"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { ProgramImpactData } from "@/types/programs";
import { getProgramsImpact, type ImpactFilters } from "@/utilities/registry/getProgramsImpact";

export function useImpactMeasurement(filters?: ImpactFilters) {
  const { communityId } = useParams();

  // Include filters in query key for proper cache separation
  const queryKey = [
    "impact-measurement",
    communityId,
    filters?.programId ?? "all",
    filters?.projectId ?? "all",
  ];

  const queryFn = async (): Promise<ProgramImpactData> => {
    return await getProgramsImpact(communityId as string, filters);
  };

  return useQuery<ProgramImpactData>({
    queryKey,
    queryFn,
    enabled: !!communityId,
  });
}
