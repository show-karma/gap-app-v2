"use client";

import {
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatUnits } from "viem";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NETWORKS, type SupportedChainId } from "@/config/tokens";
import { usePayoutHistory, useUpdateDisbursementStatus } from "../hooks/use-payout-disbursement";
import { type PayoutDisbursement, PayoutDisbursementStatus } from "../types/payout-disbursement";
import { formatTokenAmount } from "../utils/format-token-amount";

interface PayoutHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  grantUID: string;
  grantName: string;
  projectName: string;
  approvedAmount?: string;
}

/** Token total aggregation for multi-token support */
interface TokenTotalInfo {
  token: string;
  tokenDecimals: number;
  totalRaw: bigint;
  totalFormatted: string;
}

const STATUS_COLORS: Record<PayoutDisbursementStatus, { bg: string; text: string; label: string }> =
  {
    [PayoutDisbursementStatus.CONFIGURED]: {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      text: "text-purple-800 dark:text-purple-300",
      label: "Configured",
    },
    [PayoutDisbursementStatus.PENDING]: {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-800 dark:text-yellow-300",
      label: "Pending",
    },
    [PayoutDisbursementStatus.AWAITING_SIGNATURES]: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-800 dark:text-blue-300",
      label: "Awaiting Signatures",
    },
    [PayoutDisbursementStatus.DISBURSED]: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-800 dark:text-green-300",
      label: "Disbursed",
    },
    [PayoutDisbursementStatus.CANCELLED]: {
      bg: "bg-gray-100 dark:bg-gray-700/50",
      text: "text-gray-800 dark:text-gray-300",
      label: "Cancelled",
    },
    [PayoutDisbursementStatus.FAILED]: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-800 dark:text-red-300",
      label: "Failed",
    },
  };

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSafeUrl(safeAddress: string, txHash: string, chainId: number): string {
  const networkName = NETWORKS[chainId as SupportedChainId]?.name?.toLowerCase() || "mainnet";
  return `https://app.safe.global/transactions/tx?safe=${networkName}:${safeAddress}&id=multisig_${safeAddress}_${txHash}`;
}

