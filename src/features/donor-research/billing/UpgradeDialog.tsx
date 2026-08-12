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
import {
  useDonorPlanCatalog,
  useStartCheckout,
  useStartPackCheckout,
} from "@/hooks/useDonorBilling";
import {
  DONOR_PLAN_PRESENTATION,
  FALLBACK_PACK_CATALOG,
  FALLBACK_PLAN_CATALOG,
  formatPlanPrice,
} from "@/src/features/donor-research/billing/pricing-content";
import type {
  DonorPackCatalogEntry,
  DonorPlanCatalogEntry,
  PurchasableDonorPlan,
} from "@/types/donor-research-billing";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

const PURCHASABLE_PLANS: readonly PurchasableDonorPlan[] = ["starter", "pro", "firm"];

/** Which metered dimension the dialog is being opened for. */
export type UpgradeDimension = "reports" | "intros" | "diligence" | "profiles";

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
  const topUpPacks = packDimension
    ? allPacks.filter((pack) => pack.dimension === packDimension)
    : [];

  const { noun } = DIMENSION_LABEL[dimension];
  const anyPending = checkout.isPending || packCheckout.isPending;

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
          {PURCHASABLE_PLANS.map((plan) => {
            const entry = byPlan.get(plan);
            const presentation = DONOR_PLAN_PRESENTATION[plan];
            const allowance = entry ? Number(entry[DIMENSION_LABEL[dimension].field]) : 0;
            const isPending = checkout.isPending && checkout.variables?.plan === plan;

            return (
              <button
                key={plan}
                type="button"
                disabled={anyPending}
                onClick={() => checkout.mutate({ plan })}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-lg border border-border bg-background p-4 text-left transition-colors",
                  "hover:border-primary hover:bg-primary/5",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                {isPending ? (
                  <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Redirecting…
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {topUpPacks.length > 0 ? (
          <div className="mt-1 flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Or top up once
            </p>
            <div className="flex flex-wrap gap-2">
              {topUpPacks.map((pack) => {
                const isPending =
                  packCheckout.isPending && packCheckout.variables?.pack === pack.pack;
                return (
                  <button
                    key={pack.pack}
                    type="button"
                    disabled={anyPending}
                    onClick={() => packCheckout.mutate({ pack: pack.pack })}
                    className={cn(
                      "flex items-baseline gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors",
                      "hover:border-primary hover:bg-primary/5",
                      "disabled:cursor-not-allowed disabled:opacity-60"
                    )}
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {pack.units} {pluralize(noun, pack.units)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatPlanPrice(pack.priceCents)}
                    </span>
                    {isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {checkout.isError || packCheckout.isError ? (
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
