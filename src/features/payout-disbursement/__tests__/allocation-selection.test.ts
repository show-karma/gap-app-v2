import {
  ALLOCATION_SELECTION_REQUIRED_ERROR,
  getAllocationSelectionError,
} from "../utils/allocation-selection";

describe("allocation selection validation", () => {
  it("should not require selection when no allocations are configured", () => {
    const error = getAllocationSelectionError({
      milestoneAllocations: [],
      selectedAllocationIds: [],
    });

    expect(error).toBeNull();
  });

  it("should require at least one selected allocation when allocations exist", () => {
    const error = getAllocationSelectionError({
      milestoneAllocations: [{ id: "alloc-1" }],
      selectedAllocationIds: [],
    });

    expect(error).toBe(ALLOCATION_SELECTION_REQUIRED_ERROR);
  });

  it("should pass when at least one allocation is selected", () => {
    const error = getAllocationSelectionError({
      milestoneAllocations: [{ id: "alloc-1" }, { id: "alloc-2" }],
      selectedAllocationIds: ["alloc-2"],
    });

    expect(error).toBeNull();
  });

  it("should treat custom line items as allocations and require selection", () => {
    const error = getAllocationSelectionError({
      milestoneAllocations: [{ id: "custom-alloc-1" }],
      selectedAllocationIds: undefined,
    });

    expect(error).toBe(ALLOCATION_SELECTION_REQUIRED_ERROR);
  });
});
