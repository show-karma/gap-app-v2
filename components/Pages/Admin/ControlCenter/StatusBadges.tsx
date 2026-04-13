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

type StepStatus = "complete" | "in-progress" | "empty";

function getStepStatus(count: number, total: number): StepStatus {
  if (count === total) return "complete";
  if (count > 0) return "in-progress";
  return "empty";
}

const stepStyles: Record<StepStatus, { text: string; bg: string }> = {
  complete: {
    text: "text-green-700 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  "in-progress": {
    text: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  empty: {
    text: "text-muted-foreground",
    bg: "bg-muted/50",
  },
};

const connectorStyles: Record<StepStatus, string> = {
  complete: "text-green-400 dark:text-green-600",
  "in-progress": "text-muted-foreground/40",
  empty: "text-muted-foreground/25",
};

function PipelineStep({
  label,
  count,
  total,
  status,
}: {
  label: string;
  count: number;
  total: number;
  status: StepStatus;
}) {
  const style = stepStyles[status];
  return (
    <span
      className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded", style.bg, style.text)}
    >
      <span className="font-medium tabular-nums">
        {count}/{total}
      </span>
      <span>{label}</span>
    </span>
  );
}

function PipelineConnector({ status }: { status: StepStatus }) {
  return (
    <svg
      className={cn("shrink-0", connectorStyles[status])}
      width="16"
      height="10"
      viewBox="0 0 16 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 5h12m0 0L9 2m3 3L9 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  const done = invoices.filter(
    (inv) =>
      inv.milestoneStatus === MilestoneLifecycleStatus.COMPLETED ||
      inv.milestoneStatus === MilestoneLifecycleStatus.VERIFIED
  ).length;
  const verified = invoices.filter(
    (inv) => inv.milestoneStatus === MilestoneLifecycleStatus.VERIFIED
  ).length;

  if (total === 0) {
    return <span className="text-xs text-muted-foreground">No milestones</span>;
  }

  const doneStatus = getStepStatus(done, total);
  const verifiedStatus = getStepStatus(verified, total);
  const paidStatus = getStepStatus(paid, total);

  const invoiceStatus = getStepStatus(received, total);

  return (
    <div className="space-y-1.5">
      {invoiceRequired && (
        <div className="inline-flex items-center gap-1.5 text-[11px] whitespace-nowrap">
          <span className="font-medium text-muted-foreground">Invoices</span>
          <PipelineStep label="Received" count={received} total={total} status={invoiceStatus} />
        </div>
      )}
      <div className="inline-flex items-center gap-1 text-[11px] whitespace-nowrap">
        <span className="font-medium text-muted-foreground">Milestones</span>
        <PipelineStep label="Completed" count={done} total={total} status={doneStatus} />
        <PipelineConnector status={doneStatus === "complete" ? verifiedStatus : "empty"} />
        <PipelineStep label="Verified" count={verified} total={total} status={verifiedStatus} />
        <PipelineConnector status={verifiedStatus === "complete" ? paidStatus : "empty"} />
        <PipelineStep label="Paid" count={paid} total={total} status={paidStatus} />
      </div>
    </div>
  );
}
