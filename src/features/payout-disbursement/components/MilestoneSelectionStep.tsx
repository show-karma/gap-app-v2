"use client";

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { useMemo } from "react";
import { cn } from "@/utilities/tailwind";
import type { MilestoneAllocation, PayoutDisbursement } from "../types/payout-disbursement";

export interface MilestoneSelectionStepProps {
  /** Milestone allocations available for selection */
  allocations: MilestoneAllocation[];
  /** IDs of allocations that have already been paid (from previous disbursements) */
  paidAllocationIds: string[];
  /** Currently selected allocation IDs */
  selectedAllocationIds: string[];
  /** Callback when selection changes */
  onSelectionChange: (selectedIds: string[]) => void;
  /** Token symbol for display (e.g., "USDC") */
  tokenSymbol: string;
  /** Token decimals for formatting amounts */
  tokenDecimals: number;
  /** Grant name for display */
  grantName: string;
  /** Project name for display */
  projectName: string;
  /** Whether to show in compact mode (for inline in table rows) */
  compact?: boolean;
}

/**
 * MilestoneSelectionStep component allows admins to select which milestone
 * allocations to pay when creating a disbursement. It filters out already-paid
 * allocations and shows the remaining unpaid ones for selection.
 */
export function MilestoneSelectionStep({
  allocations,
  paidAllocationIds,
  selectedAllocationIds,
  onSelectionChange,
  tokenSymbol,
  tokenDecimals,
  grantName,
  projectName,
  compact = false,
}: MilestoneSelectionStepProps) {
  // Convert paidAllocationIds to a Set for O(1) lookup
  const paidIds = useMemo(() => new Set(paidAllocationIds), [paidAllocationIds]);

  // Separate allocations into paid and unpaid
  const { paidAllocations, unpaidAllocations } = useMemo(() => {
    const paid: MilestoneAllocation[] = [];
    const unpaid: MilestoneAllocation[] = [];

    for (const allocation of allocations) {
      if (paidIds.has(allocation.id)) {
        paid.push(allocation);
      } else {
        unpaid.push(allocation);
      }
    }

    return { paidAllocations: paid, unpaidAllocations: unpaid };
  }, [allocations, paidIds]);

  // Calculate totals
  // Note: Allocation amounts are stored as human-readable values (e.g., "10" for 10 USDC)
  const { totalUnpaid, selectedTotal } = useMemo(() => {
    let unpaidSum = 0;
    let selectedSum = 0;

    for (const allocation of unpaidAllocations) {
      const amount = parseFloat(allocation.amount) || 0;
      unpaidSum += amount;
      if (selectedAllocationIds.includes(allocation.id)) {
        selectedSum += amount;
      }
    }

    return {
      totalUnpaid: unpaidSum,
      selectedTotal: selectedSum,
    };
  }, [unpaidAllocations, selectedAllocationIds]);

  // Format amount for display
  // Note: Allocation amounts are stored as human-readable values (e.g., "10" for 10 USDC),
  // NOT as raw token units. So we just format them nicely without conversion.
  const formatAmount = (amount: string): string => {
    const num = parseFloat(amount);
    if (Number.isNaN(num)) return amount;
    // Format with up to 6 decimal places, removing trailing zeros
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  };

  // Handle toggle selection for a single allocation
  const handleToggle = (allocationId: string) => {
    if (selectedAllocationIds.includes(allocationId)) {
      onSelectionChange(selectedAllocationIds.filter((id) => id !== allocationId));
    } else {
      onSelectionChange([...selectedAllocationIds, allocationId]);
    }
  };

  // Handle select all unpaid allocations
  const handleSelectAll = () => {
    const allUnpaidIds = unpaidAllocations.map((a) => a.id);
    onSelectionChange(allUnpaidIds);
  };

  // Handle clear all selections
  const handleClearAll = () => {
    onSelectionChange([]);
  };

  // Check if all unpaid are selected
  const allSelected =
    unpaidAllocations.length > 0 &&
    unpaidAllocations.every((a) => selectedAllocationIds.includes(a.id));

  // Check if none are selected
  const noneSelected = selectedAllocationIds.length === 0;

  // No allocations at all
  if (allocations.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-gray-200 dark:border-zinc-700 p-4",
          compact && "p-3"
        )}
      >
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <InformationCircleIcon className="h-5 w-5" />
          <span className="text-sm">
            No milestone allocations configured for this grant.
            {!compact &&
              " Configure allocations in the payout settings to enable milestone-based payments."}
          </span>
        </div>
      </div>
    );
  }

  // All allocations are already paid
  if (unpaidAllocations.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4",
          compact && "p-3"
        )}
      >
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <CheckCircleIcon className="h-5 w-5" />
          <span className="text-sm font-medium">
            All milestone allocations have been paid for this grant.
          </span>
        </div>
        {!compact && paidAllocations.length > 0 && (
          <div className="mt-3 text-sm text-green-600 dark:text-green-500">
            {paidAllocations.length} {paidAllocations.length === 1 ? "allocation" : "allocations"}{" "}
            paid
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {/* Header with grant info */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">{grantName}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">{projectName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {unpaidAllocations.length} unpaid{" "}
              {unpaidAllocations.length === 1 ? "allocation" : "allocations"}
            </p>
            {paidAllocations.length > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400">
                {paidAllocations.length} already paid
              </p>
            )}
          </div>
        </div>
      )}

      {/* Selection controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={allSelected ? handleClearAll : handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
          {!noneSelected && !allSelected && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Clear
            </button>
          )}
        </div>
        <div className="text-sm">
          <span className="text-gray-500 dark:text-gray-400">Selected: </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {selectedTotal.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 6,
            })}{" "}
            {tokenSymbol}
          </span>
        </div>
      </div>

      {/* Allocation list */}
      <div className={cn("space-y-2", compact && "space-y-1")}>
        {unpaidAllocations.map((allocation) => {
          const isSelected = selectedAllocationIds.includes(allocation.id);
          return (
            <label
              key={allocation.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                isSelected
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600"
                  : "border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600",
                compact && "p-2"
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(allocation.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-medium text-gray-900 dark:text-white truncate",
                    compact && "text-sm"
                  )}
                >
                  {allocation.label}
                </p>
                {allocation.milestoneUID && !compact && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    Milestone: {allocation.milestoneUID.slice(0, 8)}...
                  </p>
                )}
              </div>
              <div
                className={cn(
                  "text-right font-medium text-gray-900 dark:text-white",
                  compact && "text-sm"
                )}
              >
                {formatAmount(allocation.amount)} {tokenSymbol}
              </div>
            </label>
          );
        })}
      </div>

      {/* Already paid allocations (collapsed by default) */}
      {!compact && paidAllocations.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            Show {paidAllocations.length} already paid{" "}
            {paidAllocations.length === 1 ? "allocation" : "allocations"}
          </summary>
          <div className="mt-2 space-y-1">
            {paidAllocations.map((allocation) => (
              <div
                key={allocation.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-zinc-800/50 opacity-60"
              >
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="flex-1 truncate">{allocation.label}</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatAmount(allocation.amount)} {tokenSymbol}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Warning if nothing selected */}
      {noneSelected && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <span className="text-sm text-yellow-700 dark:text-yellow-300">
            Select at least one allocation to include in this disbursement.
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Statuses that indicate an allocation is unavailable for selection.
 * Includes both completed (DISBURSED) and in-flight (AWAITING_SIGNATURES, PENDING) states.
 */
const UNAVAILABLE_STATUSES = new Set(["DISBURSED", "AWAITING_SIGNATURES", "PENDING"]);

/**
 * Helper function to get unavailable allocation IDs from disbursement history.
 * Extracts all paidAllocationIds from disbursements that are either completed
 * or in-flight (pending Safe signatures). This prevents double-selection of
 * allocations that are already being processed.
 *
 * Note: When a disbursement is CANCELLED or FAILED, its allocations become
 * available again for selection.
 */
export function getPaidAllocationIds(disbursements: PayoutDisbursement[]): string[] {
  const unavailableIds: string[] = [];

  for (const disbursement of disbursements) {
    // Include allocations from DISBURSED, AWAITING_SIGNATURES, and PENDING statuses
    // This prevents selecting allocations that are already in-flight
    if (
      UNAVAILABLE_STATUSES.has(disbursement.status) &&
      disbursement.paidAllocationIds &&
      disbursement.paidAllocationIds.length > 0
    ) {
      unavailableIds.push(...disbursement.paidAllocationIds);
    }
  }

  return unavailableIds;
}

/**
 * Helper function to calculate the total amount from selected allocations.
 * Note: Allocation amounts are stored as human-readable values (e.g., "10" for 10 USDC).
 * Returns the sum as a number (not bigint) since amounts can have decimals.
 */
export function calculateSelectedTotal(
  allocations: MilestoneAllocation[],
  selectedIds: string[]
): number {
  const selectedSet = new Set(selectedIds);
  let total = 0;

  for (const allocation of allocations) {
    if (selectedSet.has(allocation.id)) {
      total += parseFloat(allocation.amount) || 0;
    }
  }

  return total;
}
