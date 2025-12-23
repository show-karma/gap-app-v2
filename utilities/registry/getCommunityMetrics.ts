import { isValidCommunityMetricsResponse } from "@/components/Pages/Communities/Impact/communityMetricsUtils";
import { errorManager } from "@/components/Utilities/errorManager";
import type { CommunityMetricsResponse } from "@/types/community-metrics";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";
import {
  isValidCommunityMetricsRawResponse,
  transformCommunityMetrics,
} from "./transformCommunityMetrics";

export interface GetCommunityMetricsParams {
  startDate?: string;
  endDate?: string;
  metricNames?: string;
}

export async function getCommunityMetrics(
  communityIdOrSlug: string,
  params?: GetCommunityMetricsParams
): Promise<CommunityMetricsResponse | null> {
  try {
    const endpoint = INDEXER.COMMUNITY.V2.COMMUNITY_METRICS(communityIdOrSlug, params);
    const [data, error, , status] = await fetchData(endpoint);

    if (error) {
      // If it's a 404, the endpoint might not exist yet - return null gracefully
      // For other errors, log but still return null so component can handle gracefully
      if (status === 404) {
        console.info(
          `Community metrics endpoint not found (404) for ${communityIdOrSlug}. This is expected if the endpoint is not yet implemented.`
        );
      } else {
        console.error("Error fetching community metrics:", error, "Status:", status);
        errorManager("Error fetching community metrics", error);
      }
      return null;
    }

    // If data is null or undefined, return null
    if (!data) {
      return null;
    }

    // Check if this is the new API format
    if (isValidCommunityMetricsRawResponse(data)) {
      // Transform the new API response to the internal format
      return transformCommunityMetrics(data);
    }

    // Fallback: validate old format before using (for backward compatibility during migration)
    // Use type guard instead of unsafe cast
    if (isValidCommunityMetricsResponse(data)) {
      return data;
    }

    // If data doesn't match expected format, log warning and return null
    console.warn("Community metrics data does not match expected format. Returning null.", data);
    return null;
  } catch (error) {
    console.error("Error fetching community metrics:", error);
    errorManager("Error fetching community metrics", error);
    return null;
  }
}
