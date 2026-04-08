"use client";

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
}

export const PaymentStatusDropdown = memo(function PaymentStatusDropdown({
  currentStatus,
  milestoneLabel,
  grantUID,
  communityUID,
  paymentStatusDate,
}: PaymentStatusDropdownProps) {
  const [confirmingDisbursed, setConfirmingDisbursed] = useState(false);
  const mutation = useUpdateMilestonePaymentStatus(communityUID);

  const currentConfig = useMemo(
    () => STATUS_OPTIONS.find((s) => s.value === currentStatus) ?? STATUS_OPTIONS[0],
    [currentStatus]
  );

  const handleSelect = useCallback(
    (status: MilestonePaymentStatus) => {
      if (status === currentStatus) return;

      // Require confirmation for destructive/critical status changes
      if (status === "disbursed") {
        setConfirmingDisbursed(true);
        return;
      }

      mutation.mutate(
        { grantUID, milestoneLabel, paymentStatus: status },
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
    [currentStatus, grantUID, milestoneLabel, mutation]
  );

  const handleConfirmDisbursed = useCallback(() => {
    setConfirmingDisbursed(false);
    mutation.mutate(
      { grantUID, milestoneLabel, paymentStatus: "disbursed" },
      {
        onSuccess: () => {
          toast.success("Payment status updated to Disbursed");
        },
        onError: () => {
          toast.error("Failed to update payment status");
        },
      }
    );
  }, [grantUID, milestoneLabel, mutation]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer",
              "hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1 -mx-1",
              currentConfig.textColor
            )}
            disabled={mutation.isPending}
            aria-label={`Change payment status for ${milestoneLabel}, currently ${currentConfig.label}`}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", currentConfig.dotColor)} />
            {mutation.isPending ? "Updating..." : currentConfig.label}
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

      {/* Confirmation dialog for marking as disbursed */}
      <Dialog open={confirmingDisbursed} onOpenChange={setConfirmingDisbursed}>
        <DialogContent className="max-w-sm bg-white dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Mark as disbursed?</DialogTitle>
            <DialogDescription>
              This will manually override the payment status for &ldquo;{milestoneLabel}&rdquo; to
              Disbursed. This is typically set automatically when a Safe transaction is confirmed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDisbursed(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmDisbursed}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
