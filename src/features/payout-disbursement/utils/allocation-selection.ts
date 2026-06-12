import type { MilestoneAllocation, PayoutDisbursement } from "../types/payout-disbursement";

export const ALLOCATION_SELECTION_REQUIRED_ERROR = "Select at least one allocation to disburse";

interface AllocationSelectionInput {
  milestoneAllocations?: Pick<MilestoneAllocation, "id">[] | null;
  selectedAllocationIds?: string[];
}

export function getAllocationSelectionError({
  milestoneAllocations,
  selectedAllocationIds,
}: AllocationSelectionInput): string | null {
  if (!milestoneAllocations || milestoneAllocations.length === 0) {
    return null;
  }

  if (!selectedAllocationIds || selectedAllocationIds.length === 0) {
    return ALLOCATION_SELECTION_REQUIRED_ERROR;
  }

  return null;
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
 * Note: Allocation amounts are stored in human-readable format (e.g., "50000" for 50000 USDC).
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
