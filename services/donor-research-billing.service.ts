import type {
  DonorBillingSession,
  DonorEntitlement,
  DonorPlanCatalog,
  DonorResearchPack,
  DonorResearchPlan,
  DonorSubscriptionStatus,
  PurchasableDonorPlan,
} from "@/types/donor-research-billing";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";

/**
 * Donor-research billing API client.
 *
 * Uses the typed `api` client (issue #1775) rather than the legacy `fetchData`
 * tuple, because every interesting refusal on this surface carries a STRUCTURED
 * body the UI has to read — the 402 quota gate names the dimension that ran
 * out, and `fetchData` only ever surfaced `message` + `status`.
 *
 * Failures are thrown so React Query owns retry and error state.
 */

/**
 * Extracts the human-readable message the server sent, falling back to the
 * client's synthetic one. Same helper the sibling donor-research services use.
 */
function httpErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const bodyMessage = (error.body as { message?: string } | undefined)?.message;
    const causeMessage = (error.cause as { message?: string } | undefined)?.message;
    return bodyMessage || causeMessage || error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

/** The four metered dimensions the indexer's 402 bodies name. */
export const DONOR_QUOTA_DIMENSIONS = ["reports", "intros", "diligence", "profiles"] as const;

export type DonorQuotaDimension = (typeof DONOR_QUOTA_DIMENSIONS)[number];

function isDonorQuotaDimension(value: unknown): value is DonorQuotaDimension {
  return typeof value === "string" && (DONOR_QUOTA_DIMENSIONS as readonly string[]).includes(value);
}

/** Error code the indexer's report-quota gate returns on a 402. */
export const REPORT_QUOTA_EXHAUSTED_CODE = "donor_research_report_quota_exhausted";

const EXHAUSTED_CODE: Record<DonorQuotaDimension, string> = {
  reports: REPORT_QUOTA_EXHAUSTED_CODE,
  intros: "donor_research_intro_quota_exhausted",
  diligence: "donor_research_diligence_quota_exhausted",
  profiles: "donor_research_profile_quota_exhausted",
};

const DEFAULT_EXHAUSTED_MESSAGE: Record<DonorQuotaDimension, string> = {
  reports: "No research reports remaining on your plan.",
  intros: "No warm intros remaining on your plan.",
  diligence: "No diligence rounds remaining on your plan.",
  profiles: "Donor-profile limit reached on your plan.",
};

/**
 * The parts of the 402 body worth keeping. The consumable gate sends
 * `dimension`, `plan`, `status` and `remaining`; the profile cap adds
 * `profilesIncluded` / `profilesUsed`. Every field is nullable here because a
 * 402 raised by an older indexer (or an intermediary) may carry none of them —
 * the entitlement query is the authoritative copy either way.
 */
export interface DonorQuotaRefusal {
  plan: DonorResearchPlan | null;
  status: DonorSubscriptionStatus | null;
  remaining: number | null;
  profilesIncluded: number | null;
  profilesUsed: number | null;
}

const EMPTY_REFUSAL: DonorQuotaRefusal = {
  plan: null,
  status: null,
  remaining: null,
  profilesIncluded: null,
  profilesUsed: null,
};

/**
 * Base for the four dimension-specific refusals. Each surface (New report /
 * Connect / Ask questions / New donor) keys its upgrade prompt off the concrete
 * subclass, so the TYPE — not a string code — is the seam.
 */
export class DonorQuotaExhaustedError extends Error {
  readonly dimension: DonorQuotaDimension;
  readonly code: string;
  readonly refusal: DonorQuotaRefusal;

  constructor(dimension: DonorQuotaDimension, message?: string, refusal?: DonorQuotaRefusal) {
    super(message || DEFAULT_EXHAUSTED_MESSAGE[dimension]);
    this.name = "DonorQuotaExhaustedError";
    this.dimension = dimension;
    this.code = EXHAUSTED_CODE[dimension];
    this.refusal = refusal ?? EMPTY_REFUSAL;
  }
}

