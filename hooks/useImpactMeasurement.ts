"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { ProgramImpactData } from "@/types/programs";
import { getProgramsImpact } from "@/utilities/registry/getProgramsImpact";

export function useImpactMeasurement() {
  const { communityId } = useParams();

  const queryKey = ["impact-measurement", communityId];

  const queryFn = async (): Promise<ProgramImpactData> => {
    return await getProgramsImpact(communityId as string);
  };

  return useQuery<ProgramImpactData>({
    queryKey,
    queryFn,
    enabled: !!communityId,
  });
}
