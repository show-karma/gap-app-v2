/**
 * Donor-research billing indexer endpoints (pricing overhaul).
 *
 * Kept in a dedicated module rather than in `utilities/indexer.ts` (which is
 * already at its size limit) while still centralising the paths as constants —
 * never hardcode these `/v2/...` strings at call sites. Same arrangement as
 * `utilities/diligenceEndpoints.ts`.
 *
 * Every path is pinned against the indexer's route table by
 * `__tests__/features/donor-research/billing/quota-dimension-seam.test.ts`, so
 * a rename on either side fails CI rather than 404ing at runtime.
 */
export const DONOR_BILLING_ENDPOINTS = {
  /** Public — the marketing pricing page reads it unauthenticated. */
  PLANS: "/v2/donor-research/billing/plans",
  // The rest require the advisor's Privy session.
  SUBSCRIPTION: "/v2/donor-research/billing/subscription",
  CHECKOUT: "/v2/donor-research/billing/checkout",
  PACK_CHECKOUT: "/v2/donor-research/billing/packs/checkout",
  PORTAL: "/v2/donor-research/billing/portal",
} as const;
