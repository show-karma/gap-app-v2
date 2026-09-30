import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import { SIMOCRACY_ROUTES } from "@/utilities/indexer-simocracy";

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
      SIMOCRACY_ROUTES.applications.INTEGRATIONS(referenceNumber)
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
      SIMOCRACY_ROUTES.applications.INTEGRATION_SIMOCRACY(referenceNumber)
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
      SIMOCRACY_ROUTES.programs.INTEGRATION_SIMOCRACY(programId)
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

interface SimocracySimPersona {
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
      SIMOCRACY_ROUTES.programs.SIMOCRACY_SIM_PERSONA(programId, simUri)
    );
    return data?.persona ?? { simUri, constitution: null, style: null };
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }
}

export async function fetchSimocracyCouncil(programId: string): Promise<SimocracyCouncilSim[]> {
  try {
    const data = await api.get<CouncilResponse>(
      SIMOCRACY_ROUTES.programs.SIMOCRACY_COUNCIL(programId)
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
    const data = await api.get<SimLinksResponse>(SIMOCRACY_ROUTES.programs.SIM_LINKS(programId));
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
    const data = await api.post<SimLinksResponse>(SIMOCRACY_ROUTES.programs.SIM_LINKS(programId), {
      links: [link],
    });
    return data?.links ?? [];
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }
}

export async function deleteSimocracySimLink(programId: string, simUri: string): Promise<void> {
  try {
    await api.delete(SIMOCRACY_ROUTES.programs.SIM_LINKS(programId), {
      params: { simUri },
    });
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }
}

interface SimocracyCredentialSummary {
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
      SIMOCRACY_ROUTES.programs.SIMOCRACY_CREDENTIAL(programId),
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
    await api.delete(SIMOCRACY_ROUTES.programs.SIMOCRACY_CREDENTIAL(programId));
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
  // The verdict revision the feedback was left on; null for S-Process subjects.
  revision?: number | null;
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
      `${SIMOCRACY_ROUTES.applications.SIMOCRACY_FEEDBACK(referenceNumber)}${query}`
    );
    return data?.feedback ?? [];
  } catch (error) {
    throw new Error(httpErrorMessage(error));
  }
}

