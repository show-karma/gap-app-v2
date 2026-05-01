import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "@/utilities/enviromentVars";
import fetchData from "@/utilities/fetchData";
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

function unwrap<T>(
  result: [T, null, unknown, number] | [null, string, null, number],
  fallbackMsg: string
): T {
  const [data, error] = result;
  if (error || !data) {
    throw new Error(error || fallbackMsg);
  }
  return data;
}

export const standaloneEvaluationService = {
  // ─── Sessions ─────────────────────────────────────────────────────────────
  createSession: async (input: SessionCreateInput): Promise<SessionResponse> => {
    const result = await fetchData<SessionResponse>(ENDPOINTS.sessions(), "POST", input);
    return unwrap(result, "Failed to create session");
  },

  listSessions: async (
    params: { limit?: number; offset?: number } = {}
  ): Promise<{ items: SessionResponse[]; total: number }> => {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;
    const result = await fetchData<{ items: SessionResponse[]; total: number }>(
      ENDPOINTS.sessionList(limit, offset),
      "GET"
    );
    return unwrap(result, "Failed to list sessions");
  },

  getSession: async (id: string): Promise<SessionResponse> => {
    const result = await fetchData<SessionResponse>(ENDPOINTS.session(id), "GET");
    return unwrap(result, "Failed to fetch session");
  },

  deleteSession: async (id: string): Promise<void> => {
    const [, error] = await fetchData(ENDPOINTS.session(id), "DELETE");
    if (error) throw new Error(error);
  },

  evaluateApplication: async (
    sessionId: string,
    applicationText: string
  ): Promise<EvaluationResultResponse> => {
    const result = await fetchData<EvaluationResultResponse>(
      ENDPOINTS.evaluate(sessionId),
      "POST",
      { applicationText }
    );
    return unwrap(result, "Failed to evaluate application");
  },

  submitFeedback: async (
    sessionId: string,
    feedback: string
  ): Promise<EvaluationResultResponse> => {
    const result = await fetchData<EvaluationResultResponse>(
      ENDPOINTS.feedback(sessionId),
      "POST",
      { feedback }
    );
    return unwrap(result, "Failed to submit feedback");
  },

  setSample: async (sessionId: string, sampleApplication: string): Promise<SessionResponse> => {
    const result = await fetchData<SessionResponse>(ENDPOINTS.sample(sessionId), "POST", {
      sampleApplication,
    });
    return unwrap(result, "Failed to set sample");
  },

  markReadyForBulk: async (sessionId: string): Promise<SessionResponse> => {
    const result = await fetchData<SessionResponse>(ENDPOINTS.readyForBulk(sessionId), "POST");
    return unwrap(result, "Failed to mark session ready for bulk");
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
    const result = await fetchData<BulkJobResponse>(ENDPOINTS.bulk(sessionId), "POST", body);
    return unwrap(result, "Failed to start bulk job");
  },

  getBulkJob: async (sessionId: string, jobId: string): Promise<BulkJobResponse> => {
    const result = await fetchData<BulkJobResponse>(ENDPOINTS.bulkJob(sessionId, jobId), "GET");
    return unwrap(result, "Failed to fetch bulk job");
  },

  /**
   * Lists all bulk jobs for a session, newest first. Used by the FE to render
   * a history panel so past bulks survive refresh / cross-device.
   */
  listBulkJobs: async (sessionId: string): Promise<BulkJobResponse[]> => {
    const result = await fetchData<BulkJobResponse[]>(ENDPOINTS.bulksList(sessionId), "GET");
    return unwrap(result, "Failed to list bulk jobs");
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
    const result = await fetchData<{
      columns: string[];
      rows: Record<string, unknown>[];
    }>(ENDPOINTS.bulkResult(sessionId, jobId), "GET");
    return unwrap(result, "Failed to fetch bulk result");
  },

  /**
   * Fetches the bulk-job result CSV. The BE serializes from DB-stored
   * `{ columns, rows }` and streams `text/csv`. We use raw fetch + Privy token
   * (instead of the JSON-oriented `fetchData`) so we can read the response as
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
    const result = await fetchData<TemplateResponse>(ENDPOINTS.templates(), "POST", input);
    return unwrap(result, "Failed to create template");
  },

  listTemplates: async (): Promise<TemplateResponse[]> => {
    const result = await fetchData<TemplateResponse[]>(ENDPOINTS.templates(), "GET");
    return unwrap(result, "Failed to list templates");
  },

  deleteTemplate: async (id: string): Promise<void> => {
    const [, error] = await fetchData(ENDPOINTS.template(id), "DELETE");
    if (error) throw new Error(error);
  },

  listBuiltInTemplates: async (): Promise<BuiltInTemplate[]> => {
    // Public endpoint — no auth needed. fetchData still injects the token if available;
    // BE ignores it so this works for both anonymous and authenticated callers.
    const result = await fetchData<BuiltInTemplate[]>(
      ENDPOINTS.templatesBuiltIn(),
      "GET",
      {},
      {},
      {},
      false
    );
    return unwrap(result, "Failed to list built-in templates");
  },

  // ─── Credits ──────────────────────────────────────────────────────────────
  getCredits: async (): Promise<CreditsResponse> => {
    const result = await fetchData<CreditsResponse>(ENDPOINTS.credits(), "GET");
    return unwrap(result, "Failed to fetch credits");
  },

  createPurchaseSession: async (
    pack: CreditPack,
    successUrl: string,
    cancelUrl: string
  ): Promise<PurchaseSessionResponse> => {
    const result = await fetchData<PurchaseSessionResponse>(ENDPOINTS.creditsPurchase(), "POST", {
      pack,
      successUrl,
      cancelUrl,
    });
    return unwrap(result, "Failed to create purchase session");
  },
};

export type StandaloneEvaluationService = typeof standaloneEvaluationService;
