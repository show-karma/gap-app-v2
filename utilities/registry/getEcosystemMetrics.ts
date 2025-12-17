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

    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/db28d8a4-4dd0-431b-a175-d7cd91606f2f", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "getEcosystemMetrics.ts:39",
        message: "API response received",
        data: {
          hasData: !!data,
          totalMetrics: (data as any)?.totalMetrics,
          metricsLength: (data as any)?.metrics?.length,
          metrics: (data as any)?.metrics?.map((m: any) => ({
            id: m.id,
            name: m.name,
            datapointCount: m.datapointCount,
            hasLatestValue: !!m.latestValue,
            latestValue: m.latestValue,
            latestDate: m.latestDate,
            datapointsLength: m.datapoints?.length,
            firstDatapointDate: m.datapoints?.[0]?.date,
            lastDatapointDate: m.datapoints?.[m.datapoints?.length - 1]?.date,
          })),
          dateRange: (data as any)?.dateRange,
          params,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "G",
      }),
    }).catch(() => {});
    // #endregion

    return data as EcosystemMetricsResponse;
  } catch (error) {
    console.error("Error fetching ecosystem metrics:", error);
    errorManager("Error fetching ecosystem metrics", error);
    return null;
  }
}
