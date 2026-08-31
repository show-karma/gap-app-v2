"use client";

import { FileText } from "lucide-react";
import pluralize from "pluralize";
import { useDonorEntitlement } from "@/hooks/useDonorBilling";
import { Link } from "@/src/components/navigation/Link";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

/**
 * "3 reports left · Starter" chip in the donor-research header.
 *
 * Links to the billing page so the affordance for running out is one click
 * away rather than something discovered at submit time. Renders "—" while
 * loading and on error rather than a fabricated count: an advisor acting on a
 * wrong number here would be worse than an advisor seeing no number.
 */
export function ReportQuotaBadge() {
  const entitlementQuery = useDonorEntitlement();
  const entitlement = entitlementQuery.data;

  const remaining = entitlement?.reportsRemaining ?? null;
  const isEmpty = remaining === 0;

  return (
    <Link
      href={PAGES.DONOR_RESEARCH.BILLING}
      className={cn(
        "flex items-stretch overflow-hidden rounded-md border text-xs transition-colors",
        isEmpty
          ? "border-amber-300 bg-amber-50 hover:border-amber-400 dark:border-amber-700/60 dark:bg-amber-950/40"
          : "border-border bg-background hover:border-primary/40"
      )}
      aria-label={
        remaining === null
          ? "Report allowance — open billing"
          : `${remaining} ${pluralize("report", remaining)} left — open billing`
      }
    >
      <div className="flex items-center gap-1.5 border-r border-border/60 px-2.5 py-1.5">
        <FileText
          className="h-3 w-3 text-brand-emphasis dark:text-brand-subtle"
          aria-hidden="true"
        />
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {entitlement?.plan ?? "plan"}
        </span>
      </div>
      <div className="flex items-baseline gap-1 px-2.5 py-1.5">
        <span className="font-mono tabular-nums text-foreground">{remaining ?? "—"}</span>
        <span className="text-xs text-muted-foreground">
          {remaining === null ? "reports left" : `${pluralize("report", remaining)} left`}
        </span>
      </div>
      {isEmpty ? (
        <div className="flex items-center border-l border-amber-300/60 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-700 dark:border-amber-700/60 dark:text-amber-300">
          upgrade
        </div>
      ) : null}
    </Link>
  );
}
