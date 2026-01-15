"use client";

import { BanknotesIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { cn } from "@/utilities/tailwind";
import { useTotalDisbursed } from "../hooks/use-payout-disbursement";
import { PayoutHistoryDrawer } from "./PayoutHistoryDrawer";

interface DisbursementSummaryCardProps {
  /** The grant UID to fetch disbursement data for */
  grantUID: string;
  /** The grant name for display in the drawer */
  grantName: string;
  /** The project name for display in the drawer */
  projectName: string;
  /** Total approved amount for the grant (in human-readable format, e.g., "10000") */
  approvedAmount?: string;
  /** Currency symbol to display (defaults to "USDC") */
  currency?: string;
  /** Additional CSS classes for the card container */
  className?: string;
}

/**
 * Formats a raw amount (with decimals) to a human-readable format
 * The total disbursed from the API comes with 6 decimals (USDC standard)
 */
function formatDisbursedAmount(amount: string, decimals: number = 6): string {
  const num = parseFloat(amount) / 10 ** decimals;
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Formats an approved amount (already in human-readable format)
 */
function formatApprovedAmount(amount: string): string {
  const num = parseFloat(amount.replace(/,/g, ""));
  if (Number.isNaN(num)) return amount;
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Calculates the disbursement progress percentage
 * @param disbursed - Raw disbursed amount with decimals
 * @param approved - Human-readable approved amount
 * @param decimals - Number of decimals in the disbursed amount
 */
function calculateProgress(disbursed: string, approved: string, decimals: number = 6): number {
  const disbursedNum = parseFloat(disbursed) / 10 ** decimals;
  const approvedNum = parseFloat(approved.replace(/,/g, ""));

  if (Number.isNaN(disbursedNum) || Number.isNaN(approvedNum) || approvedNum === 0) {
    return 0;
  }

  return Math.min(100, (disbursedNum / approvedNum) * 100);
}

/**
 * Calculates the remaining balance
 * @param disbursed - Raw disbursed amount with decimals
 * @param approved - Human-readable approved amount
 * @param decimals - Number of decimals in the disbursed amount
 */
function calculateRemaining(disbursed: string, approved: string, decimals: number = 6): string {
  const disbursedNum = parseFloat(disbursed) / 10 ** decimals;
  const approvedNum = parseFloat(approved.replace(/,/g, ""));

  if (Number.isNaN(disbursedNum) || Number.isNaN(approvedNum)) {
    return "0";
  }

  const remaining = Math.max(0, approvedNum - disbursedNum);
  return remaining.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * DisbursementSummaryCard - Displays a summary of grant disbursements
 *
 * Shows:
 * - Total approved amount (from grant data)
 * - Total disbursed amount (from useTotalDisbursed hook)
 * - Remaining balance (approved - disbursed)
 * - Progress bar showing percentage disbursed
 * - "View History" button that opens PayoutHistoryDrawer
 *
 * This component should only be rendered for admin users.
 * The parent component should handle the admin access check.
 *
 * @example
 * ```tsx
 * // In a grant detail page (only render for admins)
 * {isCommunityAdmin && (
 *   <DisbursementSummaryCard
 *     grantUID={grant.uid}
 *     grantName={grant.details?.title || "Grant"}
 *     projectName={project.details?.title || "Project"}
 *     approvedAmount={grant.details?.amount}
 *   />
 * )}
 * ```
 */
export function DisbursementSummaryCard({
  grantUID,
  grantName,
  projectName,
  approvedAmount,
  currency = "USDC",
  className,
}: DisbursementSummaryCardProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const {
    data: totalDisbursed,
    isLoading,
    isError,
    error,
  } = useTotalDisbursed(grantUID, { enabled: !!grantUID });

  // Calculate derived values
  const formattedDisbursed = totalDisbursed ? formatDisbursedAmount(totalDisbursed) : "0";
  const formattedApproved = approvedAmount ? formatApprovedAmount(approvedAmount) : undefined;
  const progress =
    totalDisbursed && approvedAmount ? calculateProgress(totalDisbursed, approvedAmount) : 0;
  const remaining =
    totalDisbursed && approvedAmount
      ? calculateRemaining(totalDisbursed, approvedAmount)
      : formattedApproved || "0";

  // Determine progress bar color based on percentage
  const getProgressColor = (percent: number): string => {
    if (percent >= 100) return "bg-green-500";
    if (percent >= 75) return "bg-blue-500";
    if (percent >= 50) return "bg-blue-400";
    return "bg-blue-300";
  };

  return (
    <>
      <div
        className={cn(
          "rounded-xl border border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-700",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <BanknotesIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Disbursement Summary</h3>
          </div>
          <Button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5"
          >
            <ClockIcon className="h-4 w-4" />
            View History
          </Button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Spinner className="h-8 w-8" />
            </div>
          ) : isError ? (
            <div className="text-center py-6">
              <p className="text-sm text-red-500 dark:text-red-400">
                Failed to load disbursement data
              </p>
              {error?.message && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{error.message}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                {/* Approved Amount */}
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Approved
                  </span>
                  <span className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                    {formattedApproved ?? "N/A"}
                    {formattedApproved && (
                      <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                        {currency}
                      </span>
                    )}
                  </span>
                </div>

                {/* Disbursed Amount */}
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Disbursed
                  </span>
                  <span className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                    {formattedDisbursed}
                    <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                      {currency}
                    </span>
                  </span>
                </div>

                {/* Remaining Balance */}
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Remaining
                  </span>
                  <span className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                    {remaining}
                    <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                      {currency}
                    </span>
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {formattedApproved && (
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Disbursement Progress
                    </span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500 ease-out",
                        getProgressColor(progress)
                      )}
                      style={{ width: `${progress}%` }}
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Disbursement progress: ${progress.toFixed(1)}%`}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payout History Drawer */}
      <PayoutHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        grantUID={grantUID}
        grantName={grantName}
        projectName={projectName}
        approvedAmount={approvedAmount}
      />
    </>
  );
}
