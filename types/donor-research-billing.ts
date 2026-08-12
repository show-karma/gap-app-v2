/**
 * Donor-research billing wire types, mirroring the gap-indexer DTOs in
 * `api/controllers/donor-research/dto/billing.api.response.ts`.
 *
 * Narrow by design — only what the frontend consumes.
 */

export type DonorResearchPlan = "free" | "starter" | "pro" | "firm" | "enterprise";

export type DonorSubscriptionStatus = "free" | "trialing" | "active" | "past_due" | "canceled";

/** Plans an advisor can buy through Stripe Checkout unaided. */
export type PurchasableDonorPlan = "starter" | "pro" | "firm";

/** One-time PAYG / top-up packs. */
export type DonorResearchPack = "reports_3" | "reports_10" | "intros_5";

/** Which prepaid balance a pack credits. */
export type DonorPackDimension = "reports" | "intros";

/**
 * The advisor's billing position across the three metered dimensions plus the
 * donor-profile cap. Each dimension exposes its plan allowance, usage, a
 * spendable `*Remaining` total (the number to show the advisor), and a
 * `can*` gate. Profiles is a hard cap; `profilesUsed` is the live handle count.
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

  introsIncluded: number;
  introsUsed: number;
  introsRemaining: number;
  canRequestIntro: boolean;

  diligenceIncluded: number;
  diligenceUsed: number;
  diligenceRemaining: number;
  canAskDiligence: boolean;

  profilesIncluded: number;
  profilesUsed: number;
  profilesRemaining: number;
  canCreateProfile: boolean;

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
  introsIncluded: number;
  diligenceIncluded: number;
  profilesIncluded: number;
  /** Monthly price in cents. 0 for free; null for sales-led Enterprise. */
  priceCents: number | null;
  isPurchasable: boolean;
}

export interface DonorPackCatalogEntry {
  pack: DonorResearchPack;
  label: string;
  dimension: DonorPackDimension;
  units: number;
  priceCents: number;
}

export interface DonorPlanCatalog {
  freeSignupReportGrant: number;
  billingEnabled: boolean;
  plans: DonorPlanCatalogEntry[];
  packs: DonorPackCatalogEntry[];
}

export interface DonorBillingSession {
  url: string;
  sessionId?: string;
}
