"use client";

import { AlertTriangle, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDonorEntitlement, useOpenBillingPortal } from "@/hooks/useDonorBilling";
import { Link } from "@/src/components/navigation/Link";
import { DONOR_PLAN_PRESENTATION } from "@/src/features/donor-research/billing/pricing-content";
import { UpgradeDialog } from "@/src/features/donor-research/billing/UpgradeDialog";
import type { DonorEntitlement } from "@/types/donor-research-billing";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { DonorResearchLoading } from "../components/common/DonorResearchLoading";

/**
 * Billing page: current plan, remaining reports, upgrade, manage subscription.
 *
 * Also the Stripe Checkout return target. `?checkout=success` only means the
 * browser came back — the plan itself is applied by the
 * `customer.subscription.created` webhook, which may land a moment later. The
 * banner says "confirming" rather than claiming success, and the entitlement
 * query refetches so the real state replaces it as soon as it exists.
 */
export function BillingPage() {
  const searchParams = useSearchParams();
  const entitlementQuery = useDonorEntitlement();
  const portal = useOpenBillingPortal();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const checkoutParam = searchParams.get("checkout");

  if (entitlementQuery.isLoading) {
    return <DonorResearchLoading label="Loading your plan…" />;
  }

  if (entitlementQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40"
        >
          <h1 className="text-lg font-semibold text-red-800 dark:text-red-300">
            Couldn't load your plan
          </h1>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">
            {(entitlementQuery.error as Error)?.message ??
              "Something went wrong reading your subscription."}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => entitlementQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const entitlement = entitlementQuery.data as DonorEntitlement;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-8 border-b border-border/60 pb-6">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Karma · Nonprofit Research
        </p>
        <h1 className="text-balance text-3xl font-medium tracking-tight text-foreground">
          Plan and billing
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Reports, warm intros and diligence rounds are metered each month; donor profiles are a
          plan cap. Top up or upgrade any time.
        </p>
      </header>

      <BillingBanners checkoutParam={checkoutParam} entitlement={entitlement} />

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">
            {DONOR_PLAN_PRESENTATION[entitlement.plan].name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {DONOR_PLAN_PRESENTATION[entitlement.plan].tagline}
          </p>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border/60 pt-6 sm:grid-cols-4">
          <Counter
            label="Reports"
            remaining={entitlement.reportsRemaining}
            used={entitlement.reportsUsed}
            included={entitlement.reportsIncluded}
          />
          <Counter
            label="Warm intros"
            remaining={entitlement.introsRemaining}
            used={entitlement.introsUsed}
            included={entitlement.introsIncluded}
          />
          <Counter
            label="Diligence"
            remaining={entitlement.diligenceRemaining}
            used={entitlement.diligenceUsed}
            included={entitlement.diligenceIncluded}
          />
          <Counter
            label="Donor profiles"
            remaining={entitlement.profilesRemaining}
            used={entitlement.profilesUsed}
            included={entitlement.profilesIncluded}
            isCap
          />
        </dl>

        {entitlement.currentPeriodEnd ? (
          <p className="mt-4 text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {entitlement.cancelAtPeriodEnd ? "Cancels" : "Renews"}{" "}
            {formatDate(entitlement.currentPeriodEnd)}
          </p>
        ) : null}

        {entitlement.billingEnabled ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => setUpgradeOpen(true)}>
              {entitlement.plan === "free" ? "Choose a plan" : "Change plan"}
            </Button>
            {entitlement.hasBillingAccount ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => portal.mutate()}
                disabled={portal.isPending}
              >
                {portal.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Opening Stripe…
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
                    Manage billing
                  </>
                )}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            Self-serve billing isn't available on this environment.{" "}
            <Link
              href={SOCIALS.DONOR_PARTNER_FORM}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Talk to our team
            </Link>{" "}
            to set up a plan.
          </p>
        )}

        {portal.isError ? (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {portal.error.message}
          </p>
        ) : null}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Running a whole team?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enterprise covers every advisor in your firm with a shared report allowance, shared
          diligence templates, and a named point of contact.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={SOCIALS.DONOR_PARTNER_FORM} target="_blank" rel="noopener noreferrer">
            Talk to our team
          </Link>
        </Button>
      </section>

      <p className="mt-6 text-sm">
        <Link
          href={PAGES.DONOR_RESEARCH.INDEX}
          className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Back to research
        </Link>
      </p>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}

/**
 * The four transient states worth calling out above the plan card, in
 * priority order. Extracted from `BillingPage` so the page body stays one
 * readable pass of layout rather than a wall of conditionals.
 *
 * `checkout=success` only means the browser came back from Stripe — the plan
 * itself lands via webhook, so the copy says "confirming", not "done".
 */
function BillingBanners({
  checkoutParam,
  entitlement,
}: {
  checkoutParam: string | null;
  entitlement: DonorEntitlement;
}) {
  if (checkoutParam === "success") {
    return (
      <Banner tone="success" icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}>
        Payment received — confirming your subscription with Stripe. Your new allowance appears here
        within a few seconds.
      </Banner>
    );
  }

  if (checkoutParam === "cancel") {
    return (
      <Banner tone="neutral" icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}>
        Checkout cancelled. You haven't been charged, and your plan is unchanged.
      </Banner>
    );
  }

  if (entitlement.status === "past_due") {
    return (
      <Banner tone="warning" icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}>
        A payment failed, so your plan allowance is paused. Update your card to restore it.
      </Banner>
    );
  }

  if (entitlement.cancelAtPeriodEnd && entitlement.currentPeriodEnd) {
    return (
      <Banner tone="neutral" icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}>
        {`Your plan is set to cancel on ${formatDate(entitlement.currentPeriodEnd)}. You keep your remaining reports until then.`}
      </Banner>
    );
  }

  return null;
}

/**
 * One metered-dimension counter: the spendable remaining figure with the
 * period usage beneath it. Profiles is a hard cap (`isCap`), so it reads "of N"
 * rather than "used this period".
 */
function Counter({
  label,
  remaining,
  used,
  included,
  isCap = false,
}: {
  label: string;
  remaining: number;
  used: number;
  included: number;
  isCap?: boolean;
}) {
  const isEmpty = remaining <= 0;
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-1 font-mono text-2xl tabular-nums ${
          isEmpty ? "text-amber-600 dark:text-amber-400" : "text-foreground"
        }`}
      >
        {remaining}
      </dd>
      <dd className="text-[11px] text-muted-foreground">
        {isCap ? `${used} of ${included} used` : `${used} of ${included} this month`}
      </dd>
    </div>
  );
}

const BANNER_TONES = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  neutral: "border-border bg-muted text-foreground",
} as const;

function Banner({
  tone,
  icon,
  children,
}: {
  tone: keyof typeof BANNER_TONES;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  // `<output>` carries an implicit role="status" (polite live region), which
  // is what these are: state that changed underneath the user — a checkout
  // return, a failed payment — not something they navigated to.
  return (
    <output
      className={`mb-6 flex items-start gap-2 rounded-lg border p-4 text-sm ${BANNER_TONES[tone]}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </output>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
