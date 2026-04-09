"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type CommunityPayoutAgreementInfo,
  type CommunityPayoutInvoiceInfo,
  MilestoneLifecycleStatus,
} from "@/src/features/payout-disbursement";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

interface AgreementBadgeProps {
  agreement: CommunityPayoutAgreementInfo | null;
}

export function AgreementBadge({ agreement }: AgreementBadgeProps) {
  const isSigned = agreement?.signed === true;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-default",
              isSigned
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400"
            )}
          >
            {isSigned ? "Signed" : "Not signed"}
          </span>
        </TooltipTrigger>
        {isSigned && agreement?.signedAt && (
          <TooltipContent side="top">
            <p className="text-xs">Signed on {formatDate(agreement.signedAt, "UTC")}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

interface PendingDisbursalBadgeProps {
  invoices: CommunityPayoutInvoiceInfo[];
}

export function PendingDisbursalBadge({ invoices }: PendingDisbursalBadgeProps) {
  const pendingItems = invoices.filter(
    (inv) =>
      inv.milestoneStatus === MilestoneLifecycleStatus.VERIFIED && inv.paymentStatus === "unpaid"
  );

  if (pendingItems.length === 0) return null;

  const count = pendingItems.length;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${count} pending disbursal ${count === 1 ? "milestone" : "milestones"}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            {count} pending disbursal
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-0.5 text-xs">
            <p className="font-medium">
              {count} verified {count === 1 ? "milestone" : "milestones"} awaiting disbursal
            </p>
            {pendingItems.slice(0, 5).map((item, index) => (
              <p key={item.milestoneUID || `pending-${index}`} className="text-muted-foreground">
                {item.milestoneLabel}
              </p>
            ))}
            {pendingItems.length > 5 && (
              <p className="text-muted-foreground">+{pendingItems.length - 5} more</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ProgressCellProps {
  invoices: CommunityPayoutInvoiceInfo[];
  paidMilestoneCount: number;
  invoiceRequired?: boolean;
}

export function ProgressCell({
  invoices,
  paidMilestoneCount,
  invoiceRequired = true,
}: ProgressCellProps) {
  const total = invoices.length;
  const paid = paidMilestoneCount;
  const received = invoices.filter(
    (inv) => inv.invoiceStatus === "received" || inv.invoiceStatus === "paid"
  ).length;
  const completed = invoices.filter(
    (inv) =>
      inv.milestoneStatus === MilestoneLifecycleStatus.COMPLETED ||
      inv.milestoneStatus === MilestoneLifecycleStatus.VERIFIED
  ).length;

  if (total === 0) {
    return <span className="text-xs text-gray-500 dark:text-zinc-500">No milestones</span>;
  }

  // For non-invoice programs, only paid status determines "all done".
  // For invoice programs, all three metrics must be complete.
  const allDone = invoiceRequired
    ? paid === total && received === total && completed === total
    : paid === total && completed === total;
  const hasProgress = paid > 0 || received > 0 || completed > 0;

  return (
    <div
      className={cn(
        "text-xs tabular-nums whitespace-nowrap",
        allDone
          ? "text-green-700 dark:text-green-400"
          : hasProgress
            ? "text-blue-700 dark:text-blue-400"
            : "text-gray-600 dark:text-zinc-400"
      )}
    >
      <div>
        {received}/{total} invoices received
      </div>
      <div>
        {completed}/{total} milestones completed
      </div>
      <div>
        {paid}/{total} milestones paid
      </div>
    </div>
  );
}
