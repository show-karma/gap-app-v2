import { fundingProgramsAPI } from "@/services/fundingPlatformService";
import { transformLiveFundingOpportunities } from "@/utilities/funding-programs";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { errorManager } from "@/components/Utilities/errorManager";

/**
 * Application service to fetch live funding opportunities
 * Orchestrates data fetching and transformation for domain operations
 */
export async function getLiveFundingOpportunities(): Promise<FundingProgram[]> {
  try {
    const programs = await fundingProgramsAPI.getEnabledProgramsServer();
    return transformLiveFundingOpportunities(programs);
  } catch (error) {
    errorManager(`Error fetching live funding opportunities: ${error}`, error);
    return [];
  }
}

