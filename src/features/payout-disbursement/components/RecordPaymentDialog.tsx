"use client";

import { BanknotesIcon } from "@heroicons/react/24/outline";
import { memo, useCallback, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { DEFAULT_USDC_CHAIN_ID, TOKEN_ADDRESSES, TOKENS } from "@/config/tokens";
import { useRecordPayment } from "@/src/features/payout-disbursement/hooks/use-payout-disbursement";
import type {
  CommunityPayoutInvoiceInfo,
  MilestoneAllocation,
} from "@/src/features/payout-disbursement/types/payout-disbursement";
import { toSmallestUnit } from "@/src/features/payout-disbursement/utils/format-token-amount";
import { cn } from "@/utilities/tailwind";

interface RecordPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  grantUID: string;
  projectUID: string;
  communityUID: string;
  chainID: number;
  milestoneAllocations?: MilestoneAllocation[] | null;
  milestoneInvoices?: CommunityPayoutInvoiceInfo[];
  todayLocal: string;
  onSuccess?: () => void;
}

const USDC_DECIMALS = TOKENS.usdc.decimals;

function getUsdcAddressForChain(chainID: number): string | null {
  const addresses = TOKEN_ADDRESSES.usdc as Record<number, string>;
  return addresses[chainID] ?? null;
}

type OptionCategory = "payment" | "milestone" | "custom";

interface MilestoneOption {
  key: string;
  label: string;
  milestoneUID: string | null;
  allocationId: string | null;
  allocatedAmount: string | null;
  isPaid: boolean;
  category: OptionCategory;
}

const PAYMENT_KEYWORDS = /\b(first|final|initial|last|signing|completion|upfront|advance|closing)\b/i;

function classifyOption(label: string, milestoneUID: string | null): OptionCategory {
  if (milestoneUID) return "milestone";
  if (PAYMENT_KEYWORDS.test(label)) return "payment";
  return "custom";
}

const CATEGORY_CONFIG: Record<OptionCategory, { label: string }> = {
  payment: { label: "Payments" },
  milestone: { label: "Milestones" },
  custom: { label: "Custom" },
};

