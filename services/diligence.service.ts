import type {
  AskQuestionsResponse,
  CandidateDiligenceView,
  DiligenceResponseContext,
  DiligenceTemplate,
  IntroQueuedResponse,
  OutreachAction,
  OutreachPreview,
  RequestIntroResult,
  SaveDiligenceTemplateRequest,
  SubmitDiligenceResponseRequest,
  SubmitDiligenceResponseResult,
} from "@/types/diligence";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { DILIGENCE_ENDPOINTS } from "@/utilities/diligenceEndpoints";
import { fetchCurrentAdvisor, onboardAdvisor } from "./donor-research.service";

/**
 * Nonprofit-diligence + advisor-intro API client (DEV-428).
 *
 * Authenticated advisor endpoints rely on the Privy token the `api` client
 * attaches by default. The public nonprofit-response endpoints
 * (`fetchDiligenceResponseContext` / `submitDiligenceResponse`) pass
 * `isAuthorized: false` — the path token IS the capability, no session is
 * sent. The browser still attaches an `Origin` header automatically, which
 * the backend's origin allowlist checks (cross-origin → 403).
 *
 * The `api` client throws a typed `ApiError` on failure; we catch and
 * re-surface it as the domain-shaped result/thrown error each caller
 * expects, so React Query hooks lean on their built-in retry + cache layers.
 */

/**
 * Extracts the same human-readable error message the legacy `fetchData`
 * adapter surfaced for an `HttpError`: prefer the server response body's
 * `message`, then the original axios error's message, then the client's
 * synthetic message. Falls back to a plain `Error.message` (or
 * `String(error)`) for non-HTTP `ApiError`s.
 */
function httpErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const bodyMessage = (error.body as { message?: string } | undefined)?.message;
    const causeMessage = (error.cause as { message?: string } | undefined)?.message;
    return bodyMessage || causeMessage || error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

// -- Advisor: diligence template --------------------------------------------

/**
 * Loads the advisor's diligence question template. Always returns a stable
 * shape — a brand-new advisor gets `{ questions: [], updatedAt: null }`, never
 * a 404.
 */
