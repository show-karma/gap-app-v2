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
import { useDonorPlanCatalog, useStartCheckout } from "@/hooks/useDonorBilling";
import {
  DONOR_PLAN_PRESENTATION,
  FALLBACK_PLAN_CATALOG,
  formatPlanPrice,
} from "@/src/features/donor-research/billing/pricing-content";
import type { DonorPlanCatalogEntry, PurchasableDonorPlan } from "@/types/donor-research-billing";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

const PURCHASABLE_PLANS: readonly PurchasableDonorPlan[] = ["starter", "pro"];

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown above the plans — e.g. why the dialog opened. */
  reason?: string;
}

/**
 * Plan picker shown when an advisor runs out of reports, and from the billing
 * page's upgrade button.
 *
 * Selecting a plan creates a Stripe Checkout session and hands the browser
 * over; entitlement lands via webhook, not on the return trip.
 */
export function UpgradeDialog({ open, onOpenChange, reason }: UpgradeDialogProps) {
  const catalogQuery = useDonorPlanCatalog();
  const checkout = useStartCheckout();

  const entries = catalogQuery.data?.plans?.length
    ? catalogQuery.data.plans
    : FALLBACK_PLAN_CATALOG;
  const byPlan = new Map<string, DonorPlanCatalogEntry>(
    entries.map((entry) => [entry.plan, entry])
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose a plan</DialogTitle>
          <DialogDescription>
            {reason ??
              "Pick a monthly plan to keep running research briefs. You'll be redirected to Stripe to complete payment."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PURCHASABLE_PLANS.map((plan) => {
            const entry = byPlan.get(plan);
            const presentation = DONOR_PLAN_PRESENTATION[plan];
            const reports = entry?.reportsIncluded ?? 0;
            const isPending = checkout.isPending && checkout.variables?.plan === plan;

            return (
              <button
                key={plan}
                type="button"
                disabled={checkout.isPending}
                onClick={() => checkout.mutate({ plan })}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-lg border border-border bg-background p-4 text-left transition-colors",
                  "hover:border-primary hover:bg-primary/5",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
                aria-label={`Choose ${presentation.name}: ${reports} reports per month for ${
                  entry?.priceCents ? formatPlanPrice(entry.priceCents) : ""
                } per month`}
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
                {reports > 0 ? (
                  <span className="text-sm font-medium text-foreground">
                    {reports} {pluralize("report", reports)} per month
                  </span>
                ) : null}
                <span className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                  {presentation.tagline}
                </span>
                {isPending ? (
                  <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Redirecting to
                    Stripe…
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {checkout.isError ? (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {checkout.error.message}
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
            disabled={checkout.isPending}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
