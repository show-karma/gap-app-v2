/**
 * Nonprofit-diligence + advisor-intro API response types (DEV-428).
 *
 * Mirrors the gap-indexer DTOs documented in the DEV-427 integration guide.
 * Narrow by design — these describe only what the frontend consumes from the
 * wire, not the full backend domain model.
 *
 * Hard rule baked into the shapes: **anonymous until Connect.** The public
 * (nonprofit-facing) types below carry NO advisor / donor / contact / token
 * fields — the backend never sends them on the anonymous surface, so the UI
 * cannot accidentally leak advisor identity.
 */

/**
 * The five advisor-visible lifecycle states. The advisor never sees internal
 * backend lifecycle states — these are the only values that reach the FE.
 *
 * `intro_sent` always outranks the diligence states (Connect is the
 * further-along action).
 */
export type DiligenceCoarseStatus =
  | "not_requested"
  | "in_progress"
  | "answered"
  | "blocked"
  | "intro_sent";

/**
 * One advisor-authored diligence question. `id` is a stable opaque key the
 * frontend owns — it MUST stay stable across template edits so collected
 * answers stay keyed to the right question.
 */
export interface DiligenceQuestion {
  id: string;
  text: string;
}

/**
 * The advisor's one-per-advisor diligence question template. A brand-new
 * advisor returns `{ questions: [], updatedAt: null }` — always a stable
 * shape, never 404.
 */
export interface DiligenceTemplate {
  questions: DiligenceQuestion[];
  /** Null when the advisor has never saved a template. */
  updatedAt: string | null;
}

/** Wholesale-replace payload for PUT /me/diligence-template. */
export interface SaveDiligenceTemplateRequest {
  questions: DiligenceQuestion[];
}

/**
 * The diligence request snapshot for a candidate. `questions` is a FROZEN
 * snapshot taken when the request was sent — render collected answers against
 * this, not against the live template (they diverge after the advisor edits).
 */
export interface CandidateDiligenceRequest {
  requestId: string;
  questions: DiligenceQuestion[];
  requestedAt: string;
  /** Null until at least one answer has been accepted. */
  answeredAt: string | null;
}

/**
 * The latest accepted answers for a candidate, keyed by question id. Null
 * until an answer is accepted.
 */
export interface CandidateDiligenceAnswers {
  answers: Record<string, string>;
  receivedAt: string;
}

/** The named-intro (Connect) state for a candidate. Null if Connect unused. */
export interface CandidateIntro {
  introRequestId: string;
  requestedAt: string;
  /** Null while the intro is still queued in the outbox. */
  sentAt: string | null;
}

/**
 * Source of truth for whether the two action buttons may fire. Drive button
 * enable/disable from THIS, not from `coarseStatus` (which drives the badge).
 */
export interface CandidateDiligenceActions {
  canAskQuestions: boolean;
  canConnect: boolean;
}

/** GET .../candidates/:candidateId/diligence — drives the two buttons. */
export interface CandidateDiligenceView {
  reportId: string;
  candidateId: string;
  coarseStatus: DiligenceCoarseStatus;
  /** Null if "Ask Questions" was never used. */
  request: CandidateDiligenceRequest | null;
  /** Null until an answer is accepted. */
  latestAnswers: CandidateDiligenceAnswers | null;
  /** Null if "Connect" was never used. */
  intro: CandidateIntro | null;
  actions: CandidateDiligenceActions;
}

/** Which outreach email a preview describes (maps to the two send actions). */
export type OutreachAction = "diligence" | "intro";

/**
 * GET .../outreach-preview?action=… — the exact email the matching send action
 * would dispatch. `bodyText` is the editable default composition; `subject` is
 * system-owned. `fixedFooter` is non-editable content appended at send time
 * (the secure-link note for `diligence`, null for `intro`).
 */
export interface OutreachPreview {
  action: OutreachAction;
  subject: string;
  bodyText: string;
  fixedFooter: string | null;
  editable: { subject: boolean; body: boolean };
}

/** 202 response from POST .../diligence-requests. */
export interface AskQuestionsResponse {
  requestId: string;
  coarseStatus: DiligenceCoarseStatus;
}

/** 202 response from POST .../intro-requests when the intro is queued. */
export interface IntroQueuedResponse {
  introRequestId: string;
  coarseStatus: DiligenceCoarseStatus;
}

/**
 * 422 body from POST .../intro-requests when the advisor has no resolvable
 * email. NO intro was sent — the FE must run the email-capture flow then
 * re-POST.
 */
export interface IntroEmailRequired {
  requiredFields: string[];
  message: string;
}

/**
 * Discriminated result of a Connect request. The service collapses the
 * backend's 202 / 422-email branches into this union so the UI can branch
 * without inspecting raw status codes.
 */
export type RequestIntroResult =
  | { kind: "queued"; data: IntroQueuedResponse }
  | { kind: "email_required"; message: string; requiredFields: string[] };

// -- Public nonprofit response surface (NO auth, token = capability) ---------

/**
 * Nonprofit-safe page context (GET /diligence-response/:token). Deliberately
 * carries NO advisor / donor / contact / token fields — see the anonymity
 * rule at the top of this file.
 */
export interface DiligenceResponseContext {
  /** May be null when the org name wasn't resolved. */
  orgName: string | null;
  questions: DiligenceQuestion[];
  alreadySubmitted: boolean;
  expiresAt: string;
}

/** One answer in the public-submit payload, keyed by snapshot question id. */
export interface DiligenceAnswerInput {
  questionId: string;
  text: string;
}

/** POST /diligence-response/:token body. */
export interface SubmitDiligenceResponseRequest {
  answers: DiligenceAnswerInput[];
}

/**
 * 201 response from the public submit.
 *
 * - `submitted` is always `true` once any answer exists for the request.
 * - `accepted` is true only when THIS submission became the canonical
 *   advisor-visible answer (first-accepted-wins). `accepted: false,
 *   submitted: true` still means "show success".
 */
export interface SubmitDiligenceResponseResult {
  accepted: boolean;
  submitted: boolean;
}

// -- Client-side validation bounds (mirror the backend) ----------------------

export const DILIGENCE_TEMPLATE_LIMITS = {
  MAX_QUESTIONS: 50,
  QUESTION_ID_MAX: 100,
  QUESTION_TEXT_MAX: 1000,
} as const;

export const DILIGENCE_RESPONSE_LIMITS = {
  MAX_ANSWERS: 50,
  ANSWER_TEXT_MAX: 5000,
  QUESTION_ID_MAX: 128,
} as const;

export const OUTREACH_BODY_LIMITS = {
  /** Backend rejects trimmed bodies above this (OutreachActionBodySchema). */
  MAX_CHARS: 10_000,
  /** Show the live character counter once the body passes this. */
  COUNTER_THRESHOLD: 9_000,
} as const;
