"use client";

import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlusCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { KycStatusBadge } from "@/components/KycStatusIcon";
import { DatePicker } from "@/components/Utilities/DatePicker";
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
  PayoutConfigurationContent,
  type PayoutConfigurationContentRef,
  type PayoutDisbursement,
  PayoutDisbursementStatus,
  PayoutHistoryContent,
  TokenBreakdown,
  type TokenTotal,
  useSaveMilestoneInvoices,
  useToggleAgreement,
} from "@/src/features/payout-disbursement";
import type { KycStatusResponse } from "@/types/kyc";
import { formatAddressForDisplay } from "@/utilities/donations/helpers";
import { formatDate } from "@/utilities/formatDate";
import { getChainNameById } from "@/utilities/network";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ProjectDetailsSidebarGrant {
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

interface ProjectDetailsSidebarProps {
  grant: ProjectDetailsSidebarGrant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityUID: string;
  invoiceRequired?: boolean;
  kycStatus: KycStatusResponse | null;
  disbursementInfo: {
    totalsByToken: TokenTotal[];
    status: string;
    history: PayoutDisbursement[];
  } | null;
  agreement: CommunityPayoutAgreementInfo | null;
  milestoneInvoices: CommunityPayoutInvoiceInfo[];
  milestoneAllocations?: MilestoneAllocation[] | null;
  onCreateDisbursement?: () => void;
  onConfigSuccess?: () => void;
}

// ─── Section types ──────────────────────────────────────────────────────────

type SidebarSection = "details" | "settings" | "history";

const NAV_ITEMS: { id: SidebarSection; label: string; icon: typeof InformationCircleIcon }[] = [
  { id: "details", label: "Details", icon: InformationCircleIcon },
  { id: "settings", label: "Payout Settings", icon: Cog6ToothIcon },
  { id: "history", label: "History", icon: ClockIcon },
];

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

export function ProjectDetailsSidebar({
  grant,
  open,
  onOpenChange,
  communityUID,
  invoiceRequired = false,
  kycStatus,
  disbursementInfo,
  agreement,
  milestoneInvoices,
  milestoneAllocations,
  onCreateDisbursement,
  onConfigSuccess,
}: ProjectDetailsSidebarProps) {
  const [activeSection, setActiveSection] = useState<SidebarSection>("details");
  const [milestoneEdits, setMilestoneEdits] = useState<
    Record<string, { invoiceReceivedAt?: string | null; milestoneUID?: string | null }>
  >({});
  const [localAgreementSigned, setLocalAgreementSigned] = useState(false);
  const [agreementDate, setAgreementDate] = useState<Date | undefined>(undefined);
  const [confirmingUnsign, setConfirmingUnsign] = useState(false);

  const configRef = useRef<PayoutConfigurationContentRef>(null);
  const [, copyToClipboard] = useCopyToClipboard();
  const toggleAgreementMutation = useToggleAgreement(communityUID);
  const saveMilestoneInvoicesMutation = useSaveMilestoneInvoices(communityUID);

  // Reset state when grant changes
  useEffect(() => {
    if (grant) {
      setLocalAgreementSigned(agreement?.signed === true);
      setAgreementDate(agreement?.signedAt ? new Date(agreement.signedAt) : undefined);
      setMilestoneEdits({});
      setConfirmingUnsign(false);
      setActiveSection("details");
    }
  }, [grant?.grantUid, agreement?.signed, agreement?.signedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const editCount = Object.keys(milestoneEdits).length;
  const hasMilestoneEdits = editCount > 0;

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

  // ─── Remaining balance ────────────────────────────────────────────────────

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

  useEffect(() => {
    if (!confirmingUnsign) return;
    const timer = setTimeout(() => setConfirmingUnsign(false), 8000);
    return () => clearTimeout(timer);
  }, [confirmingUnsign]);

  const handleSignAgreement = useCallback(
    (dateOverride?: Date) => {
      if (!grant) return;
      const date = dateOverride ?? agreementDate ?? new Date();
      if (!agreementDate) setAgreementDate(date);
      setLocalAgreementSigned(true);
      toggleAgreementMutation.mutate(
        {
          grantUID: grant.grantUid,
          signed: true,
          signedAt: new Date(
            Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
          ).toISOString(),
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
    [grant?.grantUid, agreementDate] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleUnsignAgreement = useCallback(() => {
    if (!grant) return;
    const previousDate = agreementDate;
    setLocalAgreementSigned(false);
    setConfirmingUnsign(false);
    toggleAgreementMutation.mutate(
      { grantUID: grant.grantUid, signed: false },
      {
        onSuccess: () => {
          setAgreementDate(undefined);
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

  const handleSaveMilestoneChanges = useCallback(() => {
    if (!grant) return;
    const invoices = Object.entries(milestoneEdits).map(([key, edits]) => {
      const matchedInvoice = milestoneInvoices.find(
        (inv, idx) => getMilestoneKey(inv, idx) === key
      );
      const rawDate = edits.invoiceReceivedAt;
      const isoDate =
        rawDate && !rawDate.includes("T") ? `${rawDate}T00:00:00.000Z` : (rawDate ?? null);
      return {
        milestoneLabel: matchedInvoice?.milestoneLabel ?? key,
        milestoneUID: edits.milestoneUID ?? null,
        invoiceReceivedAt: isoDate,
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
    copyToClipboard(grant.currentPayoutAddress, "Address copied");
  }, [grant?.currentPayoutAddress, copyToClipboard]);

  const hasUnsavedChanges = useCallback(() => {
    if (hasMilestoneEdits) return true;
    if (configRef.current?.isDirty) return true;
    return false;
  }, [hasMilestoneEdits]);

  const confirmDiscardEdits = useCallback(() => {
    if (hasUnsavedChanges()) {
      return window.confirm("You have unsaved changes. Discard?");
    }
    return true;
  }, [hasUnsavedChanges]);

  const handleRequestClose = useCallback(() => {
    if (!confirmDiscardEdits()) return;
    onOpenChange(false);
  }, [confirmDiscardEdits, onOpenChange]);

  const handleSectionChange = useCallback(
    (section: SidebarSection) => {
      if (section === activeSection) return;
      if (!confirmDiscardEdits()) return;
      setActiveSection(section);
    },
    [activeSection, confirmDiscardEdits]
  );

  const handleSaveChanges = useCallback(async () => {
    if (activeSection === "details" && hasMilestoneEdits) {
      handleSaveMilestoneChanges();
    } else if (activeSection === "settings") {
      await configRef.current?.save();
    }
  }, [activeSection, hasMilestoneEdits, handleSaveMilestoneChanges]);

  const showSaveButton =
    (activeSection === "details" && hasMilestoneEdits) ||
    (activeSection === "settings" && configRef.current?.isDirty);

  const isSaving =
    saveMilestoneInvoicesMutation.isPending || (configRef.current?.isSaving ?? false);

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
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-zinc-950">
        {/* Header */}
        <DialogHeader className="space-y-1 pb-3 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                {grant.projectName}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 dark:text-zinc-400">
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
        </DialogHeader>

        {/* Two-column body */}
        <div className="flex-1 flex min-h-0">
          {/* Sidebar navigation */}
          <nav className="w-48 shrink-0 border-r border-gray-100 dark:border-zinc-800 py-3 pr-3">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleSectionChange(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isActive
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-zinc-200"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Content area */}
          <div className="flex-1 overflow-auto pl-6 py-3">
            {activeSection === "details" && (
              <div className="space-y-6">
                <DetailsSection
                  grant={grant}
                  kycStatus={kycStatus}
                  agreement={agreement}
                  localAgreementSigned={localAgreementSigned}
                  agreementDate={agreementDate}
                  confirmingUnsign={confirmingUnsign}
                  setConfirmingUnsign={setConfirmingUnsign}
                  toggleAgreementMutation={toggleAgreementMutation}
                  handleSignAgreement={handleSignAgreement}
                  handleUnsignAgreement={handleUnsignAgreement}
                  setAgreementDate={setAgreementDate}
                  handleCopyAddress={handleCopyAddress}
                  totalsByToken={totalsByToken}
                  remainingBalance={remainingBalance}
                  awaitingTx={awaitingTx}
                  chainInfo={chainInfo}
                  milestoneSummary={milestoneSummary}
                  invoiceRequired={invoiceRequired}
                />
                <MilestonesSection
                  grant={grant}
                  milestoneInvoices={milestoneInvoices}
                  invoiceRequired={invoiceRequired}
                  milestoneEdits={milestoneEdits}
                  allocationByUID={allocationByUID}
                  todayLocal={todayLocal}
                  getMilestoneKey={getMilestoneKey}
                  getInvoiceReceivedDate={getInvoiceReceivedDate}
                  handleInvoiceReceivedDateChange={handleInvoiceReceivedDateChange}
                />
              </div>
            )}

            {activeSection === "settings" && (
              <PayoutConfigurationContent
                ref={configRef}
                isActive={activeSection === "settings"}
                grantUID={grant.grantUid}
                projectUID={grant.projectUid}
                communityUID={communityUID}
                grantName={grant.grantName}
                projectName={grant.projectName}
                onSuccess={onConfigSuccess}
              />
            )}

            {activeSection === "history" && (
              <PayoutHistoryContent
                isActive={activeSection === "history"}
                grantUID={grant.grantUid}
                grantName={grant.grantName}
                projectName={grant.projectName}
                approvedAmount={grant.currentAmount}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="pt-3 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (!confirmDiscardEdits()) return;
                  onCreateDisbursement?.();
                }}
                disabled={!canCreateDisbursement || isSaving}
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

            <div className="flex items-center gap-2">
              {showSaveButton && (
                <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
                  <CheckIcon className="h-4 w-4 mr-1.5" />
                  {isSaving
                    ? "Saving..."
                    : activeSection === "details" && hasMilestoneEdits
                      ? `Save Changes (${editCount})`
                      : "Save Configuration"}
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

// ─── Details Section ──────────────────────────────────────────────────────────

interface DetailsSectionProps {
  grant: ProjectDetailsSidebarGrant;
  kycStatus: KycStatusResponse | null;
  agreement: CommunityPayoutAgreementInfo | null;
  localAgreementSigned: boolean;
  agreementDate: Date | undefined;
  confirmingUnsign: boolean;
  setConfirmingUnsign: (v: boolean) => void;
  toggleAgreementMutation: ReturnType<typeof useToggleAgreement>;
  handleSignAgreement: (date?: Date) => void;
  handleUnsignAgreement: () => void;
  setAgreementDate: (date: Date | undefined) => void;
  handleCopyAddress: () => void;
  totalsByToken: TokenTotal[];
  remainingBalance: {
    approved: number;
    totalDisbursed: number;
    remaining: number;
    pct: number;
  } | null;
  awaitingTx: PayoutDisbursement | null;
  chainInfo: { chainID: number; token: string; tokenDecimals: number } | null;
  milestoneSummary: { total: number; received: number; paid: number } | null;
  invoiceRequired: boolean;
}

function DetailsSection({
  grant,
  kycStatus,
  agreement,
  localAgreementSigned,
  agreementDate,
  confirmingUnsign,
  setConfirmingUnsign,
  toggleAgreementMutation,
  handleSignAgreement,
  handleUnsignAgreement,
  setAgreementDate,
  handleCopyAddress,
  totalsByToken,
  remainingBalance,
  awaitingTx,
  chainInfo,
  milestoneSummary,
  invoiceRequired,
}: DetailsSectionProps) {
  return (
    <div className="space-y-4">
      {/* Status panel */}
      <div className="rounded-lg bg-gray-50 dark:bg-zinc-900 p-3 space-y-2.5">
        {/* KYC + Agreement row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">KYC/KYB:</span>
            <KycStatusBadge status={kycStatus} showValidityInLabel={false} />
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white dark:bg-zinc-800/50">
            <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">Agreement:</span>
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
                  Signed {agreementDate ? formatDate(agreementDate, "UTC") : ""}
                </span>
                {agreement?.signedBy && (
                  <span
                    className="text-[10px] text-gray-400 dark:text-zinc-500"
                    title={agreement.signedBy}
                  >
                    by {formatAddressForDisplay(agreement.signedBy)}
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
                <span className="text-[10px] text-gray-300 dark:text-zinc-600">&mdash;</span>
                <DatePicker
                  selected={agreementDate}
                  onSelect={(date) => {
                    setAgreementDate(date);
                    handleSignAgreement(date);
                  }}
                  maxDate={new Date()}
                  placeholder="Pick a date"
                  buttonClassName="h-6 text-xs px-2 py-0.5 bg-white dark:bg-zinc-900"
                  ariaLabel="Set agreement signed date"
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
                {formatAddressForDisplay(grant.currentPayoutAddress)}
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

      {/* Awaiting signatures banner */}
      {awaitingTx && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
          <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-300">
            Awaiting Safe signatures{" — "}
            {formatDisplayAmount(
              String(
                fromSmallestUnit(awaitingTx.disbursedAmount || "0", awaitingTx.tokenDecimals ?? 6)
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
    </div>
  );
}

// ─── Milestones Section ───────────────────────────────────────────────────────

interface MilestonesSectionProps {
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

function MilestonesSection({
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
}
