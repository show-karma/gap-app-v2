import { fireEvent, render, screen } from "@testing-library/react";
import type { MilestoneData } from "@/types/whitelabel-entities";
import { MilestoneItem } from "../MilestoneItem";

describe("MilestoneItem", () => {
  const mockMilestone: MilestoneData = {
    title: "Test Milestone",
    description: "Test description",
    dueDate: "2025-12-31",
    fundingRequested: "1000",
    completionCriteria: "Test criteria",
  };

  const mockOnUpdate = vi.fn();
  const mockOnRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render milestone fields", () => {
    render(
      <MilestoneItem
        index={0}
        milestone={mockMilestone}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
        canRemove={true}
      />
    );

    expect(screen.getByText("Milestone 1")).toBeInTheDocument();
    expect(screen.getByTestId("milestone-title-input-0")).toHaveValue("Test Milestone");
  });

  it("derives required indicators from the schema: description has no asterisk, others do (#1179)", () => {
    render(
      <MilestoneItem
        index={0}
        milestone={mockMilestone}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
        canRemove={true}
      />
    );

    // Required sub-fields keep their asterisk.
    expect(screen.getByText("Title").parentElement?.textContent).toContain("*");
    expect(screen.getByText("Due Date").parentElement?.textContent).toContain("*");
    expect(screen.getByText("Funding Requested").parentElement?.textContent).toContain("*");
    expect(screen.getByText("Completion Criteria").textContent).toContain("*");

    // Description is optional now, so its label must NOT advertise an asterisk.
    expect(screen.getByText("Description").textContent).not.toContain("*");
  });

  it("should display milestoneUID when present", () => {
    const milestoneWithUID: MilestoneData = {
      ...mockMilestone,
      milestoneUID: "0x1234567890abcdef",
    };

    render(
      <MilestoneItem
        index={0}
        milestone={milestoneWithUID}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
        canRemove={true}
      />
    );

    expect(screen.getByText("On-Chain Milestone UID")).toBeInTheDocument();
    expect(screen.getByText("0x1234567890abcdef")).toBeInTheDocument();
  });

  it("should NOT display milestoneUID when not present", () => {
    render(
      <MilestoneItem
        index={0}
        milestone={mockMilestone}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
        canRemove={true}
      />
    );

    expect(screen.queryByText("On-Chain Milestone UID")).not.toBeInTheDocument();
  });

  it("should round-trip milestoneUID through form updates", () => {
    const milestoneWithUID: MilestoneData = {
      ...mockMilestone,
      milestoneUID: "0x1234567890abcdef",
    };

    render(
      <MilestoneItem
        index={0}
        milestone={milestoneWithUID}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
        canRemove={true}
      />
    );

    // Verify UID is displayed
    expect(screen.getByText("0x1234567890abcdef")).toBeInTheDocument();

    // Update title
    const titleInput = screen.getByTestId("milestone-title-input-0");
    fireEvent.change(titleInput, { target: { value: "Updated Milestone" } });

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Updated Milestone",
        milestoneUID: "0x1234567890abcdef",
      })
    );
  });
});
