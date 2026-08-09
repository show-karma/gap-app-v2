/**
 * Donor-research billing wire types, mirroring the gap-indexer DTOs in
 * `api/controllers/donor-research/dto/billing.api.response.ts`.
 *
 * Narrow by design — only what the frontend consumes.
 */

export type DonorResearchPlan = "free" | "starter" | "pro" | "enterprise";

export type DonorSubscriptionStatus = "free" | "trialing" | "active" | "past_due" | "canceled";

/** Plans an advisor can buy through Stripe Checkout unaided. */
export type PurchasableDonorPlan = "starter" | "pro";

/**
 * The advisor's billing position. Two independent report buckets:
 * `reportsIncluded`/`reportsUsed` is the per-billing-period plan allowance
 * (refilled and forfeited on each cycle), `freeReportsGranted`/
 * `freeReportsUsed` is the never-expiring signup grant.
 * `reportsRemaining` is the sum of what is spendable from both — the number
 * to show the advisor.
 */
export interface DonorEntitlement {
  advisorId: string;
  plan: DonorResearchPlan;
  planLabel: string;
  status: DonorSubscriptionStatus;
  reportsIncluded: number;
  reportsUsed: number;
  freeReportsGranted: number;
  freeReportsUsed: number;
  reportsRemaining: number;
  canCreateReport: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** True once a Stripe customer exists, i.e. the billing portal is reachable. */
  hasBillingAccount: boolean;
  /** False when the environment has no Stripe credentials — hide upgrade CTAs. */
  billingEnabled: boolean;
}

export interface DonorPlanCatalogEntry {
  plan: DonorResearchPlan;
  label: string;
  reportsIncluded: number;
  /** Monthly price in cents. 0 for free; null for sales-led Enterprise. */
  priceCents: number | null;
  isPurchasable: boolean;
}

export interface DonorPlanCatalog {
  freeSignupReportGrant: number;
  billingEnabled: boolean;
  plans: DonorPlanCatalogEntry[];
}

export interface DonorBillingSession {
  url: string;
  sessionId?: string;
}
