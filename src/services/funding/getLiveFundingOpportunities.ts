import { errorManager } from "@/components/Utilities/errorManager";
import type { FundingProgramResponse } from "@/src/features/funding-map/types/funding-program";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";

const API_BASE = envVars.NEXT_PUBLIC_GAP_INDEXER_URL || "http://localhost:4000";

/** Maximum programs to fetch for the homepage carousel */
const HOMEPAGE_PROGRAMS_LIMIT = 100;

/**
 * Server-side service to fetch live funding opportunities for the homepage.
 *
 * Uses the same endpoint and filters as the funding-map page:
 * - status: 'active' (programs with endsAt in the future or metadata.status = active)
 * - onlyOnKarma: true (programs with Karma configuration)
 *
 * Note: Uses native fetch instead of fetchData utility because:
 * 1. This runs in a Server Component where auth tokens aren't available
 * 2. Next.js fetch supports ISR caching via `next: { revalidate }` option
 * 3. The endpoint is public and doesn't require authentication
 *
 * Returns empty array on error to ensure graceful degradation.
 */
export async function getLiveFundingOpportunities(): Promise<FundingProgramResponse[]> {
  try {
    const searchParams = new URLSearchParams();
    searchParams.set("status", "active");
    searchParams.set("onlyOnKarma", "true");
    searchParams.set("limit", String(HOMEPAGE_PROGRAMS_LIMIT));

    const url = `${API_BASE}${INDEXER.V2.REGISTRY.GET_ALL}?${searchParams.toString()}`;

    // Use native fetch for Next.js ISR caching (5-minute revalidation)
    const response = await fetch(url, {
      next: { revalidate: 300 },
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      errorManager(
        `HTTP error fetching live funding opportunities: ${response.status}`,
        new Error(`HTTP ${response.status}`),
        { context: "getLiveFundingOpportunities", status: response.status }
      );
      return [];
    }

    const result = await response.json();
    return result.programs ?? [];
  } catch (error) {
    errorManager(`Error fetching live funding opportunities: ${error}`, error, {
      context: "getLiveFundingOpportunities",
    });
    // Return empty array for graceful degradation - shows empty state instead of crashing
    return [];
  }
}