function RecordPaymentDialogInner({
  isOpen,
  onClose,
  grantUID,
  projectUID,
  communityUID,
  chainID,
  milestoneAllocations,
  milestoneInvoices,
  todayLocal,
  onSuccess,
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const nativeUsdcAddress = getUsdcAddressForChain(chainID);
  const chainSupported = nativeUsdcAddress !== null;

  const recordPayment = useRecordPayment({
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      resetForm();
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record payment");
    },
  });

  const resetForm = useCallback(() => {
    setAmount("");
    setPaymentDate("");
    setTransactionHash("");
    setNotes("");
    setSelectedKeys([]);
  }, []);

  const milestoneOptions = useMemo((): MilestoneOption[] => {
    const options: MilestoneOption[] = [];
    const usedAllocationIds = new Set<string>();

    if (milestoneInvoices && milestoneInvoices.length > 0) {
      for (let i = 0; i < milestoneInvoices.length; i++) {
        const invoice = milestoneInvoices[i];
        const allocation = milestoneAllocations?.find(
          (a) => a.milestoneUID && a.milestoneUID === invoice.milestoneUID
        );
        if (allocation) usedAllocationIds.add(allocation.id);

        const label = allocation?.label || invoice.milestoneLabel || `Milestone ${i + 1}`;
        options.push({
          key: invoice.milestoneUID ?? `milestone-${i}`,
          label,
          milestoneUID: invoice.milestoneUID,
          allocationId: allocation?.id ?? null,
          allocatedAmount: allocation?.amount ?? invoice.allocatedAmount ?? null,
          isPaid: invoice.paymentStatus === "disbursed",
          category: classifyOption(label, invoice.milestoneUID),
        });
      }
    }

    if (milestoneAllocations) {
      for (const allocation of milestoneAllocations) {
        if (usedAllocationIds.has(allocation.id)) continue;
        options.push({
          key: allocation.milestoneUID ?? `allocation-${allocation.id}`,
          label: allocation.label,
          milestoneUID: allocation.milestoneUID ?? null,
          allocationId: allocation.id,
          allocatedAmount: allocation.amount ?? null,
          isPaid: false,
          category: classifyOption(allocation.label, allocation.milestoneUID ?? null),
        });
      }
    }

    return options;
  }, [milestoneInvoices, milestoneAllocations]);

  const groupedOptions = useMemo(() => {
    const groups = new Map<OptionCategory, MilestoneOption[]>();
    for (const option of milestoneOptions) {
      const list = groups.get(option.category) ?? [];
      list.push(option);
      groups.set(option.category, list);
    }
    return (["milestone", "payment", "custom"] as OptionCategory[])
      .filter((cat) => groups.has(cat))
      .map((cat) => ({ category: cat, ...CATEGORY_CONFIG[cat], items: groups.get(cat)! }));
  }, [milestoneOptions]);

  const toggleSelection = useCallback((key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const isValid =
    amount.trim() !== "" && Number(amount) > 0 && paymentDate !== "" && selectedKeys.length > 0;

  const handleSubmit = useCallback(() => {
    if (!isValid || recordPayment.isPending) return;

    const effectiveChainID = chainSupported ? chainID : DEFAULT_USDC_CHAIN_ID;
    const tokenAddress =
      nativeUsdcAddress ?? (getUsdcAddressForChain(DEFAULT_USDC_CHAIN_ID) as string);
    const disbursedAmount = toSmallestUnit(amount, USDC_DECIMALS);

    const selectedMilestones = milestoneOptions.filter((m) => selectedKeys.includes(m.key));

    const paidAllocationIds = selectedMilestones
      .map((m) => m.allocationId)
      .filter(Boolean) as string[];

    const milestoneBreakdown: Record<string, string> | undefined =
      selectedMilestones.length > 0
        ? Object.fromEntries(
            selectedMilestones.map((m) => [m.milestoneUID ?? m.key, disbursedAmount])
          )
        : undefined;

    const CATEGORY_PREFIX: Record<OptionCategory, string> = {
      milestone: "Milestone",
      payment: "Payment",
      custom: "",
    };

    const milestoneLabels: Record<string, string> | undefined =
      selectedMilestones.length > 0
        ? Object.fromEntries(
            selectedMilestones.map((m) => {
              const prefix = CATEGORY_PREFIX[m.category];
              const displayLabel = prefix ? `${prefix}: ${m.label}` : m.label;
              return [m.milestoneUID ?? m.key, displayLabel];
            })
          )
        : undefined;

    recordPayment.mutate({
      grantUID,
      projectUID,
      communityUID,
      chainID: effectiveChainID,
      disbursedAmount,
      tokenDecimals: USDC_DECIMALS,
      token: "USDC",
      tokenAddress,
      paidAllocationIds: paidAllocationIds.length > 0 ? paidAllocationIds : undefined,
      milestoneBreakdown:
        milestoneBreakdown && Object.keys(milestoneBreakdown).length > 0
          ? milestoneBreakdown
          : undefined,
      paymentDate: new Date(paymentDate).toISOString(),
      transactionHash: transactionHash.trim() || undefined,
      notes: notes.trim() || undefined,
      milestoneLabels,
    });
  }, [
    isValid,
    amount,
    paymentDate,
    transactionHash,
    notes,
    selectedKeys,
    milestoneOptions,
    chainID,
    grantUID,
    projectUID,
    communityUID,
    recordPayment,
    chainSupported,
    nativeUsdcAddress,
  ]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (!recordPayment.isPending) {
          resetForm();
          onClose();
        }
      }
    },
    [onClose, resetForm, recordPayment.isPending]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg bg-white dark:bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BanknotesIcon className="h-5 w-5 text-green-600" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a historical payment that was made outside the system.
          </DialogDescription>
        </DialogHeader>

        {!chainSupported && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800/40 dark:bg-amber-900/10">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              USDC is not configured for this grant&apos;s chain. Payment will be recorded as
              Ethereum mainnet USDC.
            </p>
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* Payment Type */}
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
              Payment Type
            </span>
            <div className="max-h-52 overflow-y-auto rounded-md border border-gray-200 dark:border-zinc-700">
              {groupedOptions.map((group, groupIdx) => (
                <div key={group.category}>
                  {/* Group header */}
                  <div
                    className={cn(
                      "sticky top-0 z-10 px-3 py-1.5",
                      "bg-gray-50 dark:bg-zinc-900",
                      "border-b border-gray-200 dark:border-zinc-700",
                      groupIdx > 0 && "border-t"
                    )}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                      {group.label}
                    </span>
                  </div>

                  {/* Group items */}
                  {group.items.map((option, itemIdx) => {
                    const isSelected = selectedKeys.includes(option.key);
                    const isDisabled = recordPayment.isPending || option.isPaid;
                    const isLastInGroup = itemIdx === group.items.length - 1;

                    return (
                      <label
                        key={option.key}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 cursor-pointer",
                          !isLastInGroup && "border-b border-gray-100 dark:border-zinc-800",
                          "hover:bg-gray-50 dark:hover:bg-zinc-900",
                          isSelected && !isDisabled && "bg-blue-50 dark:bg-blue-950/30",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(option.key)}
                          disabled={isDisabled}
                          className="rounded border-gray-300 shrink-0"
                        />
                        <span className="flex-1 min-w-0 text-sm text-gray-700 dark:text-zinc-300 truncate">
                          {option.label}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {option.allocatedAmount && !Number.isNaN(Number(option.allocatedAmount)) && (
                            <span className="text-xs text-gray-500 dark:text-zinc-500 tabular-nums">
                              ${Number(option.allocatedAmount).toLocaleString()}
                            </span>
                          )}
                          {option.isPaid && (
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              Paid
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              ))}

              {groupedOptions.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-gray-400 dark:text-zinc-600">
                  No payment types configured. Set up allocations in Payout Settings.
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label
              htmlFor="rp-amount"
              className="text-sm font-medium text-gray-700 dark:text-zinc-300"
            >
              Amount (USDC)
            </label>
            <Input
              id="rp-amount"
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={recordPayment.isPending}
            />
          </div>

          {/* Payment Date */}
          <div className="space-y-1.5">
            <label
              htmlFor="rp-date"
              className="text-sm font-medium text-gray-700 dark:text-zinc-300"
            >
              Payment Date
            </label>
            <Input
              id="rp-date"
              type="date"
              max={todayLocal}
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              disabled={recordPayment.isPending}
            />
          </div>

          {/* Transaction Hash */}
          <div className="space-y-1.5">
            <label
              htmlFor="rp-txhash"
              className="text-sm font-medium text-gray-700 dark:text-zinc-300"
            >
              Transaction Hash (optional)
            </label>
            <Input
              id="rp-txhash"
              type="text"
              placeholder="0x..."
              maxLength={66}
              value={transactionHash}
              onChange={(e) => setTransactionHash(e.target.value)}
              disabled={recordPayment.isPending}
              className="font-mono text-sm"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="rp-notes"
              className="text-sm font-medium text-gray-700 dark:text-zinc-300"
            >
              Notes (optional)
            </label>
            <textarea
              id="rp-notes"
              className={cn(
                "w-full rounded-md border border-gray-200 dark:border-zinc-700 px-3 py-2",
                "text-sm bg-transparent placeholder:text-gray-400 dark:placeholder:text-zinc-600",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              rows={2}
              maxLength={1000}
              placeholder="Optional notes about this payment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={recordPayment.isPending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={recordPayment.isPending}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!isValid || recordPayment.isPending}>
            {recordPayment.isPending ? "Recording..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const RecordPaymentDialog = memo(RecordPaymentDialogInner);