export const getDiligenceTemplate = async (): Promise<DiligenceTemplate> => {
  let data: DiligenceTemplate | null;
  try {
    // TODO(#1775): add zod schema
    data = await api.get<DiligenceTemplate>(DILIGENCE_ENDPOINTS.TEMPLATE);
  } catch (error) {
    throw new Error(httpErrorMessage(error) || "Failed to load diligence template");
  }
  if (!data) {
    throw new Error("Failed to load diligence template");
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
  let data: DiligenceTemplate | null;
  try {
    // TODO(#1775): add zod schema
    data = await api.put<DiligenceTemplate>(DILIGENCE_ENDPOINTS.TEMPLATE, body);
  } catch (error) {
    throw new Error(httpErrorMessage(error) || "Failed to save diligence template");
  }
  if (!data) {
    throw new Error("Failed to save diligence template");
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
  let data: CandidateDiligenceView | null;
  try {
    // TODO(#1775): add zod schema
    data = await api.get<CandidateDiligenceView>(
      DILIGENCE_ENDPOINTS.CANDIDATE(reportId, candidateId)
    );
  } catch (error) {
    throw new Error(httpErrorMessage(error) || "Failed to load candidate diligence");
  }
  if (!data) {
    throw new Error("Failed to load candidate diligence");
  }
  return data;
};

/**
 * Loads the exact email a send action would dispatch (DEV-500) so the advisor
 * can review/edit the body first. The backend composes it with the same
 * builders as delivery, so preview and sent content cannot drift. A 404 means
 * the candidate is unknown / cross-advisor (same semantics as the diligence
 * view).
 */
export const getOutreachPreview = async (
  reportId: string,
  candidateId: string,
  action: OutreachAction
): Promise<OutreachPreview> => {
  let data: OutreachPreview | null;
  try {
    // TODO(#1775): add zod schema
    data = await api.get<OutreachPreview>(
      DILIGENCE_ENDPOINTS.OUTREACH_PREVIEW(reportId, candidateId, action)
    );
  } catch (error) {
    throw new Error(httpErrorMessage(error) || "Failed to load the email preview");
  }
  if (!data) {
    throw new Error("Failed to load the email preview");
  }
  return data;
};

/**
 * Ask Questions — sends an anonymous diligence request (202, async). The email
 * is dispatched via the outbox, not synchronously, so callers should re-fetch
 * the candidate view shortly after. Idempotent per candidate, so retries are
 * safe.
 *
 * `body` is the advisor-edited email body. Pass it ONLY when the advisor
 * actually edited the preview — omitted, the backend composes its own default,
 * which is the contract for an untouched textarea.
 */
export const askQuestions = async (
  reportId: string,
  candidateId: string,
  body?: string
): Promise<AskQuestionsResponse> => {
  let data: AskQuestionsResponse | null;
  try {
    // TODO(#1775): add zod schema
    data = await api.post<AskQuestionsResponse>(
      DILIGENCE_ENDPOINTS.REQUESTS(reportId, candidateId),
      body === undefined ? {} : { body }
    );
  } catch (error) {
    throw new Error(httpErrorMessage(error) || "Failed to send diligence request");
  }
  if (!data) {
    throw new Error("Failed to send diligence request");
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
 * The legacy `fetchData` adapter only exposed `response.data.message` (not
 * the structured body), so we key the email branch off the 422 status — the
 * email-capture branch is the only documented 422 for this endpoint.
 */
export const requestIntro = async (
  reportId: string,
  candidateId: string,
  body?: string
): Promise<RequestIntroResult> => {
  let data: IntroQueuedResponse | null;
  try {
    // TODO(#1775): add zod schema
    data = await api.post<IntroQueuedResponse>(
      DILIGENCE_ENDPOINTS.INTRO_REQUESTS(reportId, candidateId),
      body === undefined ? {} : { body }
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 422) {
      return {
        kind: "email_required",
        message: httpErrorMessage(error) || "Add your email so we can send a named intro.",
        requiredFields: ["email"],
      };
    }
    throw new Error(httpErrorMessage(error) || "Failed to send intro request");
  }
  if (!data) {
    throw new Error("Failed to send intro request");
  }
  return { kind: "queued", data };
};

/**
 * Persists the advisor's reply-to email, then the caller re-POSTs the intro.
 * Used only by the Connect → 422 `requiredFields:["email"]` recovery branch.
 *
 * The backend stores the email through the onboarding endpoint
 * (`POST /v2/donor-research/me`): `AdvisorOnboardingBodySchema` carries an
 * optional `email` that the write service writes to the advisor's contributor
 * profile — exactly the source the reply-to resolver reads. The POST is
 * idempotent on the advisor row, so we re-send the advisor's existing
 * `displayName`/`orgName`/`timezone` unchanged and only add the new email.
 * (There is no `PUT /me`; the prior shape 404'd.)
 */
export const updateAdvisorEmail = async (email: string): Promise<void> => {
  const advisor = await fetchCurrentAdvisor();
  if (!advisor) {
    throw new Error("Finish setting up your advisor profile before adding an email.");
  }
  await onboardAdvisor({
    displayName: advisor.displayName,
    orgName: advisor.orgName ?? null,
    timezone: advisor.timezone,
    email,
  });
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
  let data: DiligenceResponseContext | null;
  try {
    // TODO(#1775): add zod schema
    data = await api.get<DiligenceResponseContext>(DILIGENCE_ENDPOINTS.RESPONSE(token), {
      isAuthorized: false,
    });
  } catch (error) {
    // Unknown/expired (and the internal 410) collapse to "invalid link".
    if (error instanceof HttpError && (error.status === 404 || error.status === 410)) {
      return null;
    }
    throw new Error(httpErrorMessage(error) || "Failed to load this diligence request");
  }
  if (!data) {
    throw new Error("Failed to load this diligence request");
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
  let data: SubmitDiligenceResponseResult | null;
  try {
    // TODO(#1775): add zod schema
    data = await api.post<SubmitDiligenceResponseResult>(
      DILIGENCE_ENDPOINTS.RESPONSE(token),
      body,
      {
        isAuthorized: false,
      }
    );
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    throw new DiligenceSubmitError(
      httpErrorMessage(error) || "Failed to submit your answers",
      status
    );
  }
  if (!data) {
    throw new DiligenceSubmitError("Failed to submit your answers", 500);
  }
  return data;
};
