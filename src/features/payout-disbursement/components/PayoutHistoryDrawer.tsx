"use client";

import { Dialog, Transition } from "@headlessui/react";
import {
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Fragment, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { NETWORKS, type SupportedChainId } from "@/config/tokens";
import {
  usePayoutHistory,
  useTotalDisbursed,
  useUpdateDisbursementStatus,
} from "../hooks/use-payout-disbursement";
import { type PayoutDisbursement, PayoutDisbursementStatus } from "../types/payout-disbursement";
import { calculateDisbursementProgress, formatTokenAmount } from "../utils/format-token-amount";

interface PayoutHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  grantUID: string;
  grantName: string;
  projectName: string;
  approvedAmount?: string;
  /** Token symbol for display (e.g., "USDC", "ETH"). Defaults to "USDC" */
  tokenSymbol?: string;
  /** Number of decimals for the token. Defaults to 6 (USDC standard) */
  tokenDecimals?: number;
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
  tokenSymbol = "USDC",
  tokenDecimals = 6,
}: PayoutHistoryDrawerProps) {
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: historyError,
  } = usePayoutHistory(grantUID, 1, 50, { enabled: isOpen && !!grantUID });

  const { data: totalDisbursed, isLoading: isLoadingTotal } = useTotalDisbursed(grantUID, {
    enabled: isOpen && !!grantUID,
  });

  const disbursements = historyData?.payload || [];

  // Calculate progress using the utility function
  const progress =
    totalDisbursed && approvedAmount
      ? calculateDisbursementProgress(totalDisbursed, approvedAmount, tokenDecimals)
      : 0;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-end p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-x-4"
              enterTo="opacity-100 translate-x-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-x-0"
              leaveTo="opacity-0 translate-x-4"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-lg bg-white dark:bg-zinc-800 shadow-xl transition-all min-h-[calc(100vh-2rem)]">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 px-6 py-4 z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold text-gray-900 dark:text-white"
                      >
                        Payout History
                      </Dialog.Title>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {projectName} - {grantName}
                      </p>
                    </div>
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
                <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-700/30 border-b border-gray-200 dark:border-zinc-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Total Disbursed
                      </p>
                      {isLoadingTotal ? (
                        <Spinner className="w-4 h-4 mt-1" />
                      ) : (
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formatTokenAmount(totalDisbursed || "0", tokenDecimals)} {tokenSymbol}
                        </p>
                      )}
                    </div>
                    {approvedAmount && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Grant Amount
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {parseFloat(approvedAmount).toLocaleString()} {tokenSymbol}
                        </p>
                      </div>
                    )}
                  </div>
                  {approvedAmount && totalDisbursed && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-zinc-600 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-12">
                      <Spinner className="w-8 h-8" />
                    </div>
                  ) : historyError ? (
                    <div className="text-center py-12">
                      <p className="text-red-500 dark:text-red-400">
                        Failed to load payout history
                      </p>
                    </div>
                  ) : disbursements.length === 0 ? (
                    <div className="text-center py-12">
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
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
      <div className="border border-gray-200 dark:border-zinc-600 rounded-lg p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
            >
              {statusConfig.label}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
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
            <div className="flex justify-between items-center">
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
                  <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1" />
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
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-zinc-600">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Milestone Breakdown
              </p>
              <div className="space-y-1">
                {Object.entries(disbursement.milestoneBreakdown).map(([milestoneId, amount]) => (
                  <div key={milestoneId} className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
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
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-zinc-600">
            <button
              type="button"
              onClick={() => setShowCancelDialog(true)}
              className="text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
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
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                {/* Warning Icon */}
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>

                <Dialog.Title
                  as="h3"
                  className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2"
                >
                  Cancel Disbursement
                </Dialog.Title>

                <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-4">
                  Are you sure you want to cancel this disbursement of{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatTokenAmount(disbursement.disbursedAmount, disbursement.tokenDecimals)}{" "}
                    {disbursement.token}
                  </span>
                  ?
                </p>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    This action cannot be undone.
                  </p>
                </div>

                {/* Optional Reason Input */}
                <div className="mb-6">
                  <label
                    htmlFor="cancel-reason"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Reason (optional)
                  </label>
                  <textarea
                    id="cancel-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter a reason for cancellation..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
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
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Cancel Disbursement
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
