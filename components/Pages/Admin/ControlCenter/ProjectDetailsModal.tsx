"use client";

import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  PlusCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatUnits } from "viem";
import { KycStatusBadge } from "@/components/KycStatusIcon";
import { Button } from "@/components/ui/button";
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
  MilestoneAllocation,
  MilestonePaymentStatus,
  PayoutDisbursement,
  PayoutDisbursementStatus,
  TokenTotal,
} from "@/src/features/payout-disbursement";
import {
  TokenBreakdown,
  useSaveMilestoneInvoices,
  useToggleAgreement,
} from "@/src/features/payout-disbursement";
import type { KycStatusResponse } from "@/types/kyc";
import { getChainNameById } from "@/utilities/network";
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
  kycStatus: KycStatusResponse | null;
  disbursementInfo: {
    totalsByToken: TokenTotal[];
    status: string;
    history: PayoutDisbursement[];
  } | null;
  agreement: CommunityPayoutAgreementInfo | null;
  milestoneInvoices: CommunityPayoutInvoiceInfo[];
  milestoneAllocations?: MilestoneAllocation[] | null;
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
    timeZone: "UTC",
  });
}

function formatTokenAmount(amount: string, decimals = 6): string {
  return parseFloat(amount).toLocaleString(undefined, { maximumFractionDigits: decimals });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProjectDetailsModal({
  grant,
  open,
  onOpenChange,
  communityUID,
  kycStatus,
  disbursementInfo,
  agreement,
  milestoneInvoices,
  milestoneAllocations,
  onOpenConfigModal,
  onOpenHistoryDrawer,
  onCreateDisbursement,
}: ProjectDetailsModalProps) {
  const [milestoneEdits, setMilestoneEdits] = useState<
    Record<string, { invoiceReceivedAt?: string | null; milestoneUID?: string | null }>
  >({});
  const [localAgreementSigned, setLocalAgreementSigned] = useState(false);
  const [agreementDate, setAgreementDate] = useState<string>("");
  const [confirmingUnsign, setConfirmingUnsign] = useState(false);

  const toggleAgreementMutation = useToggleAgreement(communityUID);
  const saveMilestoneInvoicesMutation = useSaveMilestoneInvoices(communityUID);

  // Reset state when grant changes
  useEffect(() => {
    if (grant) {
      setLocalAgreementSigned(agreement?.signed === true);
      setAgreementDate(agreement?.signedAt ? agreement.signedAt.split("T")[0] : "");
      setMilestoneEdits({});
      setConfirmingUnsign(false);
    }
  }, [grant?.grantUid, agreement?.signed, agreement?.signedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const editCount = Object.keys(milestoneEdits).length;
  const hasEdits = editCount > 0;

  const todayLocal = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const canCreateDisbursement = useMemo(() => {
    if (!grant) return false;
    const addr = grant.currentPayoutAddress;
    const amount = grant.currentAmount ? parseFloat(grant.currentAmount) : 0;
    return !!addr && addr.trim() !== "" && amount > 0;
  }, [grant]);

  // ─── Computed data from disbursement history ─────────────────────────────

  const totalsByToken = disbursementInfo?.totalsByToken || [];
  const history = disbursementInfo?.history || [];

  const { pendingTx, chainInfo } = useMemo(() => {
    const pending = history.find(
      (d) =>
        d.status === ("AWAITING_SIGNATURES" as PayoutDisbursementStatus) ||
        d.status === ("PENDING" as PayoutDisbursementStatus)
    );
    const chain =
      history.length > 0
        ? {
            chainID: history[0].chainID,
            token: history[0].token,
            tokenDecimals: history[0].tokenDecimals,
          }
        : null;
    return { pendingTx: pending ?? null, chainInfo: chain };
  }, [history]);

  // ─── Remaining balance ────────────────────────────────────────────────────

  const remainingBalance = useMemo(() => {
    if (!grant?.currentAmount) return null;
    const approved = parseFloat(grant.currentAmount);
    if (Number.isNaN(approved) || approved === 0) return null;

    let totalDisbursed = 0;
    for (const t of totalsByToken) {
      const rawAmount = BigInt(t.totalAmount || "0");
      const decimals = t.tokenDecimals ?? 6;
      totalDisbursed += parseFloat(formatUnits(rawAmount, decimals));
    }
    const remaining = approved - totalDisbursed;
    const pct = Math.min(100, Math.round((totalDisbursed / approved) * 100));
    return { approved, totalDisbursed, remaining, pct };
  }, [grant?.currentAmount, totalsByToken]);

  // ─── Milestone completion summary ─────────────────────────────────────────

  const milestoneSummary = useMemo(() => {
    if (milestoneInvoices.length === 0) return null;
    const total = milestoneInvoices.length;
    const received = milestoneInvoices.filter(
      (i) => i.invoiceStatus === "received" || i.invoiceStatus === "paid"
    ).length;
    const paid = milestoneInvoices.filter((i) => i.paymentStatus === "disbursed").length;
    return { total, received, paid };
  }, [milestoneInvoices]);

  // Allocation lookup: milestoneUID → amount (from payout config, frontend-side)
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

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const getMilestoneKey = useCallback(
    (invoice: CommunityPayoutInvoiceInfo, idx: number) =>
      invoice.milestoneUID || `${invoice.milestoneLabel}::${idx}`,
    []
  );

  const getInvoiceReceivedDate = useCallback(
    (invoice: CommunityPayoutInvoiceInfo, idx: number) => {
      const edits = milestoneEdits[getMilestoneKey(invoice, idx)];
      if (edits?.invoiceReceivedAt !== undefined) return edits.invoiceReceivedAt;
      return invoice.invoiceReceivedAt?.split("T")[0] ?? null;
    },
    [milestoneEdits, getMilestoneKey]
  );

  const handleInvoiceReceivedDateChange = useCallback(
    (milestoneKey: string, milestoneUID: string | null, dateValue: string) => {
      setMilestoneEdits((prev) => ({
        ...prev,
        [milestoneKey]: {
          invoiceReceivedAt: dateValue || null,
          milestoneUID,
        },
      }));
    },
    []
  );

  // Auto-clear unsign confirmation after 8 seconds
  useEffect(() => {
    if (!confirmingUnsign) return;
    const timer = setTimeout(() => setConfirmingUnsign(false), 8000);
    return () => clearTimeout(timer);
  }, [confirmingUnsign]);

  const handleSignAgreement = useCallback(
    (dateOverride?: string) => {
      if (!grant) return;
      const date = dateOverride ?? (agreementDate || todayLocal);
      if (!agreementDate) setAgreementDate(date);
      setLocalAgreementSigned(true);
      toggleAgreementMutation.mutate(
        {
          grantUID: grant.grantUid,
          signed: true,
          signedAt: new Date(`${date}T00:00:00Z`).toISOString(),
        },
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
    },
    [grant?.grantUid, agreementDate, todayLocal]
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnsignAgreement = useCallback(() => {
    if (!grant) return;
    const previousDate = agreementDate;
    setLocalAgreementSigned(false);
    setConfirmingUnsign(false);
    toggleAgreementMutation.mutate(
      { grantUID: grant.grantUid, signed: false },
      {
        onSuccess: () => {
          setAgreementDate("");
          toast.success("Agreement marked as not signed");
        },
        onError: () => {
          setLocalAgreementSigned(true);
          setAgreementDate(previousDate);
          toast.error("Failed to unsign agreement");
        },
      }
    );
  }, [grant?.grantUid, agreementDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveChanges = useCallback(() => {
    if (!grant) return;
    const invoices = Object.entries(milestoneEdits).map(([key, edits]) => {
      // Key is milestoneUID or `label::idx`. Look up the label from invoice data.
      const matchedInvoice = milestoneInvoices.find(
        (inv, idx) => getMilestoneKey(inv, idx) === key
      );
      return {
        milestoneLabel: matchedInvoice?.milestoneLabel ?? key,
        milestoneUID: edits.milestoneUID ?? null,
        invoiceReceivedAt: edits.invoiceReceivedAt ?? null,
      };
    });

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
  }, [grant?.grantUid, milestoneEdits, milestoneInvoices, getMilestoneKey, editCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopyAddress = useCallback(() => {
    if (!grant?.currentPayoutAddress) return;
    navigator.clipboard.writeText(grant.currentPayoutAddress);
    toast.success("Address copied");
  }, [grant?.currentPayoutAddress]);

  const confirmDiscardEdits = useCallback(() => {
    if (hasEdits) {
      return window.confirm("You have unsaved changes. Discard?");
    }
    return true;
  }, [hasEdits]);

  const handleRequestClose = useCallback(() => {
    if (!confirmDiscardEdits()) return;
    onOpenChange(false);
  }, [confirmDiscardEdits, onOpenChange]);

  const handleGuardedAction = useCallback(
    (action?: () => void) => {
      if (!action) return;
      if (!confirmDiscardEdits()) return;
      action();
    },
    [confirmDiscardEdits]
  );

  if (!grant) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleRequestClose();
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
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
            {/* KYC + Agreement row */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                  KYC/KYB:
                </span>
                <KycStatusBadge status={kycStatus} showValidityInLabel={false} />
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white dark:bg-zinc-800/50">
                <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                  Agreement:
                </span>
                {confirmingUnsign ? (
                  <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                    <span className="text-xs text-amber-700 dark:text-amber-300">
                      Mark as unsigned?
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-5 px-2 text-[11px]"
                      onClick={handleUnsignAgreement}
                      aria-label="Confirm unsign agreement"
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 px-2 text-[11px]"
                      onClick={() => setConfirmingUnsign(false)}
                      aria-label="Cancel unsign agreement"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : localAgreementSigned ? (
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Signed{" "}
                      {formatShortDate(agreementDate ? `${agreementDate}T00:00:00Z` : null) || ""}
                    </span>
                    {agreement?.signedBy && (
                      <span
                        className="text-[10px] text-gray-400 dark:text-zinc-500"
                        title={agreement.signedBy}
                      >
                        by {agreement.signedBy.slice(0, 6)}...{agreement.signedBy.slice(-4)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmingUnsign(true)}
                      disabled={toggleAgreementMutation.isPending}
                      className="ml-0.5 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors disabled:opacity-50"
                      aria-label="Remove agreement signed date"
                      title="Mark as unsigned"
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400 dark:text-zinc-500">Not signed</span>
                    <span className="text-[10px] text-gray-300 dark:text-zinc-600">—</span>
                    <Input
                      type="date"
                      max={todayLocal}
                      value={agreementDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setAgreementDate(newDate);
                        if (newDate) {
                          handleSignAgreement(newDate);
                        }
                      }}
                      disabled={toggleAgreementMutation.isPending}
                      className="h-6 text-xs w-[130px] bg-white dark:bg-zinc-900"
                      aria-label="Set agreement signed date"
                      title="Set a date to mark the agreement as signed"
                    />
                    {toggleAgreementMutation.isPending && (
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500 animate-pulse">
                        Saving...
                      </span>
                    )}
                  </div>
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
                    {`${grant.currentPayoutAddress.slice(0, 6)}...${grant.currentPayoutAddress.slice(-4)}`}
                    <ClipboardDocumentIcon className="h-3 w-3 opacity-50" />
                  </button>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 italic font-sans">
                    Not configured
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Approved:</span>
                <span className="tabular-nums text-sm text-gray-700 dark:text-zinc-300">
                  {grant.currentAmount && parseFloat(grant.currentAmount) > 0
                    ? `${formatTokenAmount(grant.currentAmount)}${grant.currency ? ` ${grant.currency}` : ""}`
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
                    <> · {formatTokenAmount(String(remainingBalance.remaining))} remaining</>
                  )}
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto -mx-6 px-6">
          <div className="py-4 space-y-4">
            {/* Pending transaction banner */}
            {pendingTx && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  {pendingTx.status === ("AWAITING_SIGNATURES" as PayoutDisbursementStatus)
                    ? "Awaiting Safe signatures"
                    : "Pending disbursement"}
                  {" — "}
                  {formatTokenAmount(
                    formatUnits(
                      BigInt(pendingTx.disbursedAmount || "0"),
                      pendingTx.tokenDecimals ?? 6
                    )
                  )}{" "}
                  {pendingTx.token}
                  {pendingTx.createdAt && (
                    <span className="text-amber-500 dark:text-amber-400/70">
                      {" "}
                      since {formatShortDate(pendingTx.createdAt)}
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Milestone completion summary */}
            {milestoneSummary && (
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400">
                <span>
                  <span className="font-medium text-gray-700 dark:text-zinc-300">
                    {milestoneSummary.received}/{milestoneSummary.total}
                  </span>{" "}
                  {milestoneSummary.total === 1 ? "invoice" : "invoices"} received
                </span>
                <span>
                  <span className="font-medium text-gray-700 dark:text-zinc-300">
                    {milestoneSummary.paid}/{milestoneSummary.total}
                  </span>{" "}
                  {milestoneSummary.total === 1 ? "milestone" : "milestones"} paid
                </span>
              </div>
            )}

            {/* Milestone invoices table */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-1">
                Milestone Invoices ({milestoneInvoices.length})
              </h3>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mb-3">
                Set the received date to update invoice status. Save changes when done.
              </p>

              {milestoneInvoices.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-zinc-400 py-4 text-center">
                  No milestone invoices configured yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
                        <th className="text-left py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[160px]">
                          Milestone
                        </th>
                        <th className="text-right py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[80px]">
                          Allocation
                        </th>
                        <th className="text-center py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[100px]">
                          Status
                        </th>
                        <th className="text-center py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[130px]">
                          Invoice Received
                        </th>
                        <th className="text-center py-3 px-3 font-medium text-gray-600 dark:text-zinc-400 min-w-[110px]">
                          Payment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                      {milestoneInvoices.map((invoice, idx) => {
                        const mKey = getMilestoneKey(invoice, idx);
                        const receivedDateValue = getInvoiceReceivedDate(invoice, idx);
                        const invoiceCfg =
                          invoiceStatusConfig[invoice.invoiceStatus as InvoiceStatus] ||
                          invoiceStatusConfig.not_submitted;
                        const paymentCfg = paymentStatusConfig[invoice.paymentStatus ?? "unpaid"];
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
                                      {formatTokenAmount(amount)}
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
                            <td className="py-3 px-3 text-center">
                              <span
                                className={cn(
                                  "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                                  invoiceCfg.className
                                )}
                              >
                                {invoiceCfg.label}
                              </span>
                            </td>
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
                                    by {invoice.invoiceReceivedBy.slice(0, 6)}...
                                    {invoice.invoiceReceivedBy.slice(-4)}
                                  </span>
                                )}
                              </div>
                            </td>
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
        </div>

        <DialogFooter className="pt-4 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            {/* Left: Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGuardedAction(onOpenConfigModal)}
                disabled={saveMilestoneInvoicesMutation.isPending}
              >
                <Cog6ToothIcon className="h-4 w-4 mr-1.5" />
                Payout Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGuardedAction(onOpenHistoryDrawer)}
                disabled={saveMilestoneInvoicesMutation.isPending}
              >
                <ClockIcon className="h-4 w-4 mr-1.5" />
                View History
              </Button>
              <Button
                size="sm"
                onClick={() => handleGuardedAction(onCreateDisbursement)}
                disabled={!canCreateDisbursement || saveMilestoneInvoicesMutation.isPending}
                title={
                  !canCreateDisbursement
                    ? "Configure a payout address and amount first"
                    : "Create a disbursement"
                }
              >
                <PlusCircleIcon className="h-4 w-4 mr-1.5" />
                Create Disbursement
              </Button>
            </div>

            {/* Right: Save / Close */}
            <div className="flex items-center gap-2">
              {hasEdits && (
                <Button
                  size="sm"
                  onClick={handleSaveChanges}
                  disabled={saveMilestoneInvoicesMutation.isPending}
                >
                  <CheckIcon className="h-4 w-4 mr-1.5" />
                  {saveMilestoneInvoicesMutation.isPending
                    ? "Saving..."
                    : `Save Changes (${editCount})`}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRequestClose}
                className="text-gray-500"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
