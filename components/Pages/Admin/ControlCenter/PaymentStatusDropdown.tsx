"use client";

import { ChevronDownIcon } from "@heroicons/react/20/solid";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateMilestonePaymentStatus } from "@/src/features/payout-disbursement/hooks/use-payout-disbursement";
import type { MilestonePaymentStatus } from "@/src/features/payout-disbursement/types/payout-disbursement";
import { cn } from "@/utilities/tailwind";

const STATUS_OPTIONS: {
  value: MilestonePaymentStatus;
  label: string;
  dotColor: string;
  textColor: string;
}[] = [
  {
    value: "unpaid",
    label: "Unpaid",
    dotColor: "bg-gray-300 dark:bg-zinc-600",
    textColor: "text-gray-500 dark:text-zinc-500",
  },
  {
    value: "pending",
    label: "Pending",
    dotColor: "bg-amber-400",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  {
    value: "awaiting_signatures",
    label: "Awaiting sigs",
    dotColor: "bg-blue-400",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  {
    value: "disbursed",
    label: "Disbursed",
    dotColor: "bg-green-500",
    textColor: "text-green-600 dark:text-green-400",
  },
];

interface PaymentStatusDropdownProps {
  currentStatus: MilestonePaymentStatus;
  milestoneLabel: string;
  grantUID: string;
  communityUID: string;
  paymentStatusDate?: string | null;
  onRequestRecordPayment?: (
    milestoneLabel: string,
    targetStatus: "awaiting_signatures" | "disbursed"
  ) => void;
  onRequestDeleteDisbursement?: (milestoneLabel: string) => void;
}

export const PaymentStatusDropdown = memo(function PaymentStatusDropdown({
  currentStatus,
  milestoneLabel,
  grantUID,
  communityUID,
  paymentStatusDate,
  onRequestRecordPayment,
  onRequestDeleteDisbursement,
}: PaymentStatusDropdownProps) {
  const [confirmingUnpaid, setConfirmingUnpaid] = useState(false);
  const mutation = useUpdateMilestonePaymentStatus(communityUID);

  const currentConfig = useMemo(
    () => STATUS_OPTIONS.find((s) => s.value === currentStatus) ?? STATUS_OPTIONS[0],
    [currentStatus]
  );

  const handleSelect = useCallback(
    (status: MilestonePaymentStatus) => {
      if (status === currentStatus) return;

      // "Awaiting sigs" and "Disbursed" open the Record Payment dialog
      if (status === "awaiting_signatures" || status === "disbursed") {
        onRequestRecordPayment?.(milestoneLabel, status);
        return;
      }

      // "Unpaid" shows confirmation dialog to delete the disbursement record
      if (status === "unpaid") {
        setConfirmingUnpaid(true);
        return;
      }

      // "Pending" stays as override-only (existing behavior)
      mutation.mutate(
        { grantUID, milestoneLabel, paymentStatus: "pending" },
        {
          onSuccess: () => {
            toast.success(`Payment status updated to ${status}`);
          },
          onError: () => {
            toast.error("Failed to update payment status");
          },
        }
      );
    },
    [
      currentStatus,
      grantUID,
      milestoneLabel,
      mutation,
      onRequestRecordPayment,
      onRequestDeleteDisbursement,
    ]
  );

  const handleConfirmUnpaid = useCallback(() => {
    setConfirmingUnpaid(false);
    onRequestDeleteDisbursement?.(milestoneLabel);
  }, [milestoneLabel, onRequestDeleteDisbursement]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer",
              "rounded-md px-2 py-1 -mx-1",
              "border border-transparent hover:border-gray-200 dark:hover:border-zinc-700",
              "hover:bg-gray-50 dark:hover:bg-zinc-900",
              "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              currentConfig.textColor
            )}
            disabled={mutation.isPending}
            aria-label={`Change payment status for ${milestoneLabel}, currently ${currentConfig.label}`}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", currentConfig.dotColor)} />
            {mutation.isPending ? "Updating..." : currentConfig.label}
            <ChevronDownIcon className="h-3 w-3 opacity-40" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="center" className="min-w-[160px]">
          <DropdownMenuLabel className="text-xs text-gray-500 dark:text-zinc-400">
            Payment status
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              disabled={option.value === currentStatus}
              onSelect={() => handleSelect(option.value)}
              className="flex items-center gap-2 text-xs cursor-pointer"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", option.dotColor)} />
              <span className={option.value === currentStatus ? "font-semibold" : ""}>
                {option.label}
              </span>
              {option.value === currentStatus && (
                <span className="ml-auto text-[10px] text-gray-400 dark:text-zinc-500">
                  current
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation dialog for marking as unpaid (deletes disbursement record) */}
      <Dialog open={confirmingUnpaid} onOpenChange={setConfirmingUnpaid}>
        <DialogContent className="max-w-sm bg-white dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Mark as unpaid?</DialogTitle>
            <DialogDescription>
              This will delete the associated disbursement record for &ldquo;{milestoneLabel}
              &rdquo;. The disbursement total will be reduced accordingly. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setConfirmingUnpaid(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmUnpaid}>
              Delete disbursement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
