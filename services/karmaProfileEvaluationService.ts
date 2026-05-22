import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";

/**
 * Track-record evaluation client. Lives in its own file (rather than
 * piggy-backing on `fundingPlatformService.ts`) so the parent service file
 * stays under its quality-gate line budget. Hits the V2 backend endpoint
 * the indexer exposes for manually triggering a Karma Profile evaluation.
 */
const API_BASE = envVars.NEXT_PUBLIC_GAP_INDEXER_URL || "http://localhost:4000";
// 150s timeout matches Internal — the aggregator can take ~120s on cache miss.
const apiClient = createAuthenticatedApiClient(API_BASE, 150000);

export interface RunKarmaProfileEvaluationResponse {
  success: boolean;
  referenceNumber: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  evaluation: string;
  promptId: string;
  evaluatedAt: string;
  context: string;
  contextHash: string;
  skipReason?:
    | "no_field_configured"
    | "uid_empty"
    | "uid_invalid"
    | "project_not_found"
    | "aggregator_failed";
}

/**
 * Run Karma Profile (track-record) AI evaluation. Independent of the
 * Internal evaluation. Admin-only.
 */
export async function runKarmaProfileEvaluation(
  referenceNumber: string
): Promise<RunKarmaProfileEvaluationResponse> {
  const response = await apiClient.post(
    `/v2/funding-applications/${referenceNumber}/evaluate-karma-profile`,
    {}
  );
  return response.data;
}
