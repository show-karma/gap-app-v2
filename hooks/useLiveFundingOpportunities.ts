import { useQuery } from "@tanstack/react-query";
import { errorManager } from "@/components/Utilities/errorManager";
import { fundingProgramsAPI } from "@/services/fundingPlatformService";
import { transformLiveFundingOpportunities } from "@/utilities/funding-programs";

export function useLiveFundingOpportunities() {
  return useQuery({
    queryKey: ["live-funding-opportunities"],
    queryFn: async () => {
      try {
        // Fetch enabled programs using the existing service
        const programs = (await fundingProgramsAPI.getEnabledPrograms()) as any[];
        // Use shared transformation utility for consistency
        return transformLiveFundingOpportunities(programs);
      } catch (error) {
        errorManager(
          `Error fetching live funding opportunities: ${error}`,
          error,
          { context: "useLiveFundingOpportunities" },
          { error: "Failed to load funding opportunities" }
        );
        // Re-throw so React Query can handle the error state properly
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
