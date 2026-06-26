import type {
  AskQuestionsResponse,
  CandidateDiligenceView,
  DiligenceResponseContext,
  DiligenceTemplate,
  IntroQueuedResponse,
  RequestIntroResult,
  SaveDiligenceTemplateRequest,
  SubmitDiligenceResponseRequest,
  SubmitDiligenceResponseResult,
} from "@/types/diligence";
import { DILIGENCE_ENDPOINTS } from "@/utilities/diligenceEndpoints";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Nonprofit-diligence + advisor-intro API client (DEV-428).
 *
 * Authenticated advisor endpoints rely on the Privy token `fetchData`
 * attaches by default. The public nonprofit-response endpoints
 * (`fetchDiligenceResponseContext` / `submitDiligenceResponse`) pass
 * `isAuthorized = false` — the path token IS the capability, no session is
 * sent. The browser still attaches an `Origin` header automatically, which
 * the backend's origin allowlist checks (cross-origin → 403).
 *
 * `fetchData` returns the tuple `[data, error, pageInfo, status]`; we unwrap
 * into typed results and throw on hard failures so React Query hooks lean on
 * their built-in retry + cache layers.
 */

// -- Advisor: diligence template --------------------------------------------

/**
 * Loads the advisor's diligence question template. Always returns a stable
 * shape — a brand-new advisor gets `{ questions: [], updatedAt: null }`, never
 * a 404.
 */
export const getDiligenceTemplate = async (): Promise<DiligenceTemplate> => {
  const [data, error] = await fetchData<DiligenceTemplate>(DILIGENCE_ENDPOINTS.TEMPLATE);
  if (error || !data) {
    throw new Error(error || "Failed to load diligence template");
  }
  return data;
};

/**
 * Wholesale-replaces the advisor's diligence template. Passing
 * `questions: []` clears it. Returns the saved template (same shape as GET).
 */
export const saveDiligenceTemplate = async (
  body: SaveDiligenceTemplateRequest
): Promise<DiligenceTemplate> => {
  const [data, error] = await fetchData<DiligenceTemplate>(
    DILIGENCE_ENDPOINTS.TEMPLATE,
    "PUT",
    body
  );
  if (error || !data) {
    throw new Error(error || "Failed to save diligence template");
  }
  return data;
};

// -- Advisor: per-candidate diligence ---------------------------------------

/**
 * Loads the per-candidate diligence view that drives the two action buttons.
 * A 404 means the report/candidate isn't owned by the advisor (or doesn't
 * exist) — the backend never 403s, to avoid leaking existence. We surface it
 * as a thrown error so callers render a generic not-found state.
 */
export const getCandidateDiligence = async (
  reportId: string,
  candidateId: string
): Promise<CandidateDiligenceView> => {
  const [data, error] = await fetchData<CandidateDiligenceView>(
    DILIGENCE_ENDPOINTS.CANDIDATE(reportId, candidateId)
  );
  if (error || !data) {
    throw new Error(error || "Failed to load candidate diligence");
  }
  return data;
};

/**
 * Ask Questions — sends an anonymous diligence request (202, async). The email
 * is dispatched via the outbox, not synchronously, so callers should re-fetch
 * the candidate view shortly after. Idempotent per candidate, so retries are
 * safe.
 */
export const askQuestions = async (
  reportId: string,
  candidateId: string
): Promise<AskQuestionsResponse> => {
  const [data, error] = await fetchData<AskQuestionsResponse>(
    DILIGENCE_ENDPOINTS.REQUESTS(reportId, candidateId),
    "POST"
  );
  if (error || !data) {
    throw new Error(error || "Failed to send diligence request");
  }
  return data;
};

