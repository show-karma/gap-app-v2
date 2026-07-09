import type {
  CompositeWeights,
  DonorAdvisor,
  DonorHandle,
  DonorHandleList,
  DonorPersona,
  DonorResearchCountersSnapshot,
  PersonaProvenance,
  PersonaStructured,
  RefinementResult,
  ReportCreateResponse,
  ResearchReportDetail,
  ResearchReportList,
  SharedReportApiPayload,
  ShareTokenPayload,
} from "@/types/donor-research";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";

/**
 * Donor-research API client.
 *
 * All authenticated endpoints rely on the Privy session cookie/bearer token
 * that the `api` client attaches by default. The shared donor view
 * (`fetchSharedReport`) does NOT require authentication — the path token
 * IS the capability.
 *
 * Failure shape: the `api` client throws a typed `ApiError` on failure. We
 * unwrap successful responses into either the data object or `null` (for
 * the documented 404-as-empty-state cases below) and let every other
 * failure propagate so callers (React Query hooks) can lean on
 * `useQuery`'s built-in retry + cache layers.
 */

// -- Advisor -----------------------------------------------------------

/**
 * Fetches the current advisor row.
 *
 * Returns `null` only when the advisor hasn't onboarded yet — `GET /me`
 * returns 404 in exactly that one case (missing/invalid auth surfaces as
 * 401 earlier, and the route always exists), so a 404 is the unambiguous
 * "route to onboarding" signal. `fetchData` exposes only `response.data
 * .message`, not the structured error code, so we key off the status.
 * Any other error is thrown so React Query can retry / surface an error
 * state rather than silently sending the user to onboarding.
 */
