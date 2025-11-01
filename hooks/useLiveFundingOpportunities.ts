import { useQuery } from "@tanstack/react-query";
import { fundingProgramsAPI } from "@/services/fundingPlatformService";
import { transformLiveFundingOpportunities } from "@/utilities/funding-programs";

export function useLiveFundingOpportunities() {
  return useQuery({
    queryKey: ["live-funding-opportunities"],
    queryFn: async () => {
      // Fetch enabled programs using the existing service
      const programs = await fundingProgramsAPI.getEnabledPrograms() as any[];
      // Use shared transformation utility for consistency
      return transformLiveFundingOpportunities(programs);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