/**
 * Connect — sends a named intro that reveals the advisor identity (202,
 * async).
 *
 * Two outcomes are collapsed into {@link RequestIntroResult}:
 * - `kind: "queued"` — the intro was accepted (202).
 * - `kind: "email_required"` — the advisor has no resolvable email; NO intro
 *   was sent (422 with `requiredFields: ["email"]`). The caller must run the
 *   email-capture flow, persist the email, then re-POST.
 *
 * `fetchData` only exposes `response.data.message` (not the structured body),
 * so we key the email branch off the 422 status — the email-capture branch is
 * the only documented 422 for this endpoint.
 */
export const requestIntro = async (
  reportId: string,
  candidateId: string
): Promise<RequestIntroResult> => {
  const [data, error, , status] = await fetchData<IntroQueuedResponse>(
    DILIGENCE_ENDPOINTS.INTRO_REQUESTS(reportId, candidateId),
    "POST"
  );
  if (status === 422) {
    return {
      kind: "email_required",
      message: error || "Add your email so we can send a named intro.",
      requiredFields: ["email"],
    };
  }
  if (error || !data) {
    throw new Error(error || "Failed to send intro request");
  }
  return { kind: "queued", data };
};

/**
 * Persists the advisor's reply-to email, then the caller re-POSTs the intro.
 * Used only by the Connect → 422 `requiredFields:["email"]` recovery branch.
 *
 * ⚠️ UNVERIFIED CONTRACT — the integration guide (§3.4 step 2) says the email
 * is saved through "the same endpoint onboarding uses", but the onboarding
 * `POST /me` body carries no email field, and the DEV-427 backend is not
 * present in this checkout to confirm the real shape. This calls
 * `PUT /v2/donor-research/me` with `{ email }` as the best-effort shape and
 * MUST be re-pointed once the endpoint is confirmed with backend (DEV-427).
 */
export const updateAdvisorEmail = async (email: string): Promise<void> => {
  const [, error] = await fetchData(INDEXER.DONOR_RESEARCH.ME, "PUT", { email });
  if (error) {
    throw new Error(error || "Failed to save your email");
  }
};

// -- Public nonprofit response surface (unauthenticated) ---------------------

/**
 * Error carrying the HTTP status from a public-submit failure so the UI can
 * branch (429 rate-limit, 403 origin, 422 validation, 404 invalid token).
 */
export class DiligenceSubmitError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "DiligenceSubmitError";
    this.status = status;
  }
}

/**
 * Loads the nonprofit-safe page context for the secure link. Unauthenticated —
 * the token in the path is the capability.
 *
 * Unknown OR expired tokens both collapse to 404 on the backend (deliberate,
 * to prevent enumeration). We return `null` for that case so the page renders
 * one generic "link no longer valid" state. Any other error is thrown so the
 * page can retry / show an error boundary.
 */
export const fetchDiligenceResponseContext = async (
  token: string
): Promise<DiligenceResponseContext | null> => {
  const [data, error, , status] = await fetchData<DiligenceResponseContext>(
    DILIGENCE_ENDPOINTS.RESPONSE(token),
    "GET",
    {},
    {},
    {},
    false
  );
  // Unknown/expired (and the internal 410) collapse to "invalid link".
  if (status === 404 || status === 410) {
    return null;
  }
  if (error || !data) {
    throw new Error(error || "Failed to load this diligence request");
  }
  return data;
};

/**
 * Submits the nonprofit's answers (201). Unauthenticated; the browser attaches
 * the `Origin` header the backend's allowlist checks.
 *
 * Throws {@link DiligenceSubmitError} (carrying the status) on failure so the
 * caller can show the right message: 429 → "please wait and retry", 403 →
 * hard error, 404 → invalid link, 422 → validation.
 */
export const submitDiligenceResponse = async (
  token: string,
  body: SubmitDiligenceResponseRequest
): Promise<SubmitDiligenceResponseResult> => {
  const [data, error, , status] = await fetchData<SubmitDiligenceResponseResult>(
    DILIGENCE_ENDPOINTS.RESPONSE(token),
    "POST",
    body,
    {},
    {},
    false
  );
  if (error || !data) {
    throw new DiligenceSubmitError(error || "Failed to submit your answers", status ?? 500);
  }
  return data;
};
