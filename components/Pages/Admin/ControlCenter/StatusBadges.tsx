"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type CommunityPayoutAgreementInfo,
  type CommunityPayoutInvoiceInfo,
  type InvoiceStatus,
  MilestoneLifecycleStatus,
} from "@/src/features/payout-disbursement";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

export function AgreementBadge({ agreement }: { agreement: CommunityPayoutAgreementInfo | null }) {
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

export function PendingDisbursalBadge({ invoices }: { invoices: CommunityPayoutInvoiceInfo[] }) {
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 cursor-default">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            {count} pending disbursal
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-0.5 text-xs">
            <p className="font-medium">
              {count} verified {count === 1 ? "milestone" : "milestones"} awaiting disbursal
            </p>
            {pendingItems.slice(0, 5).map((item) => (
              <p key={item.milestoneUID || item.milestoneLabel} className="text-muted-foreground">
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

export function ProgressCell({
  invoices,
  paidMilestoneCount,
  invoiceRequired = true,
}: {
  invoices: CommunityPayoutInvoiceInfo[];
  paidMilestoneCount: number;
  invoiceRequired?: boolean;
}) {
  const total = invoices.length;
  const paid = paidMilestoneCount;
  const received = invoices.filter(
    (inv) => inv.invoiceStatus === "received" || inv.invoiceStatus === "paid"
  ).length;

  if (total === 0) {
    return <span className="text-xs text-gray-500 dark:text-zinc-500">No milestones</span>;
  }

  const allDone = invoiceRequired ? paid === total && received === total : paid === total;
  const hasProgress = invoiceRequired ? paid > 0 || received > 0 : paid > 0;

  const countsByStatus = invoiceRequired
    ? invoices.reduce(
        (acc, inv) => {
          acc[inv.invoiceStatus] = (acc[inv.invoiceStatus] || 0) + 1;
          return acc;
        },
        {} as Record<InvoiceStatus, number>
      )
    : ({} as Record<InvoiceStatus, number>);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "text-xs tabular-nums cursor-default",
              allDone
                ? "text-green-700 dark:text-green-400"
                : hasProgress
                  ? "text-blue-700 dark:text-blue-400"
                  : "text-gray-600 dark:text-zinc-400"
            )}
          >
            <div>
              {paid}/{total} milestones paid
            </div>
            {invoiceRequired && (
              <div>
                {received}/{total} invoices received
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-0.5 text-xs">
            <p>
              {total} {total === 1 ? "milestone" : "milestones"}, {paid} paid
            </p>
            {countsByStatus.paid ? <p>Invoices paid: {countsByStatus.paid}</p> : null}
            {countsByStatus.received ? <p>Invoices received: {countsByStatus.received}</p> : null}
            {countsByStatus.not_submitted ? (
              <p>Invoices not submitted: {countsByStatus.not_submitted}</p>
            ) : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
