"use client";

import { AlertTriangle, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDonorEntitlement, useOpenBillingPortal } from "@/hooks/useDonorBilling";
import {
  DONOR_BILLING_PORTAL_ERROR_MESSAGE,
  DONOR_BILLING_PORTAL_UNAVAILABLE_MESSAGE,
  isBillingPortalUnavailable,
} from "@/services/donor-research-billing.service";
import { Link } from "@/src/components/navigation/Link";
import { DONOR_PLAN_PRESENTATION } from "@/src/features/donor-research/billing/pricing-content";
import { useReportedError } from "@/src/features/donor-research/billing/use-reported-error";
import { UpgradeDialog } from "@/src/features/donor-research/billing/UpgradeDialog";
import { DonorResearchLoading } from "@/src/features/donor-research/components/common/DonorResearchLoading";
import type { DonorEntitlement } from "@/types/donor-research-billing";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

/**
 * Fixed user-facing copy. The billing service copies the backend response text
 * into the error it throws, so rendering `error.message` would put whatever the
 * server said on screen (CWE-209); the original goes to Sentry through
 * {@link useReportedError} instead.
 */
const ENTITLEMENT_ERROR_COPY = "Something went wrong reading your subscription. Please try again.";

interface BillingPageProps {
  /**
   * The Stripe Checkout return marker, read SERVER-side from `searchParams` by
   * the route. Reading it here with `useSearchParams` would opt the whole route
   * into client-side rendering and require its own Suspense boundary.
   */
  checkoutParam?: string | null;
}

/**
 * Billing page: current plan, remaining reports, upgrade, manage subscription.
 *
 * Also the Stripe Checkout return target. `?checkout=success` only means the
 * browser came back: the plan itself is applied by the
 * `customer.subscription.created` webhook, which may land a moment later. The
 * banner says "confirming" rather than claiming success, and the entitlement
 * query refetches so the real state replaces it as soon as it exists.
 */
export function BillingPage({ checkoutParam = null }: BillingPageProps = {}) {
  const entitlementQuery = useDonorEntitlement();
  const portal = useOpenBillingPortal();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useReportedError("Error loading donor-research entitlement", entitlementQuery.error);
  useReportedError("Error opening donor-research billing portal", portal.error);

  const handleRetry = () => {
    entitlementQuery.refetch();
  };
  const handleOpenUpgrade = () => setUpgradeOpen(true);
  const handleUpgradeOpenChange = (open: boolean) => setUpgradeOpen(open);
  const handleOpenBillingPortal = () => portal.mutate();

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
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">{ENTITLEMENT_ERROR_COPY}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={handleRetry}>
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
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
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
          <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
            {entitlement.cancelAtPeriodEnd ? "Cancels" : "Renews"}{" "}
            {formatDate(entitlement.currentPeriodEnd)}
          </p>
        ) : null}

        {entitlement.billingEnabled ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleOpenUpgrade}>
              {entitlement.plan === "free" ? "Choose a plan" : "Change plan"}
            </Button>
            {entitlement.hasBillingAccount ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenBillingPortal}
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
            {isBillingPortalUnavailable(portal.error)
              ? DONOR_BILLING_PORTAL_UNAVAILABLE_MESSAGE
              : DONOR_BILLING_PORTAL_ERROR_MESSAGE}
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

      {upgradeOpen ? <UpgradeDialog open onOpenChange={handleUpgradeOpenChange} /> : null}
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
interface BillingBannersProps {
  checkoutParam: string | null;
  entitlement: DonorEntitlement;
}

function BillingBanners({ checkoutParam, entitlement }: BillingBannersProps) {
  if (checkoutParam === "success") {
    return (
      <Banner tone="success" icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}>
        Payment received. Confirming your subscription with Stripe: your new allowance appears here
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

interface CounterProps {
  label: string;
  remaining: number;
  used: number;
  included: number;
  isCap?: boolean;
}

/**
 * One metered-dimension counter: the spendable remaining figure with the
 * period usage beneath it. Profiles is a hard cap (`isCap`), so it reads "of N"
 * rather than "used this period".
 *
 * An exhausted dimension reads as STATUS rather than as the number `0` — a
 * lone "0" under an allowance label is a worse thing to scan than the words,
 * and the upgrade button below the grid is the affordance in either state.
 */
function Counter({ label, remaining, used, included, isCap = false }: CounterProps) {
  const isEmpty = remaining <= 0;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 font-mono tabular-nums",
          isEmpty ? "text-base text-amber-600 dark:text-amber-400" : "text-2xl text-foreground"
        )}
      >
        {isEmpty ? (isCap ? "At limit" : "None left") : remaining}
      </dd>
      <dd className="text-xs text-muted-foreground">
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

interface BannerProps {
  tone: keyof typeof BANNER_TONES;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function Banner({ tone, icon, children }: BannerProps) {
  // `<output>` carries an implicit role="status" (polite live region), which
  // is what these are: state that changed underneath the user — a checkout
  // return, a failed payment — not something they navigated to.
  return (
    <output
      className={cn(
        "mb-6 flex items-start gap-2 rounded-lg border p-4 text-sm",
        BANNER_TONES[tone]
      )}
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
