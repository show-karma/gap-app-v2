import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "@/utilities/enviromentVars";
import type {
  CreditPack,
  CreditsResponse,
  PurchaseSessionResponse,
} from "../schemas/credit.schema";
import type {
  BulkJobResponse,
  EvaluationResultResponse,
  SessionCreateInput,
  SessionResponse,
} from "../schemas/session.schema";
import type {
  BuiltInTemplate,
  TemplateCreateInput,
  TemplateResponse,
} from "../schemas/template.schema";

const BASE = "/v2/evaluate";

const ENDPOINTS = {
  sessions: () => `${BASE}/sessions`,
  sessionList: (limit: number, offset: number) =>
    `${BASE}/sessions?limit=${limit}&offset=${offset}`,
  session: (id: string) => `${BASE}/sessions/${id}`,
  evaluate: (id: string) => `${BASE}/sessions/${id}/evaluate`,
  feedback: (id: string) => `${BASE}/sessions/${id}/feedback`,
  sample: (id: string) => `${BASE}/sessions/${id}/sample`,
  readyForBulk: (id: string) => `${BASE}/sessions/${id}/ready-for-bulk`,
  prompt: (id: string) => `${BASE}/sessions/${id}/prompt`,
  bulk: (id: string) => `${BASE}/sessions/${id}/bulk`,
  bulkJob: (sessionId: string, jobId: string) => `${BASE}/sessions/${sessionId}/bulk/${jobId}`,
  bulkProgress: (sessionId: string, jobId: string) =>
    `${BASE}/sessions/${sessionId}/bulk/${jobId}/progress`,
  bulkDownload: (sessionId: string, jobId: string) =>
    `${BASE}/sessions/${sessionId}/bulk/${jobId}/download`,
  bulkResult: (sessionId: string, jobId: string) =>
    `${BASE}/sessions/${sessionId}/bulk/${jobId}/result`,
  bulksList: (sessionId: string) => `${BASE}/sessions/${sessionId}/bulks`,
  templates: () => `${BASE}/templates`,
  template: (id: string) => `${BASE}/templates/${id}`,
  templatesBuiltIn: () => `${BASE}/templates/built-in`,
  credits: () => `${BASE}/credits`,
  creditsPurchase: () => `${BASE}/credits/purchase`,
} as const;

// NOTE(#1775): responses in this file are migrated with NO zod schema (the
// `api` client's untyped escape hatch) — the TS interfaces in ../schemas/*
// describe response shapes we haven't verified against the live BE contract.
// Add schemas incrementally per-endpoint in a follow-up.

/** Extracts the backend's `message` field (mirrors the legacy fetchData adapter). */
function toErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const bodyMessage = (error.body as { message?: string } | undefined)?.message;
    const causeMessage = (error.cause as { message?: string } | undefined)?.message;
    return bodyMessage || causeMessage || error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Awaits `promise`, normalizing a rejection or an empty payload into a single `Error`. */
async function unwrap<T>(promise: Promise<T>, fallbackMsg: string): Promise<T> {
  let data: T;
  try {
    data = await promise;
  } catch (error) {
    throw new Error(toErrorMessage(error) || fallbackMsg);
  }
  if (data === null || data === undefined) {
    throw new Error(fallbackMsg);
  }
  return data;
}