export const fetchCurrentAdvisor = async (): Promise<DonorAdvisor | null> => {
  try {
    // TODO(#1775): add zod schema
    const data = await api.get<DonorAdvisor>(INDEXER.DONOR_RESEARCH.ME);
    if (!data) throw new Error("Failed to load advisor");
    return data;
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

export interface OnboardAdvisorRequest {
  displayName: string;
  /**
   * Advisor contact email — where report notifications are sent, and the
   * reply-to the Connect 422 email-capture recovery persists. The backend
   * writes it to the contributor profile the reply-to resolver reads.
   */
  email?: string;
  orgName?: string | null;
  timezone: string;
}

export const onboardAdvisor = async (body: OnboardAdvisorRequest): Promise<DonorAdvisor> => {
  // TODO(#1775): add zod schema
  const data = await api.post<DonorAdvisor>(INDEXER.DONOR_RESEARCH.ME, body);
  if (!data) throw new Error("Failed to onboard advisor");
  return data;
};

/**
 * Today's per-channel rate-limit counters + tier caps. Refreshed on each
 * page mount and after a successful report create so the
 * `RateLimitCounter` chip reflects what enforcement sees. `degraded`
 * true means Redis was unreachable on the backend — the chip should
 * still render but with a "—" usage value.
 */
export const fetchMyCounters = async (): Promise<DonorResearchCountersSnapshot> => {
  // TODO(#1775): add zod schema
  const data = await api.get<DonorResearchCountersSnapshot>(INDEXER.DONOR_RESEARCH.ME_COUNTERS);
  if (!data) throw new Error("Failed to load rate-limit counters");
  return data;
};

// -- Donor handles -----------------------------------------------------

export interface ListHandlesOptions {
  limit?: number;
  offset?: number;
}

export const listDonorHandles = async (
  options: ListHandlesOptions = {}
): Promise<DonorHandleList> => {
  const params: Record<string, number> = {};
  if (options.limit !== undefined) params.limit = options.limit;
  if (options.offset !== undefined) params.offset = options.offset;
  // TODO(#1775): add zod schema
  const data = await api.get<DonorHandleList>(INDEXER.DONOR_RESEARCH.HANDLES, { params });
  if (!data) throw new Error("Failed to load donor handles");
  return data;
};

export interface CreateHandleRequest {
  opaqueLabel: string;
  notes?: string | null;
}

export const createDonorHandle = async (body: CreateHandleRequest): Promise<DonorHandle> => {
  // TODO(#1775): add zod schema
  const data = await api.post<DonorHandle>(INDEXER.DONOR_RESEARCH.HANDLES, body);
  if (!data) throw new Error("Failed to create donor handle");
  return data;
};

/** Fetches a single donor handle. Powers the donor-detail page (U7). */
export const getDonorHandle = async (handleId: string): Promise<DonorHandle> => {
  // TODO(#1775): add zod schema
  const data = await api.get<DonorHandle>(INDEXER.DONOR_RESEARCH.HANDLE_BY_ID(handleId));
  if (!data) throw new Error("Failed to load donor handle");
  return data;
};

export interface UpdateHandleRequest {
  opaqueLabel?: string;
  /** Private advisor notes — NOT the persona source. `null` clears them. */
  notes?: string | null;
}

/**
 * Patches a donor handle (used by the detail page's private "Notes"
 * section). Only the provided keys are sent; omitted keys preserve.
 */
export const updateDonorHandle = async (
  handleId: string,
  body: UpdateHandleRequest
): Promise<DonorHandle> => {
  // TODO(#1775): add zod schema
  const data = await api.patch<DonorHandle>(INDEXER.DONOR_RESEARCH.HANDLE_BY_ID(handleId), body);
  if (!data) throw new Error("Failed to update donor handle");
  return data;
};

// -- Persona -----------------------------------------------------------

/**
 * Fetches the persona for a donor handle.
 *
 * Returns `null` on 404 — a handle with no persona yet is the normal empty
 * state, not an error (mirrors {@link fetchCurrentAdvisor}). Any other
 * failure throws so React Query can surface an error state.
 */
export const getDonorPersona = async (handleId: string): Promise<DonorPersona | null> => {
  try {
    // TODO(#1775): add zod schema
    const data = await api.get<DonorPersona>(INDEXER.DONOR_RESEARCH.PERSONA(handleId));
    if (!data) throw new Error("Failed to load donor persona");
    return data;
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

/** One chip in an {@link UpdateDonorPersonaInput}. */
export interface PersonaChipInput {
  value: string | null;
  /**
   * Provenance. MUST be absent when `value` is `null` (a cleared chip cannot
   * carry a source — the backend 400s otherwise); the serializer enforces
   * this. Defaults to `"manual"` when a value is present without one.
   */
  source?: PersonaProvenance;
}

/**
 * PUT body for {@link updateDonorPersona}. Every top-level key is optional:
 * an omitted key preserves the persisted value; an explicit `null` clears it.
 * Within `structured`, an omitted chip key preserves that chip.
 */
export interface UpdateDonorPersonaInput {
  sourceText?: string | null;
  narrative?: string | null;
  structured?: Partial<Record<keyof PersonaStructured, PersonaChipInput>>;
  /**
   * Refine-extracted scalars carried through so they persist (and then prefill
   * the report form). `null` clears the value; omit to preserve.
   */
  amountMin?: number | null;
  amountMax?: number | null;
  cause?: string | null;
  geography?: string | null;
}

/**
 * Builds the PUT request body, enforcing the wire contract:
 * - only keys present on `input` are included (omit = preserve);
 * - a cleared chip (`value: null`) is sent as `{ value: null }` WITHOUT a
 *   `source` (coherence — the backend rejects a null value carrying a source);
 * - a set chip is sent as `{ value, source }`, defaulting `source` to `manual`.
 *
 * Exported for direct unit testing of the serializer.
 */
export const buildPersonaPutBody = (input: UpdateDonorPersonaInput): Record<string, unknown> => {
  const body: Record<string, unknown> = {};
  if (input.sourceText !== undefined) body.sourceText = input.sourceText;
  if (input.narrative !== undefined) body.narrative = input.narrative;
  if (input.amountMin !== undefined) body.amountMin = input.amountMin;
  if (input.amountMax !== undefined) body.amountMax = input.amountMax;
  if (input.cause !== undefined) body.cause = input.cause;
  if (input.geography !== undefined) body.geography = input.geography;
  if (input.structured) {
    const structured: Record<string, unknown> = {};
    for (const [key, chip] of Object.entries(input.structured)) {
      if (!chip) continue;
      structured[key] =
        chip.value === null
          ? { value: null }
          : { value: chip.value, source: chip.source ?? "manual" };
    }
    body.structured = structured;
  }
  return body;
};

/** Persona rate-limit channels (PRD §1). */
type PersonaRateLimitChannel = "persona_refine" | "persona_write";

const PERSONA_RATE_LIMIT_MESSAGES: Record<PersonaRateLimitChannel, string> = {
  persona_refine: "You've hit the refine limit (20/hour). Try again shortly.",
  persona_write: "You've hit the save limit (60/hour). Try again shortly.",
};

/**
 * Thrown on a 429 from a persona write/refine. Carries the channel so the UI
 * can show an actionable, channel-specific message and leave editor state
 * untouched. `retryAfter` (seconds to the next hour boundary) is surfaced
 * when the backend provides it.
 */
export class DonorPersonaRateLimitError extends Error {
  readonly status = 429 as const;
  constructor(
    readonly channel: PersonaRateLimitChannel,
    readonly retryAfter?: number,
    message?: string
  ) {
    super(message || PERSONA_RATE_LIMIT_MESSAGES[channel]);
    this.name = "DonorPersonaRateLimitError";
  }
}

/** Upserts the persona. Returns the saved persona (incl. recomputed weights). */
export const updateDonorPersona = async (
  handleId: string,
  input: UpdateDonorPersonaInput
): Promise<DonorPersona> => {
  try {
    // TODO(#1775): add zod schema
    const data = await api.put<DonorPersona>(
      INDEXER.DONOR_RESEARCH.PERSONA(handleId),
      buildPersonaPutBody(input)
    );
    if (!data) throw new Error("Failed to save donor persona");
    return data;
  } catch (error) {
    if (error instanceof HttpError && error.status === 429) {
      throw new DonorPersonaRateLimitError("persona_write");
    }
    throw error;
  }
};

/**
 * Runs the LLM refinement over `sourceText`. Does NOT persist — the caller
 * reviews the returned narrative + chips and commits via
 * {@link updateDonorPersona}.
 */
export const refineDonorPersona = async (
  handleId: string,
  sourceText: string
): Promise<RefinementResult> => {
  try {
    // TODO(#1775): add zod schema
    const data = await api.post<RefinementResult>(INDEXER.DONOR_RESEARCH.PERSONA_REFINE(handleId), {
      sourceText,
    });
    if (!data) throw new Error("Failed to refine donor persona");
    return data;
  } catch (error) {
    if (error instanceof HttpError && error.status === 429) {
      throw new DonorPersonaRateLimitError("persona_refine");
    }
    throw error;
  }
};

// -- Reports -----------------------------------------------------------

export interface ListReportsOptions {
  limit?: number;
  offset?: number;
  /**
   * Restrict the list to a single donor handle. Omit to load every
   * report for the current advisor (default behavior).
   */
  donorHandleId?: string;
}

export const listResearchReports = async (
  options: ListReportsOptions = {}
): Promise<ResearchReportList> => {
  const params: Record<string, number | string> = {};
  if (options.limit !== undefined) params.limit = options.limit;
  if (options.offset !== undefined) params.offset = options.offset;
  if (options.donorHandleId) params.donorHandleId = options.donorHandleId;
  // TODO(#1775): add zod schema
  const data = await api.get<ResearchReportList>(INDEXER.DONOR_RESEARCH.REPORTS, { params });
  if (!data) throw new Error("Failed to load research reports");
  return data;
};

export const getResearchReport = async (reportId: string): Promise<ResearchReportDetail> => {
  // TODO(#1775): add zod schema
  const data = await api.get<ResearchReportDetail>(INDEXER.DONOR_RESEARCH.REPORT_BY_ID(reportId));
  if (!data) throw new Error("Failed to load research report");
  return data;
};

export interface CreateReportRequest {
  donorHandleId: string;
  criteriaText: string;
  cause?: string | null;
  geography?: string | null;
  amountMin?: number | null;
  amountMax?: number | null;
  poolLimit?: number;
  /**
   * Composite-ranking weights as basis points summing to 10000 (DEV-418).
   * Omit to let the backend apply the shipped five-dimension defaults.
   */
  weights?: CompositeWeights;
  /**
   * Featured-set size that receives an AI one-pager (DEV-418), 1–25. Omit to
   * use the backend default of 3.
   */
  topCount?: number;
}

export const createResearchReport = async (
  body: CreateReportRequest
): Promise<ReportCreateResponse> => {
  // TODO(#1775): add zod schema
  const data = await api.post<ReportCreateResponse>(INDEXER.DONOR_RESEARCH.REPORTS, body);
  if (!data) throw new Error("Failed to start research report");
  return data;
};

/**
 * Advisor-configurable report settings sent to `PUT /reports/:id/config`
 * (DEV-418). Supply at least one field; send only what changed.
 */
export interface UpdateReportConfigRequest {
  weights?: CompositeWeights;
  /** Size of the featured set that receives an AI one-pager, 1–25. */
  topCount?: number;
}

/**
 * Commit new composite weights and/or a new featured-set size (DEV-418). The
 * backend re-ranks under the new config, flips `featuredFlag`, regenerates
 * one-pagers only for candidates entering the featured set (nulls those
 * leaving), and returns the full re-read report. Send only the changed fields.
 */
export const updateReportConfig = async (
  reportId: string,
  body: UpdateReportConfigRequest
): Promise<ResearchReportDetail> => {
  // TODO(#1775): add zod schema
  const data = await api.put<ResearchReportDetail>(
    INDEXER.DONOR_RESEARCH.REPORT_CONFIG(reportId),
    body
  );
  if (!data) throw new Error("Failed to update report config");
  return data;
};

/**
 * Force a manual best-first ordering of the report's candidates (DEV-418
 * manual reorder). `orderedCandidateIds` must list every surfaced candidate
 * exactly once. The backend sets `manualPosition`, flips `featuredFlag` to
 * the manual featured set, and regenerates one-pagers for entrants.
 */
export const reorderReportCandidates = async (
  reportId: string,
  orderedCandidateIds: string[]
): Promise<ResearchReportDetail> => {
  // TODO(#1775): add zod schema
  const data = await api.put<ResearchReportDetail>(
    INDEXER.DONOR_RESEARCH.REPORT_REORDER(reportId),
    {
      orderedCandidateIds,
    }
  );
  if (!data) throw new Error("Failed to reorder report candidates");
  return data;
};

// -- Share tokens ------------------------------------------------------

export interface GenerateShareTokenRequest {
  ttlSeconds?: number;
  shareDisplayName?: string | null;
  shareIntroText?: string | null;
}

export const generateShareToken = async (
  reportId: string,
  body: GenerateShareTokenRequest
): Promise<ShareTokenPayload> => {
  // TODO(#1775): add zod schema
  const data = await api.post<ShareTokenPayload>(
    INDEXER.DONOR_RESEARCH.SHARE_TOKEN(reportId),
    body
  );
  if (!data) throw new Error("Failed to generate share token");
  return data;
};

export const revokeShareToken = async (reportId: string): Promise<void> => {
  await api.delete(INDEXER.DONOR_RESEARCH.SHARE_TOKEN(reportId));
};

// -- Public donor view (unauthenticated) -------------------------------

/**
 * The donor-facing share view is unauthenticated: the 32-byte token in
 * the path is the capability. We deliberately disable the auth header
 * via `isAuthorized = false` so the request doesn't carry the advisor's
 * session, mirroring the way an external visitor would hit it.
 */
export const fetchSharedReport = async (token: string): Promise<ResearchReportDetail> => {
  // The share endpoint returns ONLY render-necessary fields (no advisor IDs,
  // no share-token material). Adapt it to the full ResearchReportDetail shape
  // the brief expects by filling inert defaults for the advisor-only fields —
  // the share view hides every control that would read them.
  // TODO(#1775): add zod schema
  const data = await api.get<SharedReportApiPayload>(INDEXER.DONOR_RESEARCH.SHARED(token), {
    isAuthorized: false,
  });
  if (!data) throw new Error("Failed to load shared report");
  return {
    ...data,
    // Defensive: a share payload from before DEV-418 has no `weights`/`topCount`
    // keys, which the brief reads as a legacy four-dimension report (default 3).
    weights: data.weights ?? null,
    topCount: data.topCount ?? null,
    advisorId: "",
    donorHandleId: "",
    donorHandleLabel: null,
    criteriaId: "",
    criteria: null,
    hasShareToken: false,
    shareToken: null,
    shareTokenExpiresAt: null,
  };
};
