import { fireEvent, render, screen } from "@testing-library/react";
import {
  calculateSelectedTotal,
  getPaidAllocationIds,
  MilestoneSelectionStep,
} from "../components/MilestoneSelectionStep";
import type { MilestoneAllocation, PayoutDisbursement } from "../types/payout-disbursement";
import { PayoutDisbursementStatus } from "../types/payout-disbursement";

describe("MilestoneSelectionStep", () => {
  // Note: Allocation amounts are stored as human-readable values (e.g., "10" for 10 USDC)
  const mockAllocations: MilestoneAllocation[] = [
    { id: "alloc-1", milestoneUID: "ms-1", label: "Milestone 1", amount: "1" },
    { id: "alloc-2", milestoneUID: "ms-2", label: "Milestone 2", amount: "2" },
    { id: "alloc-3", milestoneUID: "ms-3", label: "Milestone 3", amount: "3" },
  ];

  const defaultProps = {
    allocations: mockAllocations,
    paidAllocationIds: [] as string[],
    selectedAllocationIds: [] as string[],
    onSelectionChange: jest.fn(),
    tokenSymbol: "USDC",
    tokenDecimals: 6,
    grantName: "Test Grant",
    projectName: "Test Project",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render all unpaid allocations", () => {
      render(<MilestoneSelectionStep {...defaultProps} />);

      expect(screen.getByText("Milestone 1")).toBeInTheDocument();
      expect(screen.getByText("Milestone 2")).toBeInTheDocument();
      expect(screen.getByText("Milestone 3")).toBeInTheDocument();
    });

    it("should show amounts formatted correctly", () => {
      render(<MilestoneSelectionStep {...defaultProps} />);

      // Amounts should be formatted from smallest unit (1000000 = 1 USDC with 6 decimals)
      expect(screen.getByText("1 USDC")).toBeInTheDocument();
      expect(screen.getByText("2 USDC")).toBeInTheDocument();
      expect(screen.getByText("3 USDC")).toBeInTheDocument();
    });

    it("should show selected total as 0 when nothing is selected", () => {
      render(<MilestoneSelectionStep {...defaultProps} />);

      expect(screen.getByText(/Selected:/)).toBeInTheDocument();
      expect(screen.getByText("0 USDC")).toBeInTheDocument();
    });

    it("should show grant and project names in non-compact mode", () => {
      render(<MilestoneSelectionStep {...defaultProps} />);

      expect(screen.getByText("Test Grant")).toBeInTheDocument();
      expect(screen.getByText("Test Project")).toBeInTheDocument();
    });

    it("should not show grant and project names in compact mode", () => {
      render(<MilestoneSelectionStep {...defaultProps} compact />);

      expect(screen.queryByText("Test Grant")).not.toBeInTheDocument();
      expect(screen.queryByText("Test Project")).not.toBeInTheDocument();
    });
  });

  describe("with paid allocations", () => {
    it("should not render already paid allocations in the main list", () => {
      render(<MilestoneSelectionStep {...defaultProps} paidAllocationIds={["alloc-1"]} />);

      // Milestone 1 should be hidden from main list (it's paid)
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(2); // Only 2 unpaid
    });

    it("should show already paid message when all allocations are paid", () => {
      render(
        <MilestoneSelectionStep
          {...defaultProps}
          paidAllocationIds={["alloc-1", "alloc-2", "alloc-3"]}
        />
      );

      expect(
        screen.getByText(/All milestone allocations have been paid for this grant/)
      ).toBeInTheDocument();
    });

    it("should show paid count in header", () => {
      render(<MilestoneSelectionStep {...defaultProps} paidAllocationIds={["alloc-1"]} />);

      // There are multiple places showing "1 already paid", use getAllBy
      const elements = screen.getAllByText(/already paid/);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe("empty state", () => {
    it("should show message when no allocations configured", () => {
      render(<MilestoneSelectionStep {...defaultProps} allocations={[]} />);

      expect(
        screen.getByText(/No milestone allocations configured for this grant/)
      ).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("should call onSelectionChange when allocation is selected", () => {
      const onSelectionChange = jest.fn();
      render(<MilestoneSelectionStep {...defaultProps} onSelectionChange={onSelectionChange} />);

      const checkbox = screen.getAllByRole("checkbox")[0];
      fireEvent.click(checkbox);

      expect(onSelectionChange).toHaveBeenCalledWith(["alloc-1"]);
    });

    it("should call onSelectionChange when allocation is deselected", () => {
      const onSelectionChange = jest.fn();
      render(
        <MilestoneSelectionStep
          {...defaultProps}
          selectedAllocationIds={["alloc-1"]}
          onSelectionChange={onSelectionChange}
        />
      );

      const checkbox = screen.getAllByRole("checkbox")[0];
      fireEvent.click(checkbox);

      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it("should select all unpaid allocations when Select All is clicked", () => {
      const onSelectionChange = jest.fn();
      render(
        <MilestoneSelectionStep
          {...defaultProps}
          paidAllocationIds={["alloc-1"]}
          onSelectionChange={onSelectionChange}
        />
      );

      const selectAllButton = screen.getByText("Select All");
      fireEvent.click(selectAllButton);

      // Should select only unpaid allocations (alloc-2 and alloc-3)
      expect(onSelectionChange).toHaveBeenCalledWith(["alloc-2", "alloc-3"]);
    });

    it("should deselect all when Deselect All is clicked", () => {
      const onSelectionChange = jest.fn();
      render(
        <MilestoneSelectionStep
          {...defaultProps}
          selectedAllocationIds={["alloc-1", "alloc-2", "alloc-3"]}
          onSelectionChange={onSelectionChange}
        />
      );

      const deselectButton = screen.getByText("Deselect All");
      fireEvent.click(deselectButton);

      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it("should update selected total when allocations are selected", () => {
      render(
        <MilestoneSelectionStep {...defaultProps} selectedAllocationIds={["alloc-1", "alloc-2"]} />
      );

      // 1 + 2 = 3 USDC - look for the Selected: X USDC pattern
      expect(screen.getByText(/Selected:/)).toBeInTheDocument();
      // The component shows "3 USDC" but there may also be individual "3 USDC" amounts
      // So we verify the selected sum matches
      const selectedText = screen.getByText(/Selected:/).parentElement;
      expect(selectedText?.textContent).toContain("3 USDC");
    });
  });

  describe("warning state", () => {
    it("should show warning when nothing is selected", () => {
      render(<MilestoneSelectionStep {...defaultProps} />);

      expect(
        screen.getByText(/Select at least one allocation to include in this disbursement/)
      ).toBeInTheDocument();
    });

    it("should not show warning when something is selected", () => {
      render(<MilestoneSelectionStep {...defaultProps} selectedAllocationIds={["alloc-1"]} />);

      expect(
        screen.queryByText(/Select at least one allocation to include in this disbursement/)
      ).not.toBeInTheDocument();
    });
  });
});

describe("getPaidAllocationIds", () => {
  it("should extract paid allocation IDs from disbursed transactions", () => {
    const disbursements: PayoutDisbursement[] = [
      {
        id: "1",
        grantUID: "grant-1",
        projectUID: "project-1",
        communityUID: "community-1",
        chainID: 10,
        safeAddress: "0x123",
        safeTransactionHash: "0xabc",
        disbursedAmount: "1000000",
        token: "USDC",
        tokenAddress: "0x456",
        tokenDecimals: 6,
        payoutAddress: "0x789",
        milestoneBreakdown: null,
        paidAllocationIds: ["alloc-1", "alloc-2"],
        status: PayoutDisbursementStatus.DISBURSED,
        executedAt: "2026-01-13T10:00:00.000Z",
        createdBy: "0xadmin",
        createdAt: "2026-01-13T10:00:00.000Z",
        updatedAt: "2026-01-13T10:00:00.000Z",
      },
    ];

    const result = getPaidAllocationIds(disbursements);

    expect(result).toEqual(["alloc-1", "alloc-2"]);
  });

  it("should include allocation IDs from PENDING transactions (in-flight)", () => {
    // PENDING transactions are in-flight and should be treated as unavailable
    // to prevent race conditions where the same allocation is selected twice
    const disbursements: PayoutDisbursement[] = [
      {
        id: "1",
        grantUID: "grant-1",
        projectUID: "project-1",
        communityUID: "community-1",
        chainID: 10,
        safeAddress: "0x123",
        safeTransactionHash: "0xabc",
        disbursedAmount: "1000000",
        token: "USDC",
        tokenAddress: "0x456",
        tokenDecimals: 6,
        payoutAddress: "0x789",
        milestoneBreakdown: null,
        paidAllocationIds: ["alloc-1"],
        status: PayoutDisbursementStatus.PENDING,
        executedAt: null,
        createdBy: "0xadmin",
        createdAt: "2026-01-13T10:00:00.000Z",
        updatedAt: "2026-01-13T10:00:00.000Z",
      },
    ];

    const result = getPaidAllocationIds(disbursements);

    expect(result).toEqual(["alloc-1"]);
  });

  it("should not include allocation IDs from FAILED or CANCELLED transactions", () => {
    // FAILED and CANCELLED transactions free up the allocations for re-selection
    const disbursements: PayoutDisbursement[] = [
      {
        id: "1",
        grantUID: "grant-1",
        projectUID: "project-1",
        communityUID: "community-1",
        chainID: 10,
        safeAddress: "0x123",
        safeTransactionHash: "0xabc",
        disbursedAmount: "1000000",
        token: "USDC",
        tokenAddress: "0x456",
        tokenDecimals: 6,
        payoutAddress: "0x789",
        milestoneBreakdown: null,
        paidAllocationIds: ["alloc-1"],
        status: PayoutDisbursementStatus.FAILED,
        executedAt: null,
        createdBy: "0xadmin",
        createdAt: "2026-01-13T10:00:00.000Z",
        updatedAt: "2026-01-13T10:00:00.000Z",
      },
      {
        id: "2",
        grantUID: "grant-1",
        projectUID: "project-1",
        communityUID: "community-1",
        chainID: 10,
        safeAddress: "0x123",
        safeTransactionHash: "0xdef",
        disbursedAmount: "2000000",
        token: "USDC",
        tokenAddress: "0x456",
        tokenDecimals: 6,
        payoutAddress: "0x789",
        milestoneBreakdown: null,
        paidAllocationIds: ["alloc-2"],
        status: PayoutDisbursementStatus.CANCELLED,
        executedAt: null,
        createdBy: "0xadmin",
        createdAt: "2026-01-14T10:00:00.000Z",
        updatedAt: "2026-01-14T10:00:00.000Z",
      },
    ];

    const result = getPaidAllocationIds(disbursements);

    expect(result).toEqual([]);
  });

  it("should combine allocation IDs from multiple disbursed transactions", () => {
    const disbursements: PayoutDisbursement[] = [
      {
        id: "1",
        grantUID: "grant-1",
        projectUID: "project-1",
        communityUID: "community-1",
        chainID: 10,
        safeAddress: "0x123",
        safeTransactionHash: "0xabc",
        disbursedAmount: "1000000",
        token: "USDC",
        tokenAddress: "0x456",
        tokenDecimals: 6,
        payoutAddress: "0x789",
        milestoneBreakdown: null,
        paidAllocationIds: ["alloc-1"],
        status: PayoutDisbursementStatus.DISBURSED,
        executedAt: "2026-01-13T10:00:00.000Z",
        createdBy: "0xadmin",
        createdAt: "2026-01-13T10:00:00.000Z",
        updatedAt: "2026-01-13T10:00:00.000Z",
      },
      {
        id: "2",
        grantUID: "grant-1",
        projectUID: "project-1",
        communityUID: "community-1",
        chainID: 10,
        safeAddress: "0x123",
        safeTransactionHash: "0xdef",
        disbursedAmount: "2000000",
        token: "USDC",
        tokenAddress: "0x456",
        tokenDecimals: 6,
        payoutAddress: "0x789",
        milestoneBreakdown: null,
        paidAllocationIds: ["alloc-2", "alloc-3"],
        status: PayoutDisbursementStatus.DISBURSED,
        executedAt: "2026-01-14T10:00:00.000Z",
        createdBy: "0xadmin",
        createdAt: "2026-01-14T10:00:00.000Z",
        updatedAt: "2026-01-14T10:00:00.000Z",
      },
    ];

    const result = getPaidAllocationIds(disbursements);

    expect(result).toEqual(["alloc-1", "alloc-2", "alloc-3"]);
  });

  it("should return empty array when no disbursements", () => {
    const result = getPaidAllocationIds([]);

    expect(result).toEqual([]);
  });
});

describe("calculateSelectedTotal", () => {
  // Note: Allocation amounts are stored as human-readable values (e.g., "10" for 10 USDC)
  const allocations: MilestoneAllocation[] = [
    { id: "alloc-1", label: "Allocation 1", amount: "10" },
    { id: "alloc-2", label: "Allocation 2", amount: "20" },
    { id: "alloc-3", label: "Allocation 3", amount: "30.5" },
  ];

  it("should calculate total from selected allocations", () => {
    const result = calculateSelectedTotal(allocations, ["alloc-1", "alloc-2"]);

    expect(result).toBe(30); // 10 + 20
  });

  it("should return 0 when no allocations selected", () => {
    const result = calculateSelectedTotal(allocations, []);

    expect(result).toBe(0);
  });

  it("should handle all allocations selected", () => {
    const result = calculateSelectedTotal(allocations, ["alloc-1", "alloc-2", "alloc-3"]);

    expect(result).toBe(60.5); // 10 + 20 + 30.5
  });

  it("should ignore non-existent allocation IDs", () => {
    const result = calculateSelectedTotal(allocations, ["alloc-1", "non-existent"]);

    expect(result).toBe(10); // Only alloc-1
  });
});
