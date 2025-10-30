import { useQuery } from "@tanstack/react-query";
import { fundingProgramsAPI } from "@/services/fundingPlatformService";
import type { FundingProgram } from "@/services/fundingPlatformService";

export function useLiveFundingOpportunities() {
  return useQuery({
    queryKey: ["live-funding-opportunities"],
    queryFn: async () => {
      // Fetch enabled programs - backend returns full FundingProgram objects
      const programs = await fundingProgramsAPI.getEnabledPrograms() as any[];
      
      // Transform to FundingProgram[] - backend returns full program objects
      const transformedPrograms = programs.map((program: any): FundingProgram => {
        // Backend returns FundingProgram objects with all fields
        return program as FundingProgram;
      });

      // Filter to only include programs with valid metadata/title
      const validPrograms = transformedPrograms.filter(
        (program) => 
          (program.metadata?.title || program.name) && program.applicationConfig?.isEnabled
      );

      // Sort by startsAt date (most recent first)
      const sortedPrograms = validPrograms.sort((a, b) => {
        const aStartsAt = a.metadata?.startsAt;
        const bStartsAt = b.metadata?.startsAt;
        if (!aStartsAt && !bStartsAt) return 0;
        if (!aStartsAt) return 1;
        if (!bStartsAt) return -1;
        return new Date(bStartsAt).getTime() - new Date(aStartsAt).getTime();
      });

      return sortedPrograms;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

