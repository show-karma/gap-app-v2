import type { MilestoneAllocation } from "../types/payout-disbursement";

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
