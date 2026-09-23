import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";

const API_BASE = envVars.NEXT_PUBLIC_GAP_INDEXER_URL || "http://localhost:4000";
// Blob-capable authenticated client for the CSV download (the shared `api`
// client parses JSON); mirrors the applications-export path.
const blobApiClient = createAuthenticatedApiClient(API_BASE, 30000);

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
  style: string | null;
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
    evaluations: (data.evaluations ?? []).map((row) => ({
      ...row,
      style: row.style ?? null,
    })),
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

export interface SimocracySimPersona {
  simUri: string;
  constitution: string | null;
  style: string | null;
}

export async function fetchSimocracySimPersona(
  programId: string,
  simUri: string
): Promise<SimocracySimPersona> {
  try {
    const data = await api.get<{ persona: SimocracySimPersona }>(
      INDEXER.V2.FUNDING_PROGRAMS.SIMOCRACY_SIM_PERSONA(programId, simUri)
    );
    return data?.persona ?? { simUri, constitution: null, style: null };
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }
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

export interface SimocracyCredentialSummary {
  identifier: string;
  did: string;
  handle: string;
  email: string | null;
  pds: string;
  verifiedAt: string;
}

export async function setSimocracyCredential(
  programId: string,
  appPassword: string
): Promise<SimocracyCredentialSummary> {
  try {
    const data = await api.put<{ credential: SimocracyCredentialSummary }>(
      INDEXER.V2.FUNDING_PROGRAMS.SIMOCRACY_CREDENTIAL(programId),
      { appPassword }
    );
    if (!data?.credential) {
      throw new Error("Empty response verifying the credential");
    }
    return data.credential;
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }
}

export async function deleteSimocracyCredential(programId: string): Promise<void> {
  try {
    await api.delete(INDEXER.V2.FUNDING_PROGRAMS.SIMOCRACY_CREDENTIAL(programId));
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }
}

export type SimocracyFeedbackVerdict = "up" | "down";

// Feedback is about one subject: an S-Process run (every run re-judges) or a
// milestone verdict comment. Exactly one of the two is set.
export type SimocracyFeedbackSubject = { runId: string } | { commentUri: string };

export function feedbackSubjectKey(subject: SimocracyFeedbackSubject): string {
  return "runId" in subject ? subject.runId : subject.commentUri;
}

export function feedbackMatchesSubject(
  entry: Pick<SimocracyEvaluationFeedback, "runId" | "commentUri">,
  subject: SimocracyFeedbackSubject
): boolean {
  return "runId" in subject
    ? entry.runId === subject.runId
    : entry.commentUri === subject.commentUri;
}

export interface SimocracyEvaluationFeedback {
  referenceNumber: string;
  runId: string | null;
  commentUri: string | null;
  simUri: string;
  authorAddress: string;
  authorName?: string | null;
  verdict: SimocracyFeedbackVerdict;
  comment: string | null;
  updatedAt: string;
}

// Without a subject, every feedback entry of the application (all runs and
// milestone verdicts) comes back in one request.
export async function fetchSimocracyFeedback(
  referenceNumber: string,
  subject?: SimocracyFeedbackSubject
): Promise<SimocracyEvaluationFeedback[]> {
  try {
    const query = subject
      ? `?${"runId" in subject ? "runId" : "commentUri"}=${encodeURIComponent(feedbackSubjectKey(subject))}`
      : "";
    const data = await api.get<{ feedback: SimocracyEvaluationFeedback[] }>(
      `${INDEXER.V2.FUNDING_APPLICATIONS.SIMOCRACY_FEEDBACK(referenceNumber)}${query}`
    );
    return data?.feedback ?? [];
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }
}

export interface SimocracyFeedbackExport {
  blob: Blob;
  filename: string;
}

// Downloads the program's Sim evaluations + reviewer feedback as CSV. The
// endpoint is community-admin/staff only (enforced on the backend).
export async function exportSimocracyFeedbackCsv(
  programId: string
): Promise<SimocracyFeedbackExport> {
  try {
    const response = await blobApiClient.get<Blob>(
      INDEXER.V2.FUNDING_PROGRAMS.SIMOCRACY_FEEDBACK_EXPORT(programId),
      { responseType: "blob" }
    );
    const disposition = response.headers?.["content-disposition"] as string | undefined;
    const match = disposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    const filename = match?.[1]
      ? match[1].replace(/['"]/g, "")
      : `simocracy_feedback_${programId}.csv`;
    const data = response.data;
    const blob = data instanceof Blob ? data : new Blob([data], { type: "text/csv" });
    return { blob, filename };
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }
}

export interface SimocracyCommentRow {
  commentUri: string;
  authorDid: string;
  // The Sim the comment is attributed to; null for unattributed comments.
  authorSimUri: string | null;
  authorName: string | null;
  text: string;
  referenceNumber: string;
  proposalUri: string;
  parentCommentUri: string | null;
  // Set when Karma posted the comment as a Sim's milestone verdict.
  milestoneUid: string | null;
  createdAt: string | null;
}

export interface SimocracyCommentsResult {
  // Program the comments belong to; lets the list resolve Sim avatars from the council.
  programId: string | null;
  comments: SimocracyCommentRow[];
  // The viewer lacks reviewer/admin/staff access — the section stays hidden.
  forbidden: boolean;
}

export async function fetchSimocracyComments(
  referenceNumber: string
): Promise<SimocracyCommentsResult> {
  try {
    const data = await api.get<{ programId?: string; comments: SimocracyCommentRow[] }>(
      INDEXER.V2.FUNDING_APPLICATIONS.SIMOCRACY_COMMENTS(referenceNumber)
    );
    return { programId: data?.programId ?? null, comments: data?.comments ?? [], forbidden: false };
  } catch (error) {
    // Comments are reviewer/admin/staff-only; a denial is data, not an error.
    if (error instanceof HttpError && (error.status === 403 || error.status === 401)) {
      return { programId: null, comments: [], forbidden: true };
    }
    throw new Error(httpErrorMessage(error));
  }
}

export async function submitSimocracyFeedback(
  referenceNumber: string,
  input: SimocracyFeedbackSubject & {
    simUri: string;
    verdict: SimocracyFeedbackVerdict;
    comment?: string;
  }
): Promise<SimocracyEvaluationFeedback> {
  try {
    const data = await api.post<{ feedback: SimocracyEvaluationFeedback }>(
      INDEXER.V2.FUNDING_APPLICATIONS.SIMOCRACY_FEEDBACK(referenceNumber),
      input
    );
    if (!data?.feedback) {
      throw new Error("Empty response saving feedback");
    }
    return data.feedback;
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }
}
