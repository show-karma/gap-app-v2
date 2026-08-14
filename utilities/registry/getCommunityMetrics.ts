import { isValidCommunityMetricsResponse } from "@/components/Pages/Communities/Impact/communityMetricsUtils";
import { errorManager } from "@/components/Utilities/errorManager";
import type { CommunityMetricsResponse } from "@/types/community-metrics";
import { api } from "../api/client";
import { HttpError } from "../api/errors";
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
    // TODO(#1775): add zod schema — the response can be either the new or
    // legacy shape, both validated below via hand-rolled type guards; a
    // strict schema here would duplicate/conflict with that validation.
    const data = await api.get<unknown>(endpoint);

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
    // If it's a 404, the endpoint might not exist yet - return null gracefully.
    // For other errors, log but still return null so component can handle gracefully.
    if (error instanceof HttpError && error.status === 404) {
      console.info(
        `Community metrics endpoint not found (404) for ${communityIdOrSlug}. This is expected if the endpoint is not yet implemented.`
      );
      return null;
    }

    if (error instanceof HttpError) {
      console.error("Error fetching community metrics:", error, "Status:", error.status);
      errorManager("Error fetching community metrics", error);
      return null;
    }

    console.error("Error fetching community metrics:", error);
    errorManager("Error fetching community metrics", error);
    return null;
  }
}
