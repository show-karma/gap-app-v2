import type {
  DonorPlanCatalogEntry,
  DonorResearchPlan,
  PurchasableDonorPlan,
} from "@/types/donor-research-billing";

/**
 * Marketing presentation for the nonprofit-research pricing cards.
 *
 * The NUMBERS (price, report allowance) are not here — they come from
 * `GET /v2/donor-research/billing/plans`, which reads the same catalog the
 * quota engine enforces. Only copy that has no server-side equivalent lives
 * in this file, so a price change in Stripe/config can never leave the
 * pricing page advertising something the backend won't honour.
 *
 * `FALLBACK_PLAN_CATALOG` below is the one exception: it renders the section
 * while the catalog request is in flight or if it fails, so a marketing page
 * never shows an empty pricing block. It is refreshed from the server the
 * moment the request lands.
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
        "Everything in Free",
        "Ranked shortlists with EIN and mailing address",
        "Diligence questions sent to nonprofits",
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
        "Everything in Starter",
        "Donor personas and saved ranking weights",
        "Warm intro requests",
        "Priority support",
      ],
      ctaLabel: "Choose Pro",
    }),
    enterprise: Object.freeze({
      plan: "enterprise",
      name: "Enterprise",
      tagline: "For your entire advisor team.",
      features: [
        "Everything in Pro, for every advisor on the team",
        "Volume report allowance across the firm",
        "Shared diligence templates and firm-wide branding",
        "Onboarding and a named point of contact",
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
    priceCents: 0,
    isPurchasable: false,
  }),
  Object.freeze({
    plan: "starter" as const,
    label: "Nonprofit Research — Starter",
    reportsIncluded: 5,
    priceCents: 2500,
    isPurchasable: true,
  }),
  Object.freeze({
    plan: "pro" as const,
    label: "Nonprofit Research — Pro",
    reportsIncluded: 20,
    priceCents: 10_000,
    isPurchasable: true,
  }),
  Object.freeze({
    plan: "enterprise" as const,
    label: "Nonprofit Research — Enterprise",
    reportsIncluded: 0,
    priceCents: null,
    isPurchasable: false,
  }),
]);

export const FALLBACK_FREE_SIGNUP_REPORT_GRANT = 2;

/** Card order on the pricing page — cheapest to sales-led. */
export const PRICING_CARD_ORDER: readonly DonorResearchPlan[] = Object.freeze([
  "free",
  "starter",
  "pro",
  "enterprise",
]);

export function isPurchasablePlan(plan: DonorResearchPlan): plan is PurchasableDonorPlan {
  return plan === "starter" || plan === "pro";
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
