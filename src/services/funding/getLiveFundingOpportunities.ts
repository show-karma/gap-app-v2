import { fundingProgramsAPI } from "@/services/fundingPlatformService";
import { transformLiveFundingOpportunities } from "@/utilities/funding-programs";
import type { FundingProgram } from "@/services/fundingPlatformService";

/**
 * Application service to fetch live funding opportunities
 * Orchestrates data fetching and transformation for domain operations
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

