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
  isSubscriptionAlreadyActive,
  statusGrantsPlanAllowance,
} from "@/services/donor-research-billing.service";
import {
  DONOR_PLAN_PRESENTATION,
  FALLBACK_PACK_CATALOG,
  FALLBACK_PLAN_CATALOG,
  formatPlanPrice,
} from "@/src/features/donor-research/billing/pricing-content";
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

  const entries = catalogQuery.data?.plans?.length
    ? catalogQuery.data.plans
    : FALLBACK_PLAN_CATALOG;
  const byPlan = new Map<string, DonorPlanCatalogEntry>(
    entries.map((entry) => [entry.plan, entry])
  );

  const allPacks: readonly DonorPackCatalogEntry[] = catalogQuery.data?.packs?.length
    ? catalogQuery.data.packs
    : FALLBACK_PACK_CATALOG;
  // Only reports and intros have a top-up pack; diligence/profiles upgrade only.
  const packDimension = dimension === "reports" || dimension === "intros" ? dimension : null;
  const dimensionPacks = packDimension
    ? allPacks.filter((pack) => pack.dimension === packDimension)
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
              allowance={
                byPlan.get(plan) ? Number(byPlan.get(plan)?.[DIMENSION_LABEL[dimension].field]) : 0
              }
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
            message={checkout.error?.message}
            onClose={() => onOpenChange(false)}
          />
        ) : checkout.isError || packCheckout.isError ? (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {(checkout.error ?? packCheckout.error)?.message}
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

/**
 * The 409 branch: the advisor already has a live Stripe subscription, so a
 * second checkout would bill in parallel. Plan changes belong in the billing
 * portal — which only exists once the webhook has written a Stripe customer,
 * hence the `hasBillingAccount` gate on the CTA.
 */
function AlreadySubscribedNotice({
  hasBillingAccount,
  message,
  onClose,
}: {
  hasBillingAccount: boolean;
  message?: string;
  onClose: () => void;
}) {
  const portal = useOpenBillingPortal();

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mt-3 flex flex-col items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
    >
      <p>{message ?? "You already have an active subscription."}</p>
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
      {portal.isError ? <p>{portal.error.message}</p> : null}
    </div>
  );
}