export const standaloneEvaluationService = {
  // ─── Sessions ─────────────────────────────────────────────────────────────
  createSession: async (input: SessionCreateInput): Promise<SessionResponse> => {
    return unwrap(
      api.post<SessionResponse>(ENDPOINTS.sessions(), input),
      "Failed to create session"
    );
  },

  listSessions: async (
    params: { limit?: number; offset?: number } = {}
  ): Promise<{ items: SessionResponse[]; total: number }> => {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;
    return unwrap(
      api.get<{ items: SessionResponse[]; total: number }>(ENDPOINTS.sessionList(limit, offset)),
      "Failed to list sessions"
    );
  },

  getSession: async (id: string): Promise<SessionResponse> => {
    return unwrap(api.get<SessionResponse>(ENDPOINTS.session(id)), "Failed to fetch session");
  },

  deleteSession: async (id: string): Promise<void> => {
    try {
      await api.delete(ENDPOINTS.session(id));
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },

  evaluateApplication: async (
    sessionId: string,
    applicationText: string
  ): Promise<EvaluationResultResponse> => {
    return unwrap(
      api.post<EvaluationResultResponse>(ENDPOINTS.evaluate(sessionId), { applicationText }),
      "Failed to evaluate application"
    );
  },

  submitFeedback: async (
    sessionId: string,
    feedback: string
  ): Promise<EvaluationResultResponse> => {
    return unwrap(
      api.post<EvaluationResultResponse>(ENDPOINTS.feedback(sessionId), { feedback }),
      "Failed to submit feedback"
    );
  },

  setSample: async (sessionId: string, sampleApplication: string): Promise<SessionResponse> => {
    return unwrap(
      api.post<SessionResponse>(ENDPOINTS.sample(sessionId), { sampleApplication }),
      "Failed to set sample"
    );
  },

  markReadyForBulk: async (sessionId: string): Promise<SessionResponse> => {
    return unwrap(
      api.post<SessionResponse>(ENDPOINTS.readyForBulk(sessionId)),
      "Failed to mark session ready for bulk"
    );
  },

  updatePrompt: async (sessionId: string, prompt: string): Promise<SessionResponse> => {
    return unwrap(
      api.patch<SessionResponse>(ENDPOINTS.prompt(sessionId), { prompt }),
      "Failed to update prompt"
    );
  },

  // ─── Bulk ─────────────────────────────────────────────────────────────────
  startBulkJob: async (
    sessionId: string,
    file: File,
    notificationEmail?: string
  ): Promise<BulkJobResponse> => {
    // Backend accepts the CSV as a JSON string (no @fastify/multipart wired). Read the file
    // text client-side and POST `{ csvContent }` — the orchestrator handles parsing + row caps.
    // `notificationEmail` is optional; when present, it overrides the Privy email lookup so
    // wallet-only users can still receive completion notifications.
    const csvContent = await file.text();
    const body: { csvContent: string; notificationEmail?: string } = { csvContent };
    if (notificationEmail) body.notificationEmail = notificationEmail;
    return unwrap(
      api.post<BulkJobResponse>(ENDPOINTS.bulk(sessionId), body),
      "Failed to start bulk job"
    );
  },

  getBulkJob: async (sessionId: string, jobId: string): Promise<BulkJobResponse> => {
    return unwrap(
      api.get<BulkJobResponse>(ENDPOINTS.bulkJob(sessionId, jobId)),
      "Failed to fetch bulk job"
    );
  },

  /**
   * Lists all bulk jobs for a session, newest first. Used by the FE to render
   * a history panel so past bulks survive refresh / cross-device.
   */
  listBulkJobs: async (sessionId: string): Promise<BulkJobResponse[]> => {
    return unwrap(
      api.get<BulkJobResponse[]>(ENDPOINTS.bulksList(sessionId)),
      "Failed to list bulk jobs"
    );
  },

  /**
   * Fetches the bulk-job result as structured `{ columns, rows }` JSON for
   * inline rendering. Same DB column the CSV download serializes from — this
   * is the JSON-shaped sibling.
   */
  getBulkResult: async (
    sessionId: string,
    jobId: string
  ): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> => {
    return unwrap(
      api.get<{ columns: string[]; rows: Record<string, unknown>[] }>(
        ENDPOINTS.bulkResult(sessionId, jobId)
      ),
      "Failed to fetch bulk result"
    );
  },

  /**
   * Fetches the bulk-job result CSV. The BE serializes from DB-stored
   * `{ columns, rows }` and streams `text/csv`. We use raw fetch + Privy token
   * (instead of the JSON-oriented `api` client) so we can read the response as
   * a Blob and trigger a browser download via an anchor click.
   */
  downloadBulkResultCsv: async (sessionId: string, jobId: string): Promise<Blob> => {
    const token = await TokenManager.getToken();
    const url = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${ENDPOINTS.bulkDownload(sessionId, jobId)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/csv",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        message = body.message || body.error || message;
      } catch {
        // ignore body parse errors
      }
      throw new Error(message);
    }
    return response.blob();
  },

  bulkProgressUrl: (sessionId: string, jobId: string): string =>
    `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${ENDPOINTS.bulkProgress(sessionId, jobId)}`,

  // ─── Templates ────────────────────────────────────────────────────────────
  createTemplate: async (input: TemplateCreateInput): Promise<TemplateResponse> => {
    return unwrap(
      api.post<TemplateResponse>(ENDPOINTS.templates(), input),
      "Failed to create template"
    );
  },

  listTemplates: async (): Promise<TemplateResponse[]> => {
    return unwrap(api.get<TemplateResponse[]>(ENDPOINTS.templates()), "Failed to list templates");
  },

  deleteTemplate: async (id: string): Promise<void> => {
    try {
      await api.delete(ENDPOINTS.template(id));
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },

  listBuiltInTemplates: async (): Promise<BuiltInTemplate[]> => {
    // Public endpoint — no auth required.
    return unwrap(
      api.get<BuiltInTemplate[]>(ENDPOINTS.templatesBuiltIn(), { isAuthorized: false }),
      "Failed to list built-in templates"
    );
  },

  // ─── Credits ──────────────────────────────────────────────────────────────
  getCredits: async (): Promise<CreditsResponse> => {
    return unwrap(api.get<CreditsResponse>(ENDPOINTS.credits()), "Failed to fetch credits");
  },

  createPurchaseSession: async (
    pack: CreditPack,
    successUrl: string,
    cancelUrl: string
  ): Promise<PurchaseSessionResponse> => {
    return unwrap(
      api.post<PurchaseSessionResponse>(ENDPOINTS.creditsPurchase(), {
        pack,
        successUrl,
        cancelUrl,
      }),
      "Failed to create purchase session"
    );
  },
};
