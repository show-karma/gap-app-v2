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
  PayoutGrantConfig,
  TokenTotal,
} from "@/src/features/payout-disbursement";
import {
  TokenBreakdown,
  useSaveMilestoneInvoices,
  useToggleAgreement,
} from "@/src/features/payout-disbursement";
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
    Record<string, { invoiceSentDate?: string; invoiceReceived?: boolean }>
  >({});
  const [localAgreementSigned, setLocalAgreementSigned] = useState(false);

  const toggleAgreementMutation = useToggleAgreement(communityUID);
  const saveMilestoneInvoicesMutation = useSaveMilestoneInvoices(communityUID);

  // Reset state when grant changes
  useEffect(() => {
    if (grant) {
      setLocalAgreementSigned(agreement?.signed === true);
      setMilestoneEdits({});
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

  const getInvoiceValue = useCallback(
    (invoice: CommunityPayoutInvoiceInfo) => {
      const edits = milestoneEdits[invoice.milestoneLabel];
      return {
        invoiceSentDate: edits?.invoiceSentDate ?? invoice.invoiceSentAt?.split("T")[0] ?? "",
        invoiceReceived:
          edits?.invoiceReceived ??
          (invoice.invoiceStatus === "received" || invoice.invoiceStatus === "paid"),
      };
    },
    [milestoneEdits]
  );

  const handleInvoiceSentDateChange = useCallback((milestoneLabel: string, value: string) => {
    setMilestoneEdits((prev) => ({
      ...prev,
      [milestoneLabel]: { ...prev[milestoneLabel], invoiceSentDate: value },
    }));
  }, []);

  const handleInvoiceReceivedToggle = useCallback((milestoneLabel: string, checked: boolean) => {
    setMilestoneEdits((prev) => ({
      ...prev,
      [milestoneLabel]: { ...prev[milestoneLabel], invoiceReceived: checked },
    }));
  }, []);

  const handleToggleAgreement = useCallback(() => {
    if (!grant) return;
    const newSigned = !localAgreementSigned;
    setLocalAgreementSigned(newSigned);
    toggleAgreementMutation.mutate(
      { grantUID: grant.grantUid, signed: newSigned },
      {
        onSuccess: () => {
          toast.success(
            newSigned ? "Agreement marked as signed" : "Agreement marked as not signed"
          );
        },
        onError: () => {
          setLocalAgreementSigned(!newSigned);
          toast.error("Failed to toggle agreement");
        },
      }
    );
  }, [grant, localAgreementSigned, toggleAgreementMutation]);

  const handleSaveChanges = useCallback(() => {
    if (!grant) return;
    const invoices = Object.entries(milestoneEdits).map(([milestoneLabel, edits]) => ({
      milestoneLabel,
      invoiceSentAt: edits.invoiceSentDate || null,
      invoiceReceived: edits.invoiceReceived,
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
            <KycStatusBadge status={kycStatus} showValidityInLabel={false} />
            <button
              onClick={handleToggleAgreement}
              disabled={toggleAgreementMutation.isPending}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
                localAgreementSigned
                  ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50"
                  : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700",
                toggleAgreementMutation.isPending && "opacity-50 cursor-wait"
              )}
            >
              {localAgreementSigned ? "Agreement signed" : "Agreement not signed"}
              <span className="text-[10px] opacity-60">(click to toggle)</span>
            </button>
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
              <span className="font-medium">Grant:</span>
              <span className="tabular-nums">
                {grant.currentAmount && parseFloat(grant.currentAmount) > 0
                  ? parseFloat(grant.currentAmount).toLocaleString()
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
                        Invoice Status
                      </th>
                      <th className="text-center py-2.5 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[130px]">
                        Invoice Sent
                      </th>
                      <th className="text-center py-2.5 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[70px]">
                        Received
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {milestoneInvoices.map((invoice, idx) => {
                      const values = getInvoiceValue(invoice);
                      const invoiceCfg =
                        invoiceStatusConfig[invoice.invoiceStatus as InvoiceStatus] ||
                        invoiceStatusConfig.not_submitted;

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
                              value={values.invoiceSentDate}
                              onChange={(e) =>
                                handleInvoiceSentDateChange(invoice.milestoneLabel, e.target.value)
                              }
                              className="h-7 text-xs w-[130px] mx-auto bg-white dark:bg-zinc-900"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={values.invoiceReceived}
                                onCheckedChange={(checked) =>
                                  handleInvoiceReceivedToggle(
                                    invoice.milestoneLabel,
                                    checked === true
                                  )
                                }
                              />
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
                  href={`/project/${grant.projectSlug}`}
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
