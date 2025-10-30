import type { FundingProgram } from "@/services/fundingPlatformService";
import { envVars } from "@/utilities/enviromentVars";
import { transformLiveFundingOpportunities } from "@/utilities/funding-programs";

/**
 * Server-side function to fetch live funding opportunities
 * Uses native fetch with Next.js caching for optimal performance
 * Uses the shared transformation utility to ensure consistency with client-side hook
 */
export async function getLiveFundingOpportunities(): Promise<FundingProgram[]> {
  try {
    const baseURL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL || "http://localhost:4000";
    const response = await fetch(`${baseURL}/v2/funding-program-configs/enabled`, {
      next: { revalidate: 300 }, // Revalidate every 5 minutes (same as staleTime in hook)
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch enabled programs:", response.statusText);
      return [];
    }

    const programs = await response.json() as any[];
    return transformLiveFundingOpportunities(programs);
  } catch (error) {
    console.error("Error fetching live funding opportunities:", error);
    return [];
  }
}

