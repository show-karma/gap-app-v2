import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type CommunityPayoutInvoiceInfo,
  formatDisplayAmount,
  MilestoneLifecycleStatus,
  type MilestonePaymentStatus,
} from "@/src/features/payout-disbursement";
import { formatAddressForDisplay } from "@/utilities/donations/helpers";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import type { ProjectDetailsSidebarGrant } from "./ProjectDetailsSidebar";

// ─── Status display config ───────────────────────────────────────────────────

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
      return parts.length > 0 ? parts.join(" · ") : "Pending";
    }
    default:
      return effectiveStatus;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface MilestonesSectionProps {
  grant: ProjectDetailsSidebarGrant;
  milestoneInvoices: CommunityPayoutInvoiceInfo[];
  invoiceRequired: boolean;
  milestoneEdits: Record<
    string,
    { invoiceReceivedAt?: string | null; milestoneUID?: string | null }
  >;
  allocationByUID: Map<string, string>;
  todayLocal: string;
  getMilestoneKey: (invoice: CommunityPayoutInvoiceInfo, idx: number) => string;
  getInvoiceReceivedDate: (invoice: CommunityPayoutInvoiceInfo, idx: number) => string | null;
  handleInvoiceReceivedDateChange: (
    milestoneKey: string,
    milestoneUID: string | null,
    dateValue: string
  ) => void;
}

export const MilestonesSection = memo(function MilestonesSection({
  grant,
  milestoneInvoices,
  invoiceRequired,
  milestoneEdits,
  allocationByUID,
  todayLocal,
  getMilestoneKey,
  getInvoiceReceivedDate,
  handleInvoiceReceivedDateChange,
}: MilestonesSectionProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-1">
        Milestones ({milestoneInvoices.length})
      </h3>
      {invoiceRequired && (
        <p className="text-xs text-gray-400 dark:text-zinc-500 mb-3">
          Set the received date to update invoice status. Save changes when done.
        </p>
      )}

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
                  {invoiceRequired && (
                    <th className="text-center py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[130px]">
                      Received
                    </th>
                  )}
                  <th className="text-center py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[110px]">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {milestoneInvoices.map((invoice, idx) => {
                  const mKey = getMilestoneKey(invoice, idx);
                  const receivedDateValue = getInvoiceReceivedDate(invoice, idx);
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
                  const isEdited = milestoneEdits[mKey] !== undefined;
                  const isCleared =
                    isEdited &&
                    milestoneEdits[mKey]?.invoiceReceivedAt === null &&
                    invoice.invoiceReceivedAt !== null;

                  return (
                    <tr
                      key={invoice.milestoneUID || `${invoice.milestoneLabel}-${idx}`}
                      className={cn(
                        "transition-colors",
                        isCleared
                          ? "bg-amber-50/50 dark:bg-amber-900/10"
                          : isEdited
                            ? "bg-blue-50/50 dark:bg-blue-900/10"
                            : "bg-white dark:bg-zinc-950"
                      )}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {isEdited && (
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full shrink-0",
                                isCleared ? "bg-amber-400" : "bg-blue-400"
                              )}
                            />
                          )}
                          <span className="font-medium text-gray-900 dark:text-zinc-100 line-clamp-2">
                            {invoice.milestoneLabel}
                          </span>
                        </div>
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
                                className={cn("h-1.5 w-1.5 rounded-full shrink-0", msCfg.dotColor)}
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
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                              invCfg.className
                            )}
                          >
                            {invCfg.label}
                          </span>
                        </td>
                      )}
                      {invoiceRequired && (
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <Input
                              type="date"
                              max={todayLocal}
                              value={receivedDateValue ?? ""}
                              onChange={(e) =>
                                handleInvoiceReceivedDateChange(
                                  mKey,
                                  invoice.milestoneUID,
                                  e.target.value
                                )
                              }
                              className="h-7 text-xs w-[140px] mx-auto bg-white dark:bg-zinc-900"
                              aria-label={`Invoice received date for ${invoice.milestoneLabel}`}
                            />
                            {invoice.invoiceReceivedBy && (
                              <span
                                className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono"
                                title={invoice.invoiceReceivedBy}
                              >
                                by {formatAddressForDisplay(invoice.invoiceReceivedBy)}
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
  );
});
