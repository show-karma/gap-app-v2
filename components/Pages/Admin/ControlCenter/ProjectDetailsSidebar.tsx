"use client";

import {
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  CheckIcon,
  ClockIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
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
  fromSmallestUnit,
  type MilestoneAllocation,
  MilestoneLifecycleStatus,
  PayoutConfigurationContent,
  type PayoutConfigurationContentRef,
  type PayoutDisbursement,
  PayoutDisbursementStatus,
  PayoutHistoryContent,
  RecordPaymentDialog,
  type TokenTotal,
  useDeleteDisbursementByMilestone,
  useSaveMilestoneInvoices,
  useToggleAgreement,
} from "@/src/features/payout-disbursement";
import type { KycStatusResponse } from "@/types/kyc";
import { getChainNameById } from "@/utilities/network";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { DetailsSection } from "./DetailsSection";
import { MilestonesSection } from "./MilestonesSection";

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
  dataVersion?: number;
}

// ─── Section types ──────────────────────────────────────────────────────────

type SidebarSection = "details" | "settings" | "history";

const NAV_ITEMS: { id: SidebarSection; label: string; icon: typeof InformationCircleIcon }[] = [
  { id: "details", label: "Details", icon: InformationCircleIcon },
  { id: "settings", label: "Payout Settings", icon: Cog6ToothIcon },
  { id: "history", label: "History", icon: ClockIcon },
];

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
  dataVersion = 0,
}: ProjectDetailsSidebarProps) {
  const [activeSection, setActiveSection] = useState<SidebarSection>("details");
  const [milestoneEdits, setMilestoneEdits] = useState<
    Record<string, { invoiceReceivedAt?: string | null; milestoneUID?: string | null }>
  >({});
  const [pendingFiles, setPendingFiles] = useState<
    Record<
      string,
      {
        milestoneLabel: string;
        milestoneUID: string | null;
        invoiceFileUrl: string;
        invoiceFileKey: string;
      }
    >
  >({});
  const [removedFiles, setRemovedFiles] = useState<Set<string>>(new Set());
  const [localAgreementSigned, setLocalAgreementSigned] = useState(false);
  const [agreementDate, setAgreementDate] = useState<Date | undefined>(undefined);
  const [confirmingUnsign, setConfirmingUnsign] = useState(false);

  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [initialPaymentMilestone, setInitialPaymentMilestone] = useState<{
    milestoneLabel: string;
    status: "awaiting_signatures" | "disbursed";
    amount: string | null;
  } | null>(null);
  const configRef = useRef<PayoutConfigurationContentRef>(null);
  const [configIsDirty, setConfigIsDirty] = useState(false);
  const [configIsSaving, setConfigIsSaving] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const toggleAgreementMutation = useToggleAgreement(communityUID);
  const saveMilestoneInvoicesMutation = useSaveMilestoneInvoices(communityUID);
  const deleteDisbursementMutation = useDeleteDisbursementByMilestone(communityUID, {
    onSuccess: () => {
      toast.success("Disbursement record deleted");
      onConfigSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete disbursement record");
    },
  });

  // Reset all state when switching to a different grant or when data is refreshed
  useEffect(() => {
    setActiveSection("details");
    setMilestoneEdits({});
    setPendingFiles({});
    setRemovedFiles(new Set());
    setConfirmingUnsign(false);
    setRecordPaymentOpen(false);
    setInitialPaymentMilestone(null);
    setConfigIsDirty(false);
    setConfigIsSaving(false);
    setLocalAgreementSigned(agreement?.signed === true);
    setAgreementDate(agreement?.signedAt ? new Date(agreement.signedAt) : undefined);
  }, [grant?.grantUid, dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync agreement state when it changes server-side
  useEffect(() => {
    setLocalAgreementSigned(agreement?.signed === true);
    setAgreementDate(agreement?.signedAt ? new Date(agreement.signedAt) : undefined);
  }, [agreement?.signed, agreement?.signedAt]);

  const editCount =
    Object.keys(milestoneEdits).length + Object.keys(pendingFiles).length + removedFiles.size;
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
    const completed = milestoneInvoices.filter(
      (i) =>
        i.milestoneStatus === MilestoneLifecycleStatus.COMPLETED ||
        i.milestoneStatus === MilestoneLifecycleStatus.VERIFIED
    ).length;
    const paid = milestoneInvoices.filter((i) => i.paymentStatus === "disbursed").length;
    return { total, received, completed, paid };
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

  useEffect(() => {
    if (!open) {
      setDiscardDialogOpen(false);
      setRecordPaymentOpen(false);
      pendingActionRef.current = null;
    }
  }, [open]);

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

  const handleFileRemoved = useCallback((mKey: string) => {
    setPendingFiles((prev) => {
      const next = { ...prev };
      delete next[mKey];
      return next;
    });
    setRemovedFiles((prev) => new Set(prev).add(mKey));
  }, []);

  const handleFileUploaded = useCallback(
    (
      mKey: string,
      milestoneLabel: string,
      milestoneUID: string | null,
      invoiceFileUrl: string,
      invoiceFileKey: string
    ) => {
      setRemovedFiles((prev) => {
        if (!prev.has(mKey)) return prev;
        const next = new Set(prev);
        next.delete(mKey);
        return next;
      });
      setPendingFiles((prev) => ({
        ...prev,
        [mKey]: { milestoneLabel, milestoneUID, invoiceFileUrl, invoiceFileKey },
      }));
    },
    []
  );

  const handleSaveMilestoneChanges = useCallback(async () => {
    if (!grant) return;

    // Build a map of all edits (dates + files + removals) keyed by milestone key
    const invoiceMap = new Map<
      string,
      {
        milestoneLabel: string;
        milestoneUID: string | null;
        invoiceReceivedAt?: string | null;
        invoiceFileKey?: string | null;
        invoiceFileUrl?: string | null;
      }
    >();

    // Add date edits
    for (const [key, edits] of Object.entries(milestoneEdits)) {
      const matchedInvoice = milestoneInvoices.find(
        (inv, idx) => getMilestoneKey(inv, idx) === key
      );
      const rawDate = edits.invoiceReceivedAt;
      const isoDate =
        rawDate && !rawDate.includes("T") ? `${rawDate}T00:00:00.000Z` : (rawDate ?? null);
      invoiceMap.set(key, {
        milestoneLabel: matchedInvoice?.milestoneLabel ?? key,
        milestoneUID: edits.milestoneUID ?? null,
        invoiceReceivedAt: isoDate,
      });
    }

    // Merge pending file uploads
    for (const [mKey, pending] of Object.entries(pendingFiles)) {
      const existing = invoiceMap.get(mKey);
      if (existing) {
        existing.invoiceFileKey = pending.invoiceFileKey;
        existing.invoiceFileUrl = pending.invoiceFileUrl;
      } else {
        invoiceMap.set(mKey, {
          milestoneLabel: pending.milestoneLabel,
          milestoneUID: pending.milestoneUID,
          invoiceFileKey: pending.invoiceFileKey,
          invoiceFileUrl: pending.invoiceFileUrl,
        });
      }
    }

    // Merge file removals (explicit null)
    for (const mKey of removedFiles) {
      const existing = invoiceMap.get(mKey);
      if (existing) {
        existing.invoiceFileKey = null;
        existing.invoiceFileUrl = null;
      } else {
        const matchedInvoice = milestoneInvoices.find(
          (inv, idx) => getMilestoneKey(inv, idx) === mKey
        );
        if (matchedInvoice) {
          invoiceMap.set(mKey, {
            milestoneLabel: matchedInvoice.milestoneLabel,
            milestoneUID: matchedInvoice.milestoneUID,
            invoiceReceivedAt: matchedInvoice.invoiceReceivedAt,
            invoiceFileKey: null,
            invoiceFileUrl: null,
          });
        }
      }
    }

    const invoices = [...invoiceMap.values()];

    try {
      await saveMilestoneInvoicesMutation.mutateAsync({
        grantUID: grant.grantUid,
        invoices,
      });
      setMilestoneEdits({});
      setPendingFiles({});
      setRemovedFiles(new Set());
      toast.success(`Saved ${editCount} ${editCount === 1 ? "change" : "changes"}`);
    } catch {
      toast.error("Failed to save changes");
    }
  }, [
    grant?.grantUid,
    milestoneEdits,
    milestoneInvoices,
    getMilestoneKey,
    pendingFiles,
    removedFiles,
    editCount,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopyAddress = useCallback(() => {
    if (!grant?.currentPayoutAddress) return;
    copyToClipboard(grant.currentPayoutAddress, "Address copied");
  }, [grant?.currentPayoutAddress, copyToClipboard]);

  const hasUnsavedChanges = hasMilestoneEdits || configIsDirty;

  // Discard confirmation dialog state
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const guardAction = useCallback(
    (action: () => void) => {
      if (hasUnsavedChanges) {
        pendingActionRef.current = action;
        setDiscardDialogOpen(true);
      } else {
        action();
      }
    },
    [hasUnsavedChanges]
  );

  const handleConfirmDiscard = useCallback(() => {
    setDiscardDialogOpen(false);
    setMilestoneEdits({});
    setPendingFiles({});
    setRemovedFiles(new Set());
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }, []);

  const handleCancelDiscard = useCallback(() => {
    setDiscardDialogOpen(false);
    pendingActionRef.current = null;
  }, []);

  const handleRequestRecordPayment = useCallback(
    (milestoneLabel: string, targetStatus: "awaiting_signatures" | "disbursed") => {
      const invoice = milestoneInvoices.find((inv) => inv.milestoneLabel === milestoneLabel);
      const amount =
        invoice?.allocatedAmount ??
        (invoice?.milestoneUID ? allocationByUID.get(invoice.milestoneUID) : undefined) ??
        null;
      setInitialPaymentMilestone({ milestoneLabel, status: targetStatus, amount });
      guardAction(() => setRecordPaymentOpen(true));
    },
    [guardAction, milestoneInvoices, allocationByUID]
  );

  const handleRequestDeleteDisbursement = useCallback(
    (milestoneLabel: string) => {
      if (!grant) return;
      const invoice = milestoneInvoices.find((inv) => inv.milestoneLabel === milestoneLabel);
      if (!invoice?.milestoneUID) {
        toast.error("Cannot delete: milestone UID not found");
        return;
      }
      deleteDisbursementMutation.mutate({
        grantUID: grant.grantUid,
        milestoneUID: invoice.milestoneUID,
      });
    },
    [grant, milestoneInvoices, deleteDisbursementMutation]
  );

  const handleRequestClose = useCallback(() => {
    guardAction(() => onOpenChange(false));
  }, [guardAction, onOpenChange]);

  const handleSectionChange = useCallback(
    (section: SidebarSection) => {
      if (section === activeSection) return;
      guardAction(() => setActiveSection(section));
    },
    [activeSection, guardAction]
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
    (activeSection === "settings" && configIsDirty);

  const isSaving = saveMilestoneInvoicesMutation.isPending || configIsSaving;

  return (
    <>
      <Dialog
        open={open && !!grant}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            handleRequestClose();
            return;
          }
          onOpenChange(nextOpen);
        }}
      >
        {grant && (
          <DialogContent className="max-w-7xl h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-zinc-950">
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
              <div className="flex-1 min-w-0 overflow-auto pl-6 py-3">
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
                      communityUID={communityUID}
                      milestoneInvoices={milestoneInvoices}
                      invoiceRequired={invoiceRequired}
                      milestoneEdits={milestoneEdits}
                      pendingFiles={pendingFiles}
                      allocationByUID={allocationByUID}
                      todayLocal={todayLocal}
                      getMilestoneKey={getMilestoneKey}
                      getInvoiceReceivedDate={getInvoiceReceivedDate}
                      handleInvoiceReceivedDateChange={handleInvoiceReceivedDateChange}
                      onFileUploaded={handleFileUploaded}
                      removedFiles={removedFiles}
                      onFileRemoved={handleFileRemoved}
                      onRequestRecordPayment={handleRequestRecordPayment}
                      onRequestDeleteDisbursement={handleRequestDeleteDisbursement}
                    />
                  </div>
                )}

                {activeSection === "settings" && (
                  <PayoutConfigurationContent
                    key={dataVersion}
                    ref={configRef}
                    isActive={activeSection === "settings"}
                    grantUID={grant.grantUid}
                    projectUID={grant.projectUid}
                    communityUID={communityUID}
                    grantName={grant.grantName}
                    projectName={grant.projectName}
                    onSuccess={onConfigSuccess}
                    onDirtyChange={setConfigIsDirty}
                    onSavingChange={setConfigIsSaving}
                  />
                )}

                {activeSection === "history" && (
                  <PayoutHistoryContent
                    key={dataVersion}
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Button
                            size="sm"
                            onClick={() => {
                              guardAction(() => onCreateDisbursement?.());
                            }}
                            disabled={!canCreateDisbursement || isSaving}
                          >
                            <PlusCircleIcon />
                            Create Disbursement
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!canCreateDisbursement && (
                        <TooltipContent>
                          Configure a payout address and amount in Payout Settings first
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      guardAction(() => setRecordPaymentOpen(true));
                    }}
                    disabled={isSaving}
                  >
                    <BanknotesIcon className="h-4 w-4" />
                    Record Payment
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {showSaveButton && (
                    <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
                      <CheckIcon />
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
        )}
      </Dialog>

      {/* Discard changes confirmation — must be outside outer Dialog to avoid
        the CSS transform containing-block that breaks fixed positioning */}
      <Dialog open={discardDialogOpen} onOpenChange={handleCancelDiscard}>
        <DialogContent className="max-w-sm bg-white dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={handleCancelDiscard}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDiscard}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {grant && (
        <RecordPaymentDialog
          isOpen={recordPaymentOpen}
          onClose={() => {
            setRecordPaymentOpen(false);
            setInitialPaymentMilestone(null);
          }}
          grantUID={grant.grantUid}
          projectUID={grant.projectUid}
          communityUID={communityUID}
          chainID={grant.grantChainId}
          milestoneAllocations={milestoneAllocations}
          milestoneInvoices={milestoneInvoices}
          todayLocal={todayLocal}
          onSuccess={onConfigSuccess}
          initialMilestoneLabel={initialPaymentMilestone?.milestoneLabel}
          initialAmount={initialPaymentMilestone?.amount}
          initialStatus={
            initialPaymentMilestone?.status === "awaiting_signatures"
              ? "AWAITING_SIGNATURES"
              : initialPaymentMilestone?.status === "disbursed"
                ? "DISBURSED"
                : undefined
          }
        />
      )}
    </>
  );
}
