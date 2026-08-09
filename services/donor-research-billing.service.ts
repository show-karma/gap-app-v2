import type {
  DonorBillingSession,
  DonorEntitlement,
  DonorPlanCatalog,
  PurchasableDonorPlan,
} from "@/types/donor-research-billing";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * Donor-research billing API client.
 *
 * Same shape as `donor-research.service.ts`: `fetchData` attaches the Privy
 * token and returns the `[data, error, _, status]` tuple. Failures are thrown
 * so React Query owns retry and error state.
 */

/** Error code the indexer's quota gate returns on a 402. */
export const REPORT_QUOTA_EXHAUSTED_CODE = "donor_research_report_quota_exhausted";

/**
 * Thrown when report creation is refused because the advisor has no reports
 * left. Distinct from a generic failure so the UI can open the upgrade prompt
 * instead of a red error line.
 *
 * The 402 body also carries the plan and counters, but `fetchData` only
 * surfaces `message` and `status` from an error response — so callers refetch
 * the entitlement (which is the authoritative copy anyway) rather than
 * reading fields off the error.
 */
export class DonorReportQuotaExhaustedError extends Error {
  readonly code = REPORT_QUOTA_EXHAUSTED_CODE;

  constructor(message?: string) {
    super(message || "No research reports remaining on your plan.");
    this.name = "DonorReportQuotaExhaustedError";
  }
}

export function isReportQuotaExhausted(error: unknown): error is DonorReportQuotaExhaustedError {
  return error instanceof DonorReportQuotaExhaustedError;
}

/**
 * Public plan catalog — prices, per-plan report allowances, and the free
 * signup grant. Unauthenticated: the marketing pricing page reads it so the
 * numbers a visitor sees are the ones the quota engine enforces.
 */
export const fetchDonorPlanCatalog = async (): Promise<DonorPlanCatalog> => {
  const [data, error] = await fetchData<DonorPlanCatalog>(
    INDEXER.DONOR_RESEARCH.BILLING_PLANS,
    "GET",
    {},
    {},
    {},
    false
  );
  if (error || !data) {
    throw new Error(error || "Failed to load pricing plans");
  }
  return data;
};

/** The current advisor's plan, period, and remaining report allowance. */
export const fetchMyEntitlement = async (): Promise<DonorEntitlement> => {
  const [data, error] = await fetchData<DonorEntitlement>(
    INDEXER.DONOR_RESEARCH.BILLING_SUBSCRIPTION
  );
  if (error || !data) {
    throw new Error(error || "Failed to load your subscription");
  }
  return data;
};

export interface StartCheckoutRequest {
  plan: PurchasableDonorPlan;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Creates a Stripe Checkout session. The caller redirects the browser to the
 * returned `url`; entitlement is granted by the webhook, not by the return
 * trip, so a user who closes the tab mid-redirect still gets their plan.
 */
export const startBillingCheckout = async (
  body: StartCheckoutRequest
): Promise<DonorBillingSession> => {
  const [data, error] = await fetchData<DonorBillingSession>(
    INDEXER.DONOR_RESEARCH.BILLING_CHECKOUT,
    "POST",
    body
  );
  if (error || !data) {
    throw new Error(error || "Couldn't start checkout");
  }
  return data;
};

/** Stripe Billing Portal session for plan changes, card updates, cancellation. */
export const startBillingPortal = async (returnUrl: string): Promise<DonorBillingSession> => {
  const [data, error] = await fetchData<DonorBillingSession>(
    INDEXER.DONOR_RESEARCH.BILLING_PORTAL,
    "POST",
    { returnUrl }
  );
  if (error || !data) {
    throw new Error(error || "Couldn't open the billing portal");
  }
  return data;
};
