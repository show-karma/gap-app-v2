"use client";

import {
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import {
  type CommunityPayoutAgreementInfo,
  type CommunityPayoutInvoiceInfo,
  formatDisplayAmount,
  fromSmallestUnit,
  type MilestoneAllocation,
  MilestoneLifecycleStatus,
  type MilestonePaymentStatus,
  type PayoutDisbursement,
  PayoutDisbursementStatus,
  TokenBreakdown,
  type TokenTotal,
} from "@/src/features/payout-disbursement";
import { formatAddressForDisplay } from "@/utilities/donations/helpers";
import { formatDate } from "@/utilities/formatDate";
import { getChainNameById } from "@/utilities/network";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

// ─── Props ──────────────────────────────────────────────────────────────────

export interface PublicProjectDetailsModalGrant {
  grantUid: string;
  projectUid: string;
  projectName: string;
  projectSlug: string;
  grantName: string;
  grantProgramId: string;
  grantChainId: number;
  projectChainId: number;
  currentPayoutAddress?: string;
  currentAmount?: string;
  currency?: string;
}

interface PublicProjectDetailsModalProps {
  grant: PublicProjectDetailsModalGrant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityUID: string;
  invoiceRequired?: boolean;
  disbursementInfo: {
    totalsByToken: TokenTotal[];
    status: string;
    history: PayoutDisbursement[];
  } | null;
  agreement: CommunityPayoutAgreementInfo | null;
  milestoneInvoices: CommunityPayoutInvoiceInfo[];
  milestoneAllocations?: MilestoneAllocation[] | null;
}

// ─── Payment status display config ──────────────────────────────────────────

const paymentStatusConfig: Record<
  MilestonePaymentStatus,
  { label: string; dotColor: string; textColor: string }
> = {
  unpaid: {
    label: "Unpaid",
    dotColor: "bg-gray-300 dark:bg-zinc-600",
    textColor: "text-gray-500 dark:text-zinc-500",
  },
  pending: {
    label: "Pending",
    dotColor: "bg-amber-400",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  awaiting_signatures: {
    label: "Awaiting sigs",
    dotColor: "bg-blue-400",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  disbursed: {
    label: "Disbursed",
    dotColor: "bg-green-500",
    textColor: "text-green-600 dark:text-green-400",
  },
};

// ─── Milestone lifecycle status display config ──────────────────────────────

const milestoneStatusConfig: Record<
  MilestoneLifecycleStatus,
  { label: string; dotColor: string; textColor: string }
> = {
  [MilestoneLifecycleStatus.PENDING]: {
    label: "Pending",
    dotColor: "bg-gray-300 dark:bg-zinc-600",
    textColor: "text-gray-500 dark:text-zinc-500",
  },
  [MilestoneLifecycleStatus.COMPLETED]: {
    label: "Completed",
    dotColor: "bg-blue-400",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  [MilestoneLifecycleStatus.VERIFIED]: {
    label: "Verified",
    dotColor: "bg-green-500",
    textColor: "text-green-600 dark:text-green-400",
  },
  [MilestoneLifecycleStatus.PAST_DUE]: {
    label: "Past due",
    dotColor: "bg-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
  },
};

// ─── Invoice status display config (2-state) ────────────────────────────────

const invoiceStatusConfig: Record<string, { label: string; className: string }> = {
  not_submitted: {
    label: "Not submitted",
    className: "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
  received: {
    label: "Invoice received",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
};

function getEffectiveMilestoneStatus(
  milestoneStatus: MilestoneLifecycleStatus | null,
  milestoneDueDate: string | null
): MilestoneLifecycleStatus {
  const status = milestoneStatus || MilestoneLifecycleStatus.PENDING;
  if (status === MilestoneLifecycleStatus.PENDING && milestoneDueDate) {
    const due = new Date(milestoneDueDate);
    if (due.getTime() < Date.now()) {
      return MilestoneLifecycleStatus.PAST_DUE;
    }
  }
  return status;
}

function getInvoiceStatusKey(invoiceStatus: string): string {
  return invoiceStatus === "received" || invoiceStatus === "paid" ? "received" : "not_submitted";
}

function getMilestoneStatusTooltip(
  effectiveStatus: MilestoneLifecycleStatus,
  statusUpdatedAt: string | null,
  dueDate: string | null
): string {
  const fmtDate = (iso: string) => formatDate(iso, "UTC");
  switch (effectiveStatus) {
    case MilestoneLifecycleStatus.COMPLETED:
      return statusUpdatedAt ? `Completed on ${fmtDate(statusUpdatedAt)}` : "Completed";
    case MilestoneLifecycleStatus.VERIFIED:
      return statusUpdatedAt ? `Verified on ${fmtDate(statusUpdatedAt)}` : "Verified";
    case MilestoneLifecycleStatus.PAST_DUE:
      return dueDate ? `Due ${fmtDate(dueDate)}` : "Past due";
    case MilestoneLifecycleStatus.PENDING: {
      const parts: string[] = [];
      if (statusUpdatedAt) parts.push(`Created ${fmtDate(statusUpdatedAt)}`);
      if (dueDate) parts.push(`Due ${fmtDate(dueDate)}`);
      return parts.length > 0 ? parts.join(" \u00B7 ") : "Pending";
    }
    default:
      return effectiveStatus;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Read-only modal with multiple display sections and conditional rendering for milestone statuses.
export function PublicProjectDetailsModal({
  grant,
  open,
  onOpenChange,
  invoiceRequired = false,
  disbursementInfo,
  agreement,
  milestoneInvoices,
  milestoneAllocations,
}: PublicProjectDetailsModalProps) {
  const [, copyToClipboard] = useCopyToClipboard();

  const totalsByToken = disbursementInfo?.totalsByToken || [];
  const history = disbursementInfo?.history || [];

  const { awaitingTx, chainInfo } = useMemo(() => {
    const awaiting = history.find((d) => d.status === PayoutDisbursementStatus.AWAITING_SIGNATURES);
    const chain =
      history.length > 0
        ? {
            chainID: history[0].chainID,
            token: history[0].token,
            tokenDecimals: history[0].tokenDecimals,
          }
        : null;
    return { awaitingTx: awaiting ?? null, chainInfo: chain };
  }, [history]);

  const remainingBalance = useMemo(() => {
    if (!grant?.currentAmount) return null;
    const approved = parseFloat(grant.currentAmount);
    if (Number.isNaN(approved) || approved === 0) return null;

    let totalDisbursed = 0;
    for (const t of totalsByToken) {
      totalDisbursed += fromSmallestUnit(t.totalAmount || "0", t.tokenDecimals ?? 6);
    }
    const remaining = approved - totalDisbursed;
    const pct = Math.min(100, Math.round((totalDisbursed / approved) * 100));
    return { approved, totalDisbursed, remaining, pct };
  }, [grant?.currentAmount, totalsByToken]);

  const milestoneSummary = useMemo(() => {
    if (milestoneInvoices.length === 0) return null;
    const total = milestoneInvoices.length;
    const received = milestoneInvoices.filter(
      (i) => i.invoiceStatus === "received" || i.invoiceStatus === "paid"
    ).length;
    const paid = milestoneInvoices.filter((i) => i.paymentStatus === "disbursed").length;
    return { total, received, paid };
  }, [milestoneInvoices]);

  const allocationByUID = useMemo(() => {
    const map = new Map<string, string>();
    if (milestoneAllocations) {
      for (const alloc of milestoneAllocations) {
        if (alloc.milestoneUID) {
          map.set(alloc.milestoneUID, alloc.amount);
        }
      }
    }
    return map;
  }, [milestoneAllocations]);

  const handleCopyAddress = () => {
    if (!grant?.currentPayoutAddress) return;
    copyToClipboard(grant.currentPayoutAddress, "Address copied");
  };

  if (!grant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col bg-white dark:bg-zinc-950">
        <DialogHeader className="space-y-3 pb-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
                {grant.projectName}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                {grant.grantName}
                {chainInfo && (
                  <span className="ml-2 text-xs text-gray-400 dark:text-zinc-500">
                    · {getChainNameById(chainInfo.chainID)} · {chainInfo.token}
                  </span>
                )}
              </DialogDescription>
            </div>
            <a
              href={PAGES.PROJECT.GRANT(grant.projectSlug, grant.grantUid)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0 mt-1"
            >
              View grant
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Status panel */}
          <div className="rounded-lg bg-gray-50 dark:bg-zinc-900 p-3 space-y-2.5">
            {/* Agreement row */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white dark:bg-zinc-800/50">
                <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                  Agreement:
                </span>
                {agreement?.signed ? (
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Signed {agreement.signedAt ? formatDate(agreement.signedAt, "UTC") : ""}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-zinc-500">Not signed</span>
                )}
              </div>
            </div>

            {/* Payout summary */}
            <div className="flex items-center gap-5 flex-wrap text-xs text-gray-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Address:</span>
                {grant.currentPayoutAddress ? (
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="inline-flex items-center gap-1 font-mono hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    title={`Click to copy: ${grant.currentPayoutAddress}`}
                  >
                    {formatAddressForDisplay(grant.currentPayoutAddress)}
                    <ClipboardDocumentIcon className="h-3 w-3 opacity-50" />
                  </button>
                ) : (
                  <span className="text-gray-400 dark:text-zinc-500 italic font-sans">
                    Not configured
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Approved:</span>
                <span className="tabular-nums text-sm text-gray-700 dark:text-zinc-300">
                  {grant.currentAmount && parseFloat(grant.currentAmount) > 0
                    ? `${formatDisplayAmount(grant.currentAmount)}${grant.currency ? ` ${grant.currency}` : ""}`
                    : "\u2014"}
                </span>
              </div>
              {totalsByToken.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">Disbursed:</span>
                  <span className="text-sm">
                    <TokenBreakdown totalsByToken={totalsByToken} size="sm" />
                  </span>
                </div>
              )}
            </div>

            {/* Remaining balance progress */}
            {remainingBalance && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      remainingBalance.pct >= 100
                        ? "bg-green-500"
                        : remainingBalance.pct >= 75
                          ? "bg-blue-500"
                          : "bg-blue-400"
                    )}
                    style={{ width: `${Math.min(100, remainingBalance.pct)}%` }}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-gray-400 dark:text-zinc-500 whitespace-nowrap">
                  {remainingBalance.pct}% disbursed
                  {remainingBalance.remaining > 0 && (
                    <> · {formatDisplayAmount(String(remainingBalance.remaining))} remaining</>
                  )}
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto -mx-6 px-6">
          <div className="py-4 space-y-4">
            {/* Awaiting signatures banner */}
            {awaitingTx && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  Awaiting Safe signatures{" \u2014 "}
                  {formatDisplayAmount(
                    String(
                      fromSmallestUnit(
                        awaitingTx.disbursedAmount || "0",
                        awaitingTx.tokenDecimals ?? 6
                      )
                    )
                  )}{" "}
                  {awaitingTx.token}
                  {awaitingTx.createdAt && (
                    <span className="text-amber-500 dark:text-amber-400/70">
                      {" "}
                      since {formatDate(awaitingTx.createdAt, "UTC")}
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Milestone completion summary */}
            {milestoneSummary && (
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400">
                {invoiceRequired && (
                  <span>
                    <span className="font-medium text-gray-700 dark:text-zinc-300">
                      {milestoneSummary.received}/{milestoneSummary.total}
                    </span>{" "}
                    {milestoneSummary.total === 1 ? "invoice" : "invoices"} received
                  </span>
                )}
                <span>
                  <span className="font-medium text-gray-700 dark:text-zinc-300">
                    {milestoneSummary.paid}/{milestoneSummary.total}
                  </span>{" "}
                  {milestoneSummary.total === 1 ? "milestone" : "milestones"} paid
                </span>
              </div>
            )}

            {/* Milestones table */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">
                Milestones ({milestoneInvoices.length})
              </h3>

              {milestoneInvoices.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-zinc-400 py-4 text-center">
                  No milestones configured yet.
                </p>
              ) : (
                <TooltipProvider delayDuration={150}>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
                          <th className="text-left py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[140px]">
                            Milestone
                          </th>
                          <th className="text-center py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[100px]">
                            Milestone Status
                          </th>
                          <th className="text-right py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[80px]">
                            Allocation
                          </th>
                          {invoiceRequired && (
                            <th className="text-center py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[110px]">
                              Invoice Status
                            </th>
                          )}
                          <th className="text-center py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[110px]">
                            Payment
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                        {milestoneInvoices.map((invoice, idx) => {
                          const paymentCfg = paymentStatusConfig[invoice.paymentStatus ?? "unpaid"];
                          const effectiveMsStatus = getEffectiveMilestoneStatus(
                            invoice.milestoneStatus,
                            invoice.milestoneDueDate
                          );
                          const msCfg =
                            milestoneStatusConfig[effectiveMsStatus] ??
                            milestoneStatusConfig[MilestoneLifecycleStatus.PENDING];
                          const msTooltip = getMilestoneStatusTooltip(
                            effectiveMsStatus,
                            invoice.milestoneStatusUpdatedAt,
                            invoice.milestoneDueDate
                          );
                          const invStatusKey = getInvoiceStatusKey(invoice.invoiceStatus);
                          const invCfg = invoiceStatusConfig[invStatusKey];

                          return (
                            <tr
                              key={invoice.milestoneUID || `${invoice.milestoneLabel}-${idx}`}
                              className="bg-white dark:bg-zinc-950"
                            >
                              <td className="py-3 px-3">
                                <span className="font-medium text-gray-900 dark:text-zinc-100 line-clamp-2">
                                  {invoice.milestoneLabel}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1.5 text-xs font-medium cursor-default",
                                        msCfg.textColor
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "h-1.5 w-1.5 rounded-full shrink-0",
                                          msCfg.dotColor
                                        )}
                                      />
                                      {msCfg.label}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{msTooltip}</p>
                                  </TooltipContent>
                                </Tooltip>
                                {effectiveMsStatus === MilestoneLifecycleStatus.COMPLETED && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <ExclamationTriangleIcon className="inline h-3.5 w-3.5 ml-1 text-amber-500 cursor-default" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>The milestone has not been verified yet</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {(() => {
                                  const amount =
                                    invoice.allocatedAmount ??
                                    (invoice.milestoneUID
                                      ? allocationByUID.get(invoice.milestoneUID)
                                      : undefined) ??
                                    null;
                                  if (amount !== null) {
                                    return (
                                      <span className="text-xs tabular-nums text-gray-700 dark:text-zinc-300">
                                        {formatDisplayAmount(amount)}
                                        {grant.currency && (
                                          <span className="text-gray-400 dark:text-zinc-500 ml-0.5">
                                            {grant.currency}
                                          </span>
                                        )}
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="text-xs text-gray-300 dark:text-zinc-600">
                                      &mdash;
                                    </span>
                                  );
                                })()}
                              </td>
                              {invoiceRequired && (
                                <td className="py-3 px-3 text-center">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span
                                      className={cn(
                                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                        invCfg.className
                                      )}
                                    >
                                      {invCfg.label}
                                    </span>
                                    {invoice.invoiceReceivedAt && (
                                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 tabular-nums">
                                        {formatDate(invoice.invoiceReceivedAt, "UTC")}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}
                              <td className="py-3 px-3 text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1.5 text-xs font-medium",
                                      paymentCfg.textColor
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "h-1.5 w-1.5 rounded-full shrink-0",
                                        paymentCfg.dotColor
                                      )}
                                    />
                                    {paymentCfg.label}
                                  </span>
                                  {invoice.paymentStatusDate && (
                                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 tabular-nums">
                                      {formatDate(invoice.paymentStatusDate, "UTC")}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-end w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-gray-500"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
