import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";

export interface IntegrationSummary {
  key: string;
  enabled: boolean;
}

export interface SimocracySim {
  simUri: string;
  simName: string | null;
  avatar: string | null;
}

export interface SimocracyMvfPoint {
  dollars: number;
  marginalValueMilli: number;
}

export interface SimocracyEvaluationRow {
  sim: SimocracySim;
  model: string | null;
  prompt: string | null;
  proposalUri: string;
  proposalTitle: string;
  reasoning: string;
  mvf: SimocracyMvfPoint[];
}

export interface SimocracyEvaluationsResponse {
  referenceNumber: string;
  programId: string;
  runId: string | null;
  evaluations: SimocracyEvaluationRow[];
}

interface IntegrationsIndexResponse {
  integrations: IntegrationSummary[];
}

function httpErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const bodyMessage = (error.body as { message?: string } | undefined)?.message;
    const causeMessage = (error.cause as { message?: string } | undefined)?.message;
    return bodyMessage || causeMessage || error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

export async function fetchApplicationIntegrations(
  referenceNumber: string
): Promise<IntegrationSummary[]> {
  try {
    const data = await api.get<IntegrationsIndexResponse>(
      INDEXER.V2.FUNDING_APPLICATIONS.INTEGRATIONS(referenceNumber)
    );
    return data?.integrations ?? [];
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }
}

export async function fetchSimocracyEvaluations(
  referenceNumber: string
): Promise<SimocracyEvaluationsResponse> {
  let data: SimocracyEvaluationsResponse | null;
  try {
    data = await api.get<SimocracyEvaluationsResponse>(
      INDEXER.V2.FUNDING_APPLICATIONS.INTEGRATION_SIMOCRACY(referenceNumber)
    );
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }

  if (!data) {
    throw new Error("Empty response from simocracy integration");
  }

  return {
    ...data,
    evaluations: data.evaluations ?? [],
  };
}
