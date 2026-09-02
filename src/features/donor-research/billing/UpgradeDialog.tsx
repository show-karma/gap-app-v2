"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import pluralize from "pluralize";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDonorEntitlement,
  useDonorPlanCatalog,
  useOpenBillingPortal,
  useStartCheckout,
  useStartPackCheckout,
} from "@/hooks/useDonorBilling";
import {
  DONOR_BILLING_PORTAL_ERROR_MESSAGE,
  DONOR_BILLING_PORTAL_UNAVAILABLE_MESSAGE,
  DONOR_SUBSCRIPTION_ALREADY_ACTIVE_MESSAGE,
  isBillingPortalUnavailable,
  isSubscriptionAlreadyActive,
  statusGrantsPlanAllowance,
} from "@/services/donor-research-billing.service";
import {
  DONOR_PLAN_CATALOG_FALLBACK,
  DONOR_PLAN_PRESENTATION,
  formatPlanPrice,
} from "@/src/features/donor-research/billing/pricing-content";
import { useReportedError } from "@/src/features/donor-research/billing/use-reported-error";
import type {
  DonorPackCatalogEntry,
  DonorPlanCatalogEntry,
  DonorResearchPack,
  PurchasableDonorPlan,
} from "@/types/donor-research-billing";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

const PURCHASABLE_PLANS: readonly PurchasableDonorPlan[] = ["starter", "pro", "firm"];

/**
 * Fixed user-facing copy. The billing service copies the backend response text
 * into the error it throws, so rendering `error.message` would put whatever the
 * server said on screen (CWE-209); the original goes to Sentry through
 * {@link useReportedError} instead.
 */
const CHECKOUT_ERROR_COPY = "Couldn't start checkout. Please try again in a moment.";

const BILLING_UNAVAILABLE_DESCRIPTION = "Self-serve billing isn't available on this environment.";

/** Which metered dimension the dialog is being opened for. */
type UpgradeDimension = "reports" | "intros" | "diligence" | "profiles";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The dimension that ran out — tailors the copy and the offered top-up pack. */
  dimension?: UpgradeDimension;
  /** Shown above the plans — e.g. why the dialog opened. */
  reason?: string;
}

const DIMENSION_LABEL: Record<
  UpgradeDimension,
  { field: keyof DonorPlanCatalogEntry; noun: string }
> = {
  reports: { field: "reportsIncluded", noun: "report" },
  intros: { field: "introsIncluded", noun: "warm intro" },
  diligence: { field: "diligenceIncluded", noun: "diligence round" },
  profiles: { field: "profilesIncluded", noun: "donor profile" },
};

/**
 * Plan picker shown when an advisor runs out of a metered dimension, and from
 * the billing page's upgrade button. For reports and intros it also offers a
 * one-time top-up pack, so an advisor mid-task can keep going without
 * committing to a higher plan.
 *
 * Intro top-ups are SUBSCRIBER-ONLY (the indexer 403s an intro pack bought
 * without an active subscription), so a free/PAYG advisor is offered the
 * subscription instead of a pack they cannot buy.
 *
 * Selecting a plan/pack creates a Stripe Checkout session and hands the browser
 * over; entitlement lands via webhook, not on the return trip.
 */
