import type {
  DonorPackCatalogEntry,
  DonorPlanCatalogEntry,
  DonorResearchPlan,
  PurchasableDonorPlan,
} from "@/types/donor-research-billing";

/**
 * Marketing presentation for the nonprofit-research pricing cards.
 *
 * The NUMBERS (price, per-dimension allowances) are not here — they come from
 * `GET /v2/donor-research/billing/plans`, which reads the same catalog the
 * quota engine enforces. Only copy that has no server-side equivalent lives
 * in this file, so a price change in Stripe/config can never leave the
 * pricing page advertising something the backend won't honour.
 *
 * `FALLBACK_PLAN_CATALOG` / `FALLBACK_PACK_CATALOG` below are the one
 * exception: they render the section while the catalog request is in flight or
 * if it fails, so a marketing page never shows an empty pricing block. They are
 * refreshed from the server the moment the request lands.
 */

export interface PlanPresentation {
  plan: DonorResearchPlan;
  /** Short name on the card — distinct from the Stripe line-item label. */
  name: string;
  tagline: string;
  features: string[];
  /** Highlighted card. Exactly one plan should carry this. */
  featured?: boolean;
  ctaLabel: string;
}

export const DONOR_PLAN_PRESENTATION: Readonly<Record<DonorResearchPlan, PlanPresentation>> =
  Object.freeze({
    free: Object.freeze({
      plan: "free",
      name: "Free",
      tagline: "See what a brief looks like before you commit.",
      features: [
        "2 free reports when you sign up",
        "Full compliance and activity scoring",
        "Shareable donor-facing brief",
      ],
      ctaLabel: "Start free",
    }),
    starter: Object.freeze({
      plan: "starter",
      name: "Starter",
      tagline: "For the advisor running a handful of gifts a month.",
      features: [
        "Full compliance and activity scoring on every brief",
        "Ranked shortlists with EIN and mailing address",
        "Diligence questions and warm intros included",
        "Email support",
      ],
      featured: true,
      ctaLabel: "Choose Starter",
    }),
    pro: Object.freeze({
      plan: "pro",
      name: "Pro",
      tagline: "For a practice with a steady grantmaking calendar.",
      features: [
        "Everything in Starter, at higher volume",
        "Donor personas and saved ranking weights",
        "More warm intros and diligence rounds",
        "Priority support",
      ],
      ctaLabel: "Choose Pro",
    }),
    firm: Object.freeze({
      plan: "firm",
      name: "Firm",
      tagline: "For a multi-advisor practice managing many donors.",
      features: [
        "Everything in Pro, at firm volume",
        "Manage many donor-client profiles",
        "Pooled reports, intros and diligence",
        "Firm branding and shared diligence templates",
      ],
      ctaLabel: "Choose Firm",
    }),
    enterprise: Object.freeze({
      plan: "enterprise",
      name: "Enterprise",
      tagline: "For your entire advisor team.",
      features: [
        "Everything in Firm, for every advisor on the team",
        "Custom volume allowances across the firm",
        "SSO and a named point of contact",
        "Onboarding and custom contracts",
      ],
      ctaLabel: "Talk to our team",
    }),
  });

/**
 * Rendered while the live catalog loads, and if it fails. Kept in step with
 * `DONOR_PLAN_CATALOG` in the indexer; the server response always wins once it
 * arrives, so a drift here is briefly visible rather than binding.
 */
export const FALLBACK_PLAN_CATALOG: readonly DonorPlanCatalogEntry[] = Object.freeze([
  Object.freeze({
    plan: "free" as const,
    label: "Free",
    reportsIncluded: 0,
    introsIncluded: 0,
    diligenceIncluded: 1,
    profilesIncluded: 1,
    priceCents: 0,
    isPurchasable: false,
  }),
  Object.freeze({
    plan: "starter" as const,
    label: "Nonprofit Research — Starter",
    reportsIncluded: 10,
    introsIncluded: 2,
    diligenceIncluded: 5,
    profilesIncluded: 3,
    priceCents: 2900,
    isPurchasable: true,
  }),
  Object.freeze({
    plan: "pro" as const,
    label: "Nonprofit Research — Pro",
    reportsIncluded: 40,
    introsIncluded: 8,
    diligenceIncluded: 20,
    profilesIncluded: 10,
    priceCents: 9900,
    isPurchasable: true,
  }),
  Object.freeze({
    plan: "firm" as const,
    label: "Nonprofit Research — Firm",
    reportsIncluded: 200,
    introsIncluded: 30,
    diligenceIncluded: 60,
    profilesIncluded: 30,
    priceCents: 39_900,
    isPurchasable: true,
  }),
  Object.freeze({
    plan: "enterprise" as const,
    label: "Nonprofit Research — Enterprise",
    reportsIncluded: 0,
    introsIncluded: 0,
    diligenceIncluded: 0,
    profilesIncluded: 0,
    priceCents: null,
    isPurchasable: false,
  }),
]);

/** One-time PAYG / top-up packs shown below the plan cards. */
export const FALLBACK_PACK_CATALOG: readonly DonorPackCatalogEntry[] = Object.freeze([
  Object.freeze({
    pack: "reports_3" as const,
    label: "Report pack (3)",
    dimension: "reports" as const,
    units: 3,
    priceCents: 3000,
  }),
  Object.freeze({
    pack: "reports_10" as const,
    label: "Report pack (10)",
    dimension: "reports" as const,
    units: 10,
    priceCents: 8000,
  }),
  Object.freeze({
    pack: "intros_5" as const,
    label: "Intro pack (5)",
    dimension: "intros" as const,
    units: 5,
    priceCents: 5900,
  }),
]);

export const FALLBACK_FREE_SIGNUP_REPORT_GRANT = 2;

/** Card order on the pricing page, cheapest to sales-led. */
export const PRICING_CARD_ORDER: readonly DonorResearchPlan[] = Object.freeze([
  "starter",
  "pro",
  "firm",
  "enterprise",
]);

export function isPurchasablePlan(plan: DonorResearchPlan): plan is PurchasableDonorPlan {
  return plan === "starter" || plan === "pro" || plan === "firm";
}

/**
 * Formats a cents price as a whole-dollar string. Every published plan is a
 * round dollar amount, so cents are only rendered when a price is not — which
 * would signal a config mistake worth seeing rather than hiding.
 */
export function formatPlanPrice(priceCents: number): string {
  const dollars = priceCents / 100;
  return Number.isInteger(dollars)
    ? `$${dollars.toLocaleString("en-US")}`
    : `$${dollars.toFixed(2)}`;
}
