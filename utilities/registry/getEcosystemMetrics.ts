import { errorManager } from "@/components/Utilities/errorManager";
import type { EcosystemMetricsResponse } from "@/types/ecosystem-metrics";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

export interface GetEcosystemMetricsParams {
  startDate?: string;
  endDate?: string;
  metricNames?: string;
}

export async function getEcosystemMetrics(
  communityIdOrSlug: string,
  params?: GetEcosystemMetricsParams
): Promise<EcosystemMetricsResponse | null> {
  try {
    const endpoint = INDEXER.COMMUNITY.V2.ECOSYSTEM_METRICS(communityIdOrSlug, params);
    const [data, error, , status] = await fetchData(endpoint);

    if (error) {
      // If it's a 404, the endpoint might not exist yet - return null gracefully
      // For other errors, log but still return null so component can handle gracefully
      if (status === 404) {
        console.log(
          `Ecosystem metrics endpoint not found (404) for ${communityIdOrSlug}. This is expected if the endpoint is not yet implemented.`
        );
      } else {
        console.error("Error fetching ecosystem metrics:", error, "Status:", status);
        errorManager("Error fetching ecosystem metrics", error);
      }
      return null;
    }

    // If data is null or undefined, return null
    if (!data) {
      return null;
    }

    return data as EcosystemMetricsResponse;
  } catch (error) {
    console.error("Error fetching ecosystem metrics:", error);
    errorManager("Error fetching ecosystem metrics", error);
    return null;
  }
}