export class DonorReportQuotaExhaustedError extends DonorQuotaExhaustedError {
  constructor(message?: string, refusal?: DonorQuotaRefusal) {
    super("reports", message, refusal);
    this.name = "DonorReportQuotaExhaustedError";
  }
}

export class DonorIntroQuotaExhaustedError extends DonorQuotaExhaustedError {
  constructor(message?: string, refusal?: DonorQuotaRefusal) {
    super("intros", message, refusal);
    this.name = "DonorIntroQuotaExhaustedError";
  }
}

export class DonorDiligenceQuotaExhaustedError extends DonorQuotaExhaustedError {
  constructor(message?: string, refusal?: DonorQuotaRefusal) {
    super("diligence", message, refusal);
    this.name = "DonorDiligenceQuotaExhaustedError";
  }
}

export class DonorProfileQuotaExhaustedError extends DonorQuotaExhaustedError {
  constructor(message?: string, refusal?: DonorQuotaRefusal) {
    super("profiles", message, refusal);
    this.name = "DonorProfileQuotaExhaustedError";
  }
}

export function isQuotaExhausted(error: unknown): error is DonorQuotaExhaustedError {
  return error instanceof DonorQuotaExhaustedError;
}

export function isReportQuotaExhausted(error: unknown): error is DonorReportQuotaExhaustedError {
  return error instanceof DonorReportQuotaExhaustedError;
}

export function isIntroQuotaExhausted(error: unknown): error is DonorIntroQuotaExhaustedError {
  return error instanceof DonorIntroQuotaExhaustedError;
}

export function isDiligenceQuotaExhausted(
  error: unknown
): error is DonorDiligenceQuotaExhaustedError {
  return error instanceof DonorDiligenceQuotaExhaustedError;
}

export function isProfileQuotaExhausted(error: unknown): error is DonorProfileQuotaExhaustedError {
  return error instanceof DonorProfileQuotaExhaustedError;
}

const QUOTA_ERROR_BY_DIMENSION: Record<
  DonorQuotaDimension,
  new (
    message?: string,
    refusal?: DonorQuotaRefusal
  ) => DonorQuotaExhaustedError
> = {
  reports: DonorReportQuotaExhaustedError,
  intros: DonorIntroQuotaExhaustedError,
  diligence: DonorDiligenceQuotaExhaustedError,
  profiles: DonorProfileQuotaExhaustedError,
};

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Turns a 402 from any metered endpoint into the dimension-specific error the
 * UI keys off, reading the dimension from the RESPONSE BODY rather than
 * inferring it from the call site.
 *
 * The status code alone is not enough: one endpoint can be gated on more than
 * one dimension, and the backend is free to add a gate without the frontend
 * redeploying. `callSiteDimension` is only the fallback for a body that names
 * no dimension.
 *
 * Returns `null` for anything that is not a 402 — the caller rethrows.
 */
export function donorQuotaErrorFrom(
  error: unknown,
  callSiteDimension: DonorQuotaDimension
): DonorQuotaExhaustedError | null {
  if (!(error instanceof HttpError) || error.status !== 402) return null;

  const body = (error.body ?? {}) as Record<string, unknown>;
  const dimension = isDonorQuotaDimension(body.dimension) ? body.dimension : callSiteDimension;

  const refusal: DonorQuotaRefusal = {
    plan: typeof body.plan === "string" ? (body.plan as DonorResearchPlan) : null,
    status: typeof body.status === "string" ? (body.status as DonorSubscriptionStatus) : null,
    remaining: numberOrNull(body.remaining),
    profilesIncluded: numberOrNull(body.profilesIncluded),
    profilesUsed: numberOrNull(body.profilesUsed),
  };

  const QuotaError = QUOTA_ERROR_BY_DIMENSION[dimension];
  return new QuotaError(httpErrorMessage(error), refusal);
}