export function UpgradeDialog({
  open,
  onOpenChange,
  dimension = "reports",
  reason,
}: UpgradeDialogProps) {
  const catalogQuery = useDonorPlanCatalog();
  // Only fetched while the dialog is open — this is a modal, not a page, and
  // the entitlement is short-lived (30s staleTime) by design.
  const entitlementQuery = useDonorEntitlement({ enabled: open });
  const checkout = useStartCheckout();
  const packCheckout = useStartPackCheckout();

  // Complete by construction: `useDonorPlanCatalog` merges the shipped defaults
  // into the response per plan, so a paid tier the API omitted still prices
  // itself here rather than rendering "—" above a live checkout button.
  const catalog = catalogQuery.data ?? DONOR_PLAN_CATALOG_FALLBACK;
  const byPlan = new Map<string, DonorPlanCatalogEntry>(
    catalog.plans.map((entry) => [entry.plan, entry])
  );

  // Only reports and intros have a top-up pack; diligence/profiles upgrade only.
  const packDimension = dimension === "reports" || dimension === "intros" ? dimension : null;
  const dimensionPacks = packDimension
    ? catalog.packs.filter((pack) => pack.dimension === packDimension)
    : [];

  // Intro packs are a subscriber benefit. Until the entitlement resolves we do
  // not know which side of that line the advisor is on, so the row renders a
  // skeleton rather than an offer that may 403 or a denial that may be wrong.
  const entitlement = entitlementQuery.data;
  const isSubscriber = entitlement ? statusGrantsPlanAllowance(entitlement.status) : null;
  const subscriberOnlyPacks = packDimension === "intros";
  const packsResolving = subscriberOnlyPacks && isSubscriber === null && !entitlementQuery.isError;
  // On an entitlement read failure, fall back to hiding the subscriber-only
  // offer: a purchase the backend refuses is worse than one fewer shortcut.
  const topUpPacks = subscriberOnlyPacks && isSubscriber !== true ? [] : dimensionPacks;

  const { noun } = DIMENSION_LABEL[dimension];
  const anyPending = checkout.isPending || packCheckout.isPending;
  const alreadySubscribed = isSubscriptionAlreadyActive(checkout.error);

  // Only a LOADED `false` disables checkout. An unreachable catalog is not an
  // answer, and reading it as one would hide the upgrade path from every
  // advisor whenever the endpoint blips — either source saying so is enough,
  // since the entitlement resolves the environment for a signed-in advisor and
  // the catalog resolves it for everyone.
  const billingDisabled =
    catalogQuery.data?.billingEnabled === false || entitlement?.billingEnabled === false;

  useReportedError("Error starting donor-research checkout", checkout.error);
  useReportedError("Error starting donor-research pack checkout", packCheckout.error);

  // Every checkout control is REPLACED, not merely disabled: with no Stripe
  // credentials on the environment there is nothing behind them, and a greyed
  // out price still reads as an offer.
  if (billingDisabled) {
    return <BillingUnavailableDialog onOpenChange={onOpenChange} open={open} />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keep researching</DialogTitle>
          <DialogDescription>
            {reason ??
              `You're out of ${pluralize(noun)} on your plan. Upgrade for a higher monthly allowance` +
                (topUpPacks.length > 0 ? ", or top up with a one-time pack." : ".")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PURCHASABLE_PLANS.map((plan) => (
            <PlanCard
              allowance={Number(byPlan.get(plan)?.[DIMENSION_LABEL[dimension].field] ?? 0)}
              dimension={dimension}
              disabled={anyPending}
              entry={byPlan.get(plan)}
              key={plan}
              noun={noun}
              onSelect={() => checkout.mutate({ plan })}
              pending={checkout.isPending && checkout.variables?.plan === plan}
              plan={plan}
            />
          ))}
        </div>

        <TopUpSection
          disabled={anyPending}
          noun={noun}
          onSelect={(pack) => packCheckout.mutate({ pack })}
          packs={topUpPacks}
          pendingPack={packCheckout.isPending ? (packCheckout.variables?.pack ?? null) : null}
          resolving={packsResolving}
          subscriberOnly={subscriberOnlyPacks}
        />

        {alreadySubscribed ? (
          <AlreadySubscribedNotice
            hasBillingAccount={Boolean(entitlement?.hasBillingAccount)}
            onClose={() => onOpenChange(false)}
          />
        ) : checkout.isError || packCheckout.isError ? (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {CHECKOUT_ERROR_COPY}
          </div>
        ) : null}

        <p className="mt-2 text-xs text-muted-foreground">
          Running research for a whole advisory team?{" "}
          <Link
            href={SOCIALS.DONOR_PARTNER_FORM}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Talk to our team about Enterprise
          </Link>
          .
        </p>

        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={anyPending}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface BillingUnavailableDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * The dialog when the catalog or the entitlement reports
 * `billingEnabled: false`: the environment has no Stripe credentials, so
 * anything picked here would fail at the checkout call.
 */
function BillingUnavailableDialog({ onOpenChange, open }: BillingUnavailableDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keep researching</DialogTitle>
          <DialogDescription>{BILLING_UNAVAILABLE_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted p-4 text-sm text-foreground">
          <p>
            Plans can't be purchased here yet.{" "}
            <Link
              href={SOCIALS.DONOR_PARTNER_FORM}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-muted-foreground"
            >
              Talk to our team
            </Link>{" "}
            to set one up.
          </p>
        </div>

        <div className="mt-2 flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PlanCardProps {
  allowance: number;
  dimension: UpgradeDimension;
  disabled: boolean;
  entry: DonorPlanCatalogEntry | undefined;
  noun: string;
  onSelect: () => void;
  pending: boolean;
  plan: PurchasableDonorPlan;
}

/** One purchasable plan, priced from the live catalog. */
function PlanCard({
  allowance,
  dimension,
  disabled,
  entry,
  noun,
  onSelect,
  pending,
  plan,
}: PlanCardProps) {
  const presentation = DONOR_PLAN_PRESENTATION[plan];

  return (
    <Button
      className={cn(
        // A plan card, not a control strip: the primitive's single-row, fixed
        // height, centred layout is overridden wholesale.
        "h-auto w-full flex-col items-start justify-start gap-2 whitespace-normal rounded-lg p-4 text-left",
        "hover:border-primary hover:bg-primary/5 hover:text-foreground",
        "[&_svg]:size-3"
      )}
      disabled={disabled}
      onClick={onSelect}
      type="button"
      variant="outline"
    >
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {presentation.name}
      </span>
      <span className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground">
          {entry?.priceCents ? formatPlanPrice(entry.priceCents) : "—"}
        </span>
        <span className="text-sm text-muted-foreground">/ month</span>
      </span>
      {allowance > 0 ? (
        <span className="text-sm font-medium text-foreground">
          {allowance} {pluralize(noun, allowance)}
          {dimension === "profiles" ? "" : " / month"}
        </span>
      ) : null}
      <span className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
        {presentation.tagline}
      </span>
      {pending ? (
        <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Redirecting…
        </span>
      ) : null}
    </Button>
  );
}

interface TopUpSectionProps {
  disabled: boolean;
  noun: string;
  onSelect: (pack: DonorResearchPack) => void;
  packs: readonly DonorPackCatalogEntry[];
  pendingPack: DonorResearchPack | null;
  /** True while the entitlement that decides subscriber-only eligibility loads. */
  resolving: boolean;
  /** True for a dimension whose pack requires an active subscription (intros). */
  subscriberOnly: boolean;
}

/**
 * The one-time top-up row. Three states, because an intro pack is only
 * purchasable by a subscriber and guessing either way is worse than waiting:
 * loading (skeleton), offered (the packs), and subscriber-only (an explanation
 * instead of a button the backend would 403).
 */
function TopUpSection({
  disabled,
  noun,
  onSelect,
  packs,
  pendingPack,
  resolving,
  subscriberOnly,
}: TopUpSectionProps) {
  if (resolving) {
    return (
      <div aria-busy="true" className="mt-1 flex flex-col gap-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-40" />
      </div>
    );
  }

  if (packs.length === 0) {
    if (!subscriberOnly) return null;
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        Warm intros are a subscriber benefit. Pick a plan above and you can top up with an intro
        pack any time after that.
      </p>
    );
  }

  return (
    <div className="mt-1 flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Or top up once
      </p>
      <div className="flex flex-wrap gap-2">
        {packs.map((pack) => (
          <Button
            className={cn(
              "h-auto items-baseline gap-2 rounded-lg px-3 py-2 text-left",
              "hover:border-primary hover:bg-primary/5 hover:text-foreground",
              "[&_svg]:size-3"
            )}
            disabled={disabled}
            key={pack.pack}
            onClick={() => onSelect(pack.pack)}
            type="button"
            variant="outline"
          >
            <span className="text-sm font-semibold text-foreground">
              {pack.units} {pluralize(noun, pack.units)}
            </span>
            <span className="text-sm text-muted-foreground">
              {formatPlanPrice(pack.priceCents)}
            </span>
            {pendingPack === pack.pack ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : null}
          </Button>
        ))}
      </div>
    </div>
  );
}

interface AlreadySubscribedNoticeProps {
  hasBillingAccount: boolean;
  onClose: () => void;
}

/**
 * The 409 branch: the advisor already has a live Stripe subscription, so a
 * second checkout would bill in parallel. Plan changes belong in the billing
 * portal — which only exists once the webhook has written a Stripe customer,
 * hence the `hasBillingAccount` gate on the CTA.
 */
function AlreadySubscribedNotice({ hasBillingAccount, onClose }: AlreadySubscribedNoticeProps) {
  const portal = useOpenBillingPortal();

  useReportedError("Error opening donor-research billing portal", portal.error);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mt-3 flex flex-col items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
    >
      <p>{DONOR_SUBSCRIPTION_ALREADY_ACTIVE_MESSAGE}</p>
      <p>Change or cancel your plan from the billing portal; a second checkout would bill twice.</p>
      {hasBillingAccount ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => portal.mutate()}
          disabled={portal.isPending}
          isLoading={portal.isPending}
        >
          Manage billing
        </Button>
      ) : (
        <Button asChild size="sm" variant="outline">
          <Link href={PAGES.DONOR_RESEARCH.BILLING} onClick={onClose}>
            Go to billing
          </Link>
        </Button>
      )}
      {portal.isError ? (
        <p>
          {isBillingPortalUnavailable(portal.error)
            ? DONOR_BILLING_PORTAL_UNAVAILABLE_MESSAGE
            : DONOR_BILLING_PORTAL_ERROR_MESSAGE}
        </p>
      ) : null}
    </div>
  );
}