interface SimocracyFeedbackExport {
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
      SIMOCRACY_ROUTES.programs.SIMOCRACY_FEEDBACK_EXPORT(programId),
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

interface SimocracyCommentsResult {
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
      SIMOCRACY_ROUTES.applications.SIMOCRACY_COMMENTS(referenceNumber)
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
      SIMOCRACY_ROUTES.applications.SIMOCRACY_FEEDBACK(referenceNumber),
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

export type SimocracyVerdictStatus = "pending_review" | "publishing" | "published" | "dismissed";
export type SimocracyVerdictPublishBlocker =
  | "already_published"
  | "publishing"
  | "dismissed"
  | "not_sim_owner";

export interface SimocracyVerdictFeedbackEntry {
  authorAddress: string;
  authorName: string | null;
  verdict: SimocracyFeedbackVerdict;
  comment: string | null;
  revision: number | null;
  createdAt: string | null;
}

// A Sim's milestone verdict as Karma holds it: private until a reviewer
// publishes it, then mirrored into the public comment list.
export interface SimocracyMilestoneVerdictRow {
  verdictId: string;
  milestoneUid: string;
  milestoneTitle: string | null;
  simUri: string;
  simName: string;
  commentUri: string;
  text: string;
  status: SimocracyVerdictStatus;
  revision: number;
  publishedRevision: number | null;
  publishedAt: string | null;
  publishedBy: string | null;
  dismissedAt: string | null;
  dismissedBy: string | null;
  updatedAt: string | null;
  canPublish: boolean;
  publishBlocker: SimocracyVerdictPublishBlocker | null;
  feedback: SimocracyVerdictFeedbackEntry[];
}

export interface SimocracyMilestoneVerdictsResult {
  verdicts: SimocracyMilestoneVerdictRow[];
  // The viewer is not a reviewer/admin/staff of the program.
  forbidden: boolean;
}

export async function fetchSimocracyMilestoneVerdicts(
  referenceNumber: string
): Promise<SimocracyMilestoneVerdictsResult> {
  try {
    const data = await api.get<{ verdicts: SimocracyMilestoneVerdictRow[] }>(
      SIMOCRACY_ROUTES.applications.SIMOCRACY_MILESTONE_VERDICTS(referenceNumber)
    );
    return { verdicts: data?.verdicts ?? [], forbidden: false };
  } catch (error) {
    if (error instanceof HttpError && (error.status === 403 || error.status === 401)) {
      return { verdicts: [], forbidden: true };
    }
    throw new Error(httpErrorMessage(error));
  }
}

export interface SimocracyVerdictApproval {
  verdictId: string;
  commentUri: string;
  cid: string;
  publishedRevision: number;
  alreadyPublished: boolean;
}

export class SimocracyVerdictApproveError extends Error {
  constructor(
    message: string,
    public readonly status: number | null
  ) {
    super(message);
    this.name = "SimocracyVerdictApproveError";
  }
}

const APPROVE_MESSAGES: Record<number, string> = {
  409: "The agent re-ran this verdict since you opened it. Reload to see the new revision.",
  422: "This verdict can no longer be published. Check that the milestone is still completed and the Sim is still on the council.",
  502: "Simocracy did not accept the verdict. Nothing was published; try again in a moment.",
  503: "The Simocracy council could not be read right now. Try again in a moment.",
};

export interface SimocracyVerdictDismissal {
  verdictId: string;
  revision: number;
  status: SimocracyVerdictStatus;
  alreadyDismissed: boolean;
}

const DISMISS_MESSAGES: Record<number, string> = {
  409: "This verdict changed since you opened it (published or re-run). Reload to see its current state.",
};

// Sets the current revision aside on Karma. Nothing reaches Simocracy; the
// next revision the agent submits re-opens the verdict.
export async function dismissSimocracyVerdict(
  referenceNumber: string,
  verdictId: string,
  revision: number
): Promise<SimocracyVerdictDismissal> {
  try {
    const data = await api.post<SimocracyVerdictDismissal>(
      SIMOCRACY_ROUTES.applications.SIMOCRACY_MILESTONE_VERDICT_DISMISS(referenceNumber, verdictId),
      { revision }
    );
    if (!data?.verdictId) {
      throw new Error("Empty response dismissing the verdict");
    }
    return data;
  } catch (error) {
    if (error instanceof HttpError) {
      throw new SimocracyVerdictApproveError(
        DISMISS_MESSAGES[error.status] || httpErrorMessage(error),
        error.status
      );
    }
    throw new SimocracyVerdictApproveError(httpErrorMessage(error), null);
  }
}

export async function approveSimocracyVerdict(
  referenceNumber: string,
  verdictId: string,
  revision: number
): Promise<SimocracyVerdictApproval> {
  try {
    const data = await api.post<SimocracyVerdictApproval>(
      SIMOCRACY_ROUTES.applications.SIMOCRACY_MILESTONE_VERDICT_APPROVE(referenceNumber, verdictId),
      { revision }
    );
    if (!data?.commentUri) {
      throw new Error("Empty response publishing the verdict");
    }
    return data;
  } catch (error) {
    if (error instanceof HttpError) {
      // A 422 carries the precise reason (milestone reverted, Sim off the
      // council, credential unreadable…); the fixed texts cover the rest.
      const serverMessage = error.status === 422 ? httpErrorMessage(error) : null;
      throw new SimocracyVerdictApproveError(
        serverMessage || APPROVE_MESSAGES[error.status] || httpErrorMessage(error),
        error.status
      );
    }
    throw new SimocracyVerdictApproveError(httpErrorMessage(error), null);
  }
}
