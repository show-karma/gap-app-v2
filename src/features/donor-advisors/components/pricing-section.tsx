"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import pluralize from "pluralize";
import type { ReactElement } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDonorPlanCatalog } from "@/hooks/useDonorBilling";
import { SectionContainer } from "@/src/components/shared/section-container";
import {
  DONOR_PLAN_PRESENTATION,
  FALLBACK_FREE_SIGNUP_REPORT_GRANT,
  FALLBACK_PACK_CATALOG,
  FALLBACK_PLAN_CATALOG,
  formatPlanPrice,
  PRICING_CARD_ORDER,
} from "@/src/features/donor-research/billing/pricing-content";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import type {
  DonorPackCatalogEntry,
  DonorPlanCatalogEntry,
  DonorResearchPlan,
} from "@/types/donor-research-billing";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

/**
 * Pricing cards for the nonprofit-research product.
 *
 * The numbers come from `GET /v2/donor-research/billing/plans` — the same
 * catalog the quota engine enforces — so this page can never advertise an
 * allowance the backend won't honour. `FALLBACK_PLAN_CATALOG` renders while
 * that request is in flight and if it fails: a marketing page showing a
 * skeleton (or nothing) where its prices belong is worse than showing the
 * shipped defaults, which the live response overwrites the moment it lands.
 *
 * Every card routes into the product rather than straight to Stripe. Checkout
 * needs an authenticated advisor, so an anonymous visitor onboards first and
 * upgrades from the billing page — where they will already have their 2 free
 * reports in hand.
 */
export function PricingSection() {
  const catalogQuery = useDonorPlanCatalog();

  const catalog = catalogQuery.data;
  const entries: readonly DonorPlanCatalogEntry[] = catalog?.plans?.length
    ? catalog.plans
    : FALLBACK_PLAN_CATALOG;
  const freeGrant = catalog?.freeSignupReportGrant ?? FALLBACK_FREE_SIGNUP_REPORT_GRANT;

  const byPlan = new Map<DonorResearchPlan, DonorPlanCatalogEntry>(
    entries.map((entry) => [entry.plan, entry])
  );

  const packs: readonly DonorPackCatalogEntry[] = catalog?.packs?.length
    ? catalog.packs
    : FALLBACK_PACK_CATALOG;

  return (
    <section
      id="pricing"
      className={cn(marketingLayoutTheme.padding, "flex w-full flex-col items-start")}
    >
      <SectionContainer className="flex flex-col items-start gap-12">
        <ScrollReveal variant="fade-up">
          <div className="flex w-full max-w-[768px] flex-col items-start gap-4">
            <Badge
              variant="secondary"
              className={cn(
                "text-secondary-foreground font-medium text-xs",
                "leading-normal tracking-wide",
                "rounded-full py-1 px-2",
                "bg-secondary border-0 w-fit"
              )}
            >
              Pricing
            </Badge>

            <h2 className={cn("section-title", "text-left", "w-full")}>
              <span className="text-foreground">Pay for the briefs you run.</span>
              <br />
              <span className="text-muted-foreground">Nothing else.</span>
            </h2>

            <p
              className={cn(
                "text-muted-foreground font-normal text-left",
                "text-lg md:text-xl leading-relaxed",
                "w-full"
              )}
            >
              {`Every account starts with ${freeGrant} free, full-service ${pluralize("report", freeGrant)}, the
              same brief every paid plan runs. Run a real shortlist before you decide, then upgrade
              when you need more volume. No card required to sign up.`}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PRICING_CARD_ORDER.map((plan, index) => (
            <ScrollReveal key={plan} variant="fade-up" delay={index * 80}>
              <PricingCard
                plan={plan}
                entry={byPlan.get(plan)}
                freeGrant={freeGrant}
                isLoading={catalogQuery.isLoading}
              />
            </ScrollReveal>
          ))}
        </div>

        <PackShowcase packs={packs} />

        <p className="text-sm text-muted-foreground">
          Monthly billing, cancel any time from your billing page. Unused reports roll over up to
          one month; run dry mid-cycle and you can top up with a pack instead of upgrading.
        </p>
      </SectionContainer>
    </section>
  );
}