/**
 * Public plan catalog — prices, per-plan allowances across all four metered
 * dimensions, the one-time pack catalog, and the free signup grant.
 * Unauthenticated: the marketing pricing page reads it so the numbers a visitor
 * sees are the ones the quota engine enforces.
 *
 * Prices and plan allowances ONLY. What an advisor has LEFT comes from
 * `fetchMyEntitlement` — the catalog carries no usage at all.
 */
export const fetchDonorPlanCatalog = async (): Promise<DonorPlanCatalog> => {
  // TODO(#1775): add zod schema
  const data = await api.get<DonorPlanCatalog>(INDEXER.DONOR_RESEARCH.BILLING_PLANS, {
    isAuthorized: false,
  });
  if (!data) throw new Error("Failed to load pricing plans");
  return data;
};

/**
 * The current advisor's plan, period, and remaining allowance across all four
 * dimensions. This is the SOURCE OF TRUTH for every remaining count the UI
 * renders — never derive one from the plan catalog.
 */
export const fetchMyEntitlement = async (): Promise<DonorEntitlement> => {
  // TODO(#1775): add zod schema
  const data = await api.get<DonorEntitlement>(INDEXER.DONOR_RESEARCH.BILLING_SUBSCRIPTION);
  if (!data) throw new Error("Failed to load your subscription");
  return data;
};

export interface StartCheckoutRequest {
  plan: PurchasableDonorPlan;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Creates a Stripe Checkout session (201). The caller redirects the browser to
 * the returned `url`; entitlement is granted by the webhook, not by the return
 * trip, so a user who closes the tab mid-redirect still gets their plan — and
 * `hasBillingAccount` stays false until that webhook lands.
 *
 * A 409 means the advisor is already subscribed: Stripe Checkout does not
 * dedupe, so a second session would bill in parallel. Surfaced as a typed error
 * so the UI can point at the billing portal instead of a raw failure line.
 */
export const startBillingCheckout = async (
  body: StartCheckoutRequest
): Promise<DonorBillingSession> => {
  let data: DonorBillingSession | null;
  try {
    // TODO(#1775): add zod schema
    data = await api.post<DonorBillingSession>(INDEXER.DONOR_RESEARCH.BILLING_CHECKOUT, body);
  } catch (error) {
    throw new Error(httpErrorMessage(error) || "Couldn't start checkout");
  }
  if (!data) throw new Error("Couldn't start checkout");
  return data;
};

export interface StartPackCheckoutRequest {
  pack: DonorResearchPack;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Creates a one-time Stripe Checkout session for a PAYG / top-up pack (201).
 * The prepaid balance is credited by the `payment_intent.succeeded` webhook,
 * not by the return trip.
 *
 * A 403 means an intro top-up was requested without an active subscription —
 * warm intros are a subscriber benefit.
 */
export const startPackCheckout = async (
  body: StartPackCheckoutRequest
): Promise<DonorBillingSession> => {
  let data: DonorBillingSession | null;
  try {
    // TODO(#1775): add zod schema
    data = await api.post<DonorBillingSession>(INDEXER.DONOR_RESEARCH.BILLING_PACK_CHECKOUT, body);
  } catch (error) {
    throw new Error(httpErrorMessage(error) || "Couldn't start checkout");
  }
  if (!data) throw new Error("Couldn't start checkout");
  return data;
};

/**
 * Stripe Billing Portal session for plan changes, card updates, cancellation.
 * Only reachable once a Stripe customer exists — gate the CTA on the
 * entitlement's `hasBillingAccount`, which flips on webhook completion.
 */
export const startBillingPortal = async (returnUrl: string): Promise<DonorBillingSession> => {
  let data: DonorBillingSession | null;
  try {
    // TODO(#1775): add zod schema
    data = await api.post<DonorBillingSession>(INDEXER.DONOR_RESEARCH.BILLING_PORTAL, {
      returnUrl,
    });
  } catch (error) {
    throw new Error(httpErrorMessage(error) || "Couldn't open the billing portal");
  }
  if (!data) throw new Error("Couldn't open the billing portal");
  return data;
};
