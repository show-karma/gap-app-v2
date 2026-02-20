"use client";

import {
  BanknotesIcon,
  ClockIcon,
  Cog6ToothIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { KycStatusBadge } from "@/components/KycStatusIcon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
  CommunityPayoutAgreementInfo,
  CommunityPayoutInvoiceInfo,
  InvoiceStatus,
  MilestonePaymentStatus,
  PayoutGrantConfig,
  TokenTotal,
} from "@/src/features/payout-disbursement";
import {
  TokenBreakdown,
  useSaveMilestoneInvoices,
  useToggleAgreement,
} from "@/src/features/payout-disbursement";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ProjectDetailsModalGrant {
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

interface ProjectDetailsModalProps {
  grant: ProjectDetailsModalGrant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityUID: string;
  kycStatus: any;
  payoutConfig: PayoutGrantConfig | null;
  disbursementInfo: { totalsByToken: TokenTotal[]; status: string; history: any[] } | null;
  agreement: CommunityPayoutAgreementInfo | null;
  milestoneInvoices: CommunityPayoutInvoiceInfo[];
  onOpenConfigModal?: () => void;
  onOpenHistoryDrawer?: () => void;
  onCreateDisbursement?: () => void;
}

// ─── Status display configs ──────────────────────────────────────────────────

const invoiceStatusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  not_submitted: {
    label: "Not submitted",
    className: "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
  submitted: {
    label: "Submitted",
    className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  received: {
    label: "Received",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  paid: {
    label: "Paid",
    className: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
};

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

function formatShortDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProjectDetailsModal({
  grant,
  open,
  onOpenChange,
  communityUID,
  kycStatus,
  payoutConfig,
  disbursementInfo,
  agreement,
  milestoneInvoices,
  onOpenConfigModal,
  onOpenHistoryDrawer,
  onCreateDisbursement,
}: ProjectDetailsModalProps) {
  const [milestoneEdits, setMilestoneEdits] = useState<
    Record<string, { invoiceReceivedAt?: string | null; milestoneUID?: string | null }>
  >({});
  const [localAgreementSigned, setLocalAgreementSigned] = useState(false);
  const [confirmingUnsign, setConfirmingUnsign] = useState(false);

  const toggleAgreementMutation = useToggleAgreement(communityUID);
  const saveMilestoneInvoicesMutation = useSaveMilestoneInvoices(communityUID);

  // Reset state when grant changes
  useEffect(() => {
    if (grant) {
      setLocalAgreementSigned(agreement?.signed === true);
      setMilestoneEdits({});
      setConfirmingUnsign(false);
    }
  }, [grant?.grantUid, agreement?.signed]); // eslint-disable-line react-hooks/exhaustive-deps

  const editCount = Object.keys(milestoneEdits).length;
  const hasEdits = editCount > 0;

  const canCreateDisbursement = useMemo(() => {
    if (!grant) return false;
    const addr = grant.currentPayoutAddress;
    const amount = grant.currentAmount ? parseFloat(grant.currentAmount) : 0;
    return !!addr && addr.trim() !== "" && amount > 0;
  }, [grant]);

  const getInvoiceReceivedDate = useCallback(
    (invoice: CommunityPayoutInvoiceInfo) => {
      const edits = milestoneEdits[invoice.milestoneLabel];
      if (edits?.invoiceReceivedAt !== undefined) return edits.invoiceReceivedAt;
      return invoice.invoiceReceivedAt?.split("T")[0] ?? null;
    },
    [milestoneEdits]
  );

  const handleInvoiceReceivedDateChange = useCallback(
    (milestoneLabel: string, milestoneUID: string | null, dateValue: string) => {
      setMilestoneEdits((prev) => ({
        ...prev,
        [milestoneLabel]: {
          invoiceReceivedAt: dateValue || null,
          milestoneUID,
        },
      }));
    },
    []
  );

  // Auto-clear unsign confirmation after 5 seconds
  useEffect(() => {
    if (!confirmingUnsign) return;
    const timer = setTimeout(() => setConfirmingUnsign(false), 5000);
    return () => clearTimeout(timer);
  }, [confirmingUnsign]);

  const handleSignAgreement = useCallback(() => {
    if (!grant) return;
    setLocalAgreementSigned(true);
    toggleAgreementMutation.mutate(
      { grantUID: grant.grantUid, signed: true },
      {
        onSuccess: () => {
          toast.success("Agreement marked as signed");
        },
        onError: () => {
          setLocalAgreementSigned(false);
          toast.error("Failed to sign agreement");
        },
      }
    );
  }, [grant, toggleAgreementMutation]);

  const handleUnsignAgreement = useCallback(() => {
    if (!grant) return;
    setLocalAgreementSigned(false);
    setConfirmingUnsign(false);
    toggleAgreementMutation.mutate(
      { grantUID: grant.grantUid, signed: false },
      {
        onSuccess: () => {
          toast.success("Agreement marked as not signed");
        },
        onError: () => {
          setLocalAgreementSigned(true);
          toast.error("Failed to unsign agreement");
        },
      }
    );
  }, [grant, toggleAgreementMutation]);

  const handleSaveChanges = useCallback(() => {
    if (!grant) return;
    const invoices = Object.entries(milestoneEdits).map(([milestoneLabel, edits]) => ({
      milestoneLabel,
      milestoneUID: edits.milestoneUID ?? null,
      invoiceReceivedAt: edits.invoiceReceivedAt ?? null,
    }));

    saveMilestoneInvoicesMutation.mutate(
      { grantUID: grant.grantUid, invoices },
      {
        onSuccess: () => {
          setMilestoneEdits({});
          toast.success(`Saved ${editCount} milestone ${editCount === 1 ? "change" : "changes"}`);
        },
        onError: () => {
          toast.error("Failed to save invoice changes");
        },
      }
    );
  }, [grant, milestoneEdits, editCount, saveMilestoneInvoicesMutation]);

  if (!grant) return null;

  const totalsByToken = disbursementInfo?.totalsByToken || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col bg-white dark:bg-zinc-950">
        <DialogHeader className="space-y-3 pb-4 border-b border-gray-100 dark:border-zinc-800">
          <div>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
              {grant.projectName}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              {grant.grantName}
            </DialogDescription>
          </div>

          {/* Badges row: KYB + Agreement toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">KYC/KYB:</span>
              <KycStatusBadge status={kycStatus} showValidityInLabel={false} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="agreement-signed"
                checked={localAgreementSigned}
                onCheckedChange={(checked) => {
                  if (checked === true) {
                    handleSignAgreement();
                  } else {
                    setConfirmingUnsign(true);
                  }
                }}
                disabled={toggleAgreementMutation.isPending || confirmingUnsign}
              />
              <label
                htmlFor="agreement-signed"
                className={cn(
                  "text-xs font-medium select-none",
                  toggleAgreementMutation.isPending
                    ? "text-gray-400 dark:text-zinc-500"
                    : "text-gray-700 dark:text-zinc-300"
                )}
              >
                {toggleAgreementMutation.isPending ? "Saving..." : "Agreement signed"}
              </label>
              {confirmingUnsign && (
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-xs text-amber-600 dark:text-amber-400">Unsign?</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-6 px-2 text-xs"
                    onClick={handleUnsignAgreement}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => setConfirmingUnsign(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Payout summary */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Address:</span>
              <span className="font-mono">
                {grant.currentPayoutAddress
                  ? `${grant.currentPayoutAddress.slice(0, 6)}...${grant.currentPayoutAddress.slice(-4)}`
                  : "Not configured"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Approved:</span>
              <span className="tabular-nums">
                {grant.currentAmount && parseFloat(grant.currentAmount) > 0
                  ? `${parseFloat(grant.currentAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })}${grant.currency ? ` ${grant.currency}` : ""}`
                  : "\u2014"}
              </span>
            </div>
            {totalsByToken.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Disbursed:</span>
                <TokenBreakdown totalsByToken={totalsByToken} size="sm" />
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto -mx-6 px-6">
          <div className="py-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">
              Milestone Invoices ({milestoneInvoices.length})
            </h3>

            {milestoneInvoices.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-zinc-400 py-4 text-center">
                No milestone invoices configured yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
                      <th className="text-left py-2.5 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[180px]">
                        Milestone
                      </th>
                      <th className="text-center py-2.5 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[110px]">
                        Status
                      </th>
                      <th className="text-center py-2.5 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[130px]">
                        Invoice Received
                      </th>
                      <th className="text-center py-2.5 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[120px]">
                        Payment
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {milestoneInvoices.map((invoice, idx) => {
                      const receivedDateValue = getInvoiceReceivedDate(invoice);
                      const invoiceCfg =
                        invoiceStatusConfig[invoice.invoiceStatus as InvoiceStatus] ||
                        invoiceStatusConfig.not_submitted;
                      const paymentCfg = paymentStatusConfig[invoice.paymentStatus ?? "unpaid"];

                      return (
                        <tr
                          key={invoice.milestoneLabel}
                          className={cn(
                            "transition-colors",
                            idx % 2 === 0
                              ? "bg-white dark:bg-zinc-950"
                              : "bg-gray-50/50 dark:bg-zinc-900/50"
                          )}
                        >
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-gray-900 dark:text-zinc-100 line-clamp-2">
                              {invoice.milestoneLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={cn(
                                "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                                invoiceCfg.className
                              )}
                            >
                              {invoiceCfg.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Input
                              type="date"
                              max={new Date().toISOString().split("T")[0]}
                              value={receivedDateValue ?? ""}
                              onChange={(e) =>
                                handleInvoiceReceivedDateChange(
                                  invoice.milestoneLabel,
                                  invoice.milestoneUID,
                                  e.target.value
                                )
                              }
                              className="h-7 text-xs w-[140px] mx-auto bg-white dark:bg-zinc-900"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
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
                                  {formatShortDate(invoice.paymentStatusDate)}
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
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            {/* Left: Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={onOpenConfigModal}>
                <Cog6ToothIcon className="h-4 w-4 mr-1.5" />
                Configure Payout
              </Button>
              <Button variant="outline" size="sm" onClick={onOpenHistoryDrawer}>
                <ClockIcon className="h-4 w-4 mr-1.5" />
                View History
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateDisbursement}
                disabled={!canCreateDisbursement}
                title={
                  !canCreateDisbursement
                    ? "Missing payout address or amount"
                    : "Create a disbursement"
                }
              >
                <PlusCircleIcon className="h-4 w-4 mr-1.5" />
                Create Disbursement
              </Button>
            </div>

            {/* Right: Save / View / Close */}
            <div className="flex items-center gap-2">
              {hasEdits && (
                <Button
                  size="sm"
                  onClick={handleSaveChanges}
                  disabled={saveMilestoneInvoicesMutation.isPending}
                >
                  <BanknotesIcon className="h-4 w-4 mr-1.5" />
                  {saveMilestoneInvoicesMutation.isPending
                    ? "Saving..."
                    : `Save Changes (${editCount})`}
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={PAGES.PROJECT.GRANT(grant.projectSlug, grant.grantUid)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400"
                >
                  View grant
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