/** One-time PAYG / top-up packs, shown below the plan cards. */
function PackShowcase({ packs }: { packs: readonly DonorPackCatalogEntry[] }) {
  if (packs.length === 0) return null;
  return (
    <div className="flex w-full flex-col gap-3">
      <p className="text-sm font-medium text-foreground">
        No subscription? Buy reports as you go, or top up any plan.
      </p>
      <div className="flex flex-wrap gap-3">
        {packs.map((pack) => (
          <div
            key={pack.pack}
            className="flex items-baseline gap-2 rounded-xl bg-secondary px-4 py-2 ring-1 ring-border/60 ring-inset"
          >
            <span className="text-sm font-semibold text-foreground">
              {pack.units} {pluralize(pack.dimension === "intros" ? "intro" : "report", pack.units)}
            </span>
            <span className="text-sm text-muted-foreground">
              {formatPlanPrice(pack.priceCents)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The four metered allowances a paid plan grants, from the live catalog. */
function AllowanceList({ entry }: { entry: DonorPlanCatalogEntry | undefined }) {
  if (!entry) return null;
  // A zero allowance is not advertised at all, so the rows are built in one
  // pass rather than filtered and then mapped.
  const perMonth: ReactElement[] = [];
  for (const item of [
    { count: entry.reportsIncluded, noun: "report" },
    { count: entry.introsIncluded, noun: "warm intro" },
    { count: entry.diligenceIncluded, noun: "diligence round" },
  ]) {
    if (item.count <= 0) continue;
    perMonth.push(
      <li key={item.noun}>
        {item.count} {pluralize(item.noun, item.count)} / month
      </li>
    );
  }
  return (
    <ul className="flex flex-col gap-1 text-sm font-medium text-foreground">
      {perMonth}
      <li>
        {entry.profilesIncluded} donor {pluralize("profile", entry.profilesIncluded)}
      </li>
    </ul>
  );
}

interface PricingCardProps {
  plan: DonorResearchPlan;
  entry: DonorPlanCatalogEntry | undefined;
  freeGrant: number;
  isLoading: boolean;
}

function PricingCard({ plan, entry, freeGrant, isLoading }: PricingCardProps) {
  const presentation = DONOR_PLAN_PRESENTATION[plan];
  const isEnterprise = plan === "enterprise";
  const isFree = plan === "free";
  const featured = Boolean(presentation.featured);

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-5 rounded-2xl p-8",
        featured
          ? "bg-secondary ring-2 ring-primary"
          : "bg-secondary ring-1 ring-border/60 ring-inset"
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
            {presentation.name}
          </h3>
          {/* shrink-0 + whitespace-nowrap so the chip can never be squeezed into
              a two-line lozenge (it was, at <=343px), and tracking-wide to buy
              back the ~11px of width the 10px -> 12px bump spent. Deliberately
              tighter than the uppercase micro-labels elsewhere: this one is a
              filled pill sharing a row with the plan name. */}
          {featured ? (
            <Badge className="shrink-0 whitespace-nowrap rounded-full text-xs uppercase tracking-wide">
              Most popular
            </Badge>
          ) : null}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{presentation.tagline}</p>
      </div>

      <PlanPrice entry={entry} isEnterprise={isEnterprise} isLoading={isLoading} />

      {isEnterprise ? (
        <p className="text-sm font-medium text-foreground">Custom volume for your whole team</p>
      ) : isFree ? (
        <p className="text-sm font-medium text-foreground">
          {`${freeGrant} free ${pluralize("report", freeGrant)} to start`}
        </p>
      ) : (
        <AllowanceList entry={entry} />
      )}

      <ul className="flex flex-1 flex-col gap-2">
        {presentation.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        variant={featured ? "default" : "outline"}
        className="w-full rounded-md font-semibold"
      >
        {isEnterprise ? (
          <Link href={SOCIALS.DONOR_PARTNER_FORM} target="_blank" rel="noopener noreferrer">
            {presentation.ctaLabel}
          </Link>
        ) : (
          // Checkout needs an authenticated advisor, so paid plans route into
          // the product too — the visitor onboards, collects their free
          // reports, and upgrades from the billing page.
          <Link href={isFree ? PAGES.DONOR_RESEARCH.INDEX : PAGES.DONOR_RESEARCH.BILLING}>
            {presentation.ctaLabel}
          </Link>
        )}
      </Button>
    </div>
  );
}

function PlanPrice({
  entry,
  isEnterprise,
  isLoading,
}: {
  entry: DonorPlanCatalogEntry | undefined;
  isEnterprise: boolean;
  isLoading: boolean;
}) {
  if (isEnterprise) {
    return (
      <p className="text-3xl font-semibold leading-none tracking-tight text-foreground">Custom</p>
    );
  }

  if (isLoading && !entry) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading price…
      </p>
    );
  }

  const priceCents = entry?.priceCents ?? 0;
  if (priceCents === 0) {
    return <p className="text-3xl font-semibold leading-none tracking-tight text-foreground">$0</p>;
  }

  return (
    <p className="flex items-baseline gap-1">
      <span className="text-3xl font-semibold leading-none tracking-tight text-foreground">
        {formatPlanPrice(priceCents)}
      </span>
      <span className="text-sm text-muted-foreground">/ month</span>
    </p>
  );
}