function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function PayoutHistoryDrawer({
  isOpen,
  onClose,
  grantUID,
  grantName,
  projectName,
  approvedAmount,
}: PayoutHistoryDrawerProps) {
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: historyError,
  } = usePayoutHistory(grantUID, 1, 50, { enabled: isOpen && !!grantUID });

  const disbursements = historyData?.payload || [];

  // Calculate totals grouped by token from actual disbursements
  const tokenTotals = useMemo((): TokenTotalInfo[] => {
    const totalsMap = new Map<string, { token: string; tokenDecimals: number; totalRaw: bigint }>();

    for (const d of disbursements) {
      // Only count disbursed transactions (not pending/cancelled/failed)
      if (d.status !== PayoutDisbursementStatus.DISBURSED) continue;

      const key = `${d.token}-${d.tokenDecimals}`;
      const existing = totalsMap.get(key);
      const amount = BigInt(d.disbursedAmount || "0");

      if (existing) {
        existing.totalRaw += amount;
      } else {
        totalsMap.set(key, {
          token: d.token,
          tokenDecimals: d.tokenDecimals,
          totalRaw: amount,
        });
      }
    }

    return Array.from(totalsMap.values()).map((t) => ({
      ...t,
      totalFormatted: formatUnits(t.totalRaw, t.tokenDecimals),
    }));
  }, [disbursements]);

  // Get primary token info (first token with disbursements, or from first transaction)
  const primaryToken = useMemo(() => {
    if (tokenTotals.length > 0) {
      return tokenTotals[0];
    }
    // Fallback to first disbursement's token info if no completed disbursements
    if (disbursements.length > 0) {
      return {
        token: disbursements[0].token,
        tokenDecimals: disbursements[0].tokenDecimals,
        totalRaw: BigInt(0),
        totalFormatted: "0",
      };
    }
    // Default fallback
    return {
      token: "",
      tokenDecimals: 6,
      totalRaw: BigInt(0),
      totalFormatted: "0",
    };
  }, [tokenTotals, disbursements]);

  // Calculate progress based on primary token
  const progress = useMemo(() => {
    if (!approvedAmount || tokenTotals.length === 0) return 0;
    const totalDisbursed = parseFloat(primaryToken.totalFormatted);
    const approved = parseFloat(approvedAmount);
    if (approved <= 0) return 0;
    return Math.min(100, (totalDisbursed / approved) * 100);
  }, [approvedAmount, tokenTotals, primaryToken]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="fixed inset-y-0 right-0 left-auto h-full w-full max-w-lg translate-x-0 translate-y-0 flex flex-col gap-0 rounded-none border-l border-y-0 border-r-0 bg-white p-0 shadow-xl duration-300 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:rounded-l-lg dark:bg-zinc-800 [&>button]:hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-start justify-between">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Payout History
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                {projectName} - {grantName}
              </DialogDescription>
            </DialogHeader>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-zinc-700 dark:bg-zinc-700/30">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Total Disbursed
              </p>
              {isLoadingHistory ? (
                <Spinner className="mt-1 h-4 w-4" />
              ) : tokenTotals.length === 0 ? (
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  0 {primaryToken.token}
                </p>
              ) : tokenTotals.length === 1 ? (
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {parseFloat(tokenTotals[0].totalFormatted).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 18,
                  })}{" "}
                  {tokenTotals[0].token}
                </p>
              ) : (
                <div className="space-y-1">
                  {tokenTotals.map((t) => (
                    <p
                      key={`${t.token}-${t.tokenDecimals}`}
                      className="text-lg font-semibold text-gray-900 dark:text-white"
                    >
                      {parseFloat(t.totalFormatted).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 18,
                      })}{" "}
                      {t.token}
                    </p>
                  ))}
                </div>
              )}
            </div>
            {approvedAmount && (
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Grant Amount
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {parseFloat(approvedAmount).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 18,
                  })}{" "}
                  {primaryToken.token}
                </p>
              </div>
            )}
          </div>
          {approvedAmount && tokenTotals.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Progress</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-zinc-600">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : historyError ? (
            <div className="py-12 text-center">
              <p className="text-red-500 dark:text-red-400">Failed to load payout history</p>
            </div>
          ) : disbursements.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No disbursements yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {disbursements.map((disbursement) => (
                <DisbursementCard key={disbursement.id} disbursement={disbursement} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DisbursementCard({ disbursement }: { disbursement: PayoutDisbursement }) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const statusConfig = STATUS_COLORS[disbursement.status];
  const safeUrl = disbursement.safeTransactionHash
    ? getSafeUrl(disbursement.safeAddress, disbursement.safeTransactionHash, disbursement.chainID)
    : null;

  const canCancel = disbursement.status === PayoutDisbursementStatus.PENDING;

  return (
    <>
      <div className="rounded-lg border border-gray-200 p-4 dark:border-zinc-600">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
            >
              {statusConfig.label}
            </span>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {formatDate(disbursement.createdAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatTokenAmount(disbursement.disbursedAmount, disbursement.tokenDecimals)}{" "}
              {disbursement.token}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Recipient</span>
            <span className="font-mono text-gray-900 dark:text-white">
              {truncateAddress(disbursement.payoutAddress)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Safe</span>
            <span className="font-mono text-gray-900 dark:text-white">
              {truncateAddress(disbursement.safeAddress)}
            </span>
          </div>
          {disbursement.safeTransactionHash && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Transaction</span>
              {safeUrl ? (
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <span className="font-mono">
                    {truncateAddress(disbursement.safeTransactionHash)}
                  </span>
                  <ArrowTopRightOnSquareIcon className="ml-1 h-4 w-4" />
                </a>
              ) : (
                <span className="font-mono text-gray-900 dark:text-white">
                  {truncateAddress(disbursement.safeTransactionHash)}
                </span>
              )}
            </div>
          )}
          {disbursement.executedAt && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Executed</span>
              <span className="text-gray-900 dark:text-white">
                {formatDate(disbursement.executedAt)}
              </span>
            </div>
          )}
        </div>

        {/* Milestone Breakdown */}
        {disbursement.milestoneBreakdown &&
          Object.keys(disbursement.milestoneBreakdown).length > 0 && (
            <div className="mt-3 border-t border-gray-200 pt-3 dark:border-zinc-600">
              <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                Milestone Breakdown
              </p>
              <div className="space-y-1">
                {Object.entries(disbursement.milestoneBreakdown).map(([milestoneId, amount]) => (
                  <div key={milestoneId} className="flex justify-between text-xs">
                    <span className="max-w-[150px] truncate text-gray-500 dark:text-gray-400">
                      {milestoneId}
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {formatTokenAmount(amount, disbursement.tokenDecimals)} {disbursement.token}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Cancel Button - Only for PENDING status */}
        {canCancel && (
          <div className="mt-3 border-t border-gray-200 pt-3 dark:border-zinc-600">
            <button
              type="button"
              onClick={() => setShowCancelDialog(true)}
              className="text-sm text-gray-500 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            >
              Cancel Disbursement
            </button>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <CancelDisbursementDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        disbursement={disbursement}
      />
    </>
  );
}

interface CancelDisbursementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  disbursement: PayoutDisbursement;
}

function CancelDisbursementDialog({
  isOpen,
  onClose,
  disbursement,
}: CancelDisbursementDialogProps) {
  const [reason, setReason] = useState("");
  const updateStatusMutation = useUpdateDisbursementStatus({
    onSuccess: () => {
      toast.success("Disbursement cancelled successfully");
      onClose();
      setReason("");
    },
    onError: (error) => {
      toast.error(`Failed to cancel disbursement: ${error.message}`);
    },
  });

  const handleCancel = async () => {
    await updateStatusMutation.mutateAsync({
      disbursementId: disbursement.id,
      request: {
        status: PayoutDisbursementStatus.CANCELLED,
        reason: reason.trim() || undefined,
      },
    });
  };

  const handleClose = () => {
    if (!updateStatusMutation.isPending) {
      onClose();
      setReason("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-800">
        {/* Warning Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>

        <DialogHeader className="text-center">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Cancel Disbursement
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to cancel this disbursement of{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatTokenAmount(disbursement.disbursedAmount, disbursement.tokenDecimals)}{" "}
              {disbursement.token}
            </span>
            ?
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            This action cannot be undone.
          </p>
        </div>

        {/* Optional Reason Input */}
        <div className="mb-6">
          <label
            htmlFor="cancel-reason"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Reason (optional)
          </label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter a reason for cancellation..."
            rows={3}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>

        {/* Actions */}
        <DialogFooter className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={updateStatusMutation.isPending}
          >
            Keep Disbursement
          </Button>
          <Button
            onClick={handleCancel}
            isLoading={updateStatusMutation.isPending}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Cancel Disbursement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
