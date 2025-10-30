import { fundingProgramsAPI } from "@/services/fundingPlatformService";
import { transformLiveFundingOpportunities } from "@/utilities/funding-programs";
import type { FundingProgram } from "@/services/fundingPlatformService";

/**
 * Server-side function to fetch live funding opportunities
 * Uses the service layer method with shared transformation utility
 */
export async function getLiveFundingOpportunities(): Promise<FundingProgram[]> {
  try {
    const programs = await fundingProgramsAPI.getEnabledProgramsServer();
    return transformLiveFundingOpportunities(programs);
  } catch (error) {
    console.error("Error fetching live funding opportunities:", error);
    return [];
  }
}

