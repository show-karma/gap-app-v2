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

export interface SimocracyAllocation {
  proposalTitle?: string;
  proposalUri?: string;
  amount?: number;
}

export interface SimocracyProgramSummary {
  programId: string;
  gatheringUri: string;
  enabled: boolean;
  sims: SimocracySim[];
  latestRunId: string | null;
  decisionStatus: string | null;
  ratifiedAt: string | null;
  allocations: SimocracyAllocation[] | null;
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

export async function fetchSimocracyProgramSummary(
  programId: string
): Promise<SimocracyProgramSummary> {
  let data: SimocracyProgramSummary | null;
  try {
    data = await api.get<SimocracyProgramSummary>(
      INDEXER.V2.FUNDING_PROGRAMS.INTEGRATION_SIMOCRACY(programId)
    );
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }

  if (!data) {
    throw new Error("Empty response from simocracy program summary");
  }

  return data;
}

export function hasEnabledIntegration(integrations: IntegrationSummary[] | undefined): boolean {
  return (integrations ?? []).some((integration) => integration.enabled);
}

export function isIntegrationEnabled(
  integrations: IntegrationSummary[] | undefined,
  key: string
): boolean {
  return (integrations ?? []).some((integration) => integration.key === key && integration.enabled);
}

export interface SimocracyCouncilSim {
  simUri: string;
  simName: string | null;
  avatar: string | null;
  ownerDid: string;
}

interface CouncilResponse {
  sims: SimocracyCouncilSim[];
}

export async function fetchSimocracyCouncil(programId: string): Promise<SimocracyCouncilSim[]> {
  try {
    const data = await api.get<CouncilResponse>(
      INDEXER.V2.FUNDING_PROGRAMS.SIMOCRACY_COUNCIL(programId)
    );
    return data?.sims ?? [];
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }
}

export interface SimocracySimLink {
  simUri: string;
  publicAddress: string;
}

interface SimLinksResponse {
  links: SimocracySimLink[];
}

export async function fetchSimocracySimLinks(programId: string): Promise<SimocracySimLink[]> {
  try {
    const data = await api.get<SimLinksResponse>(INDEXER.V2.FUNDING_PROGRAMS.SIM_LINKS(programId));
    return data?.links ?? [];
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }
}

export async function addSimocracySimLink(
  programId: string,
  link: SimocracySimLink
): Promise<SimocracySimLink[]> {
  try {
    const data = await api.post<SimLinksResponse>(
      INDEXER.V2.FUNDING_PROGRAMS.SIM_LINKS(programId),
      {
        links: [link],
      }
    );
    return data?.links ?? [];
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }
}

export async function deleteSimocracySimLink(programId: string, simUri: string): Promise<void> {
  try {
    await api.delete(INDEXER.V2.FUNDING_PROGRAMS.SIM_LINKS(programId), {
      params: { simUri },
    });
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }
}
