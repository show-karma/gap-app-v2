import { render, screen } from "@testing-library/react";
import type { MilestoneStatusFilter } from "@/services/milestone-status-filter.service";
import { ActivityFilters, type ActivityFilterType } from "../ActivityFilters";

describe("ActivityFilters - Milestone Status Dropdown Visibility", () => {
  const defaultProps = {
    activeFilters: [] as ActivityFilterType[],
    onFilterToggle: vi.fn(),
    counts: { funding: 2, milestones: 3, updates: 1, endorsements: 1 } as Partial<
      Record<ActivityFilterType, number>
    >,
    milestoneStatusFilter: "all" as MilestoneStatusFilter,
    onMilestoneStatusChange: vi.fn(),
  };

  it("shows milestone status dropdown when no filters are active (All)", () => {
    render(<ActivityFilters {...defaultProps} activeFilters={[]} />);

    expect(screen.getByTestId("milestone-status-filter")).toBeInTheDocument();
  });

  it("shows milestone status dropdown when milestones filter is active", () => {
    render(<ActivityFilters {...defaultProps} activeFilters={["milestones"]} />);

    expect(screen.getByTestId("milestone-status-filter")).toBeInTheDocument();
  });

  it("shows milestone status dropdown when milestones filter is active alongside others", () => {
    render(<ActivityFilters {...defaultProps} activeFilters={["milestones", "funding"]} />);

    expect(screen.getByTestId("milestone-status-filter")).toBeInTheDocument();
  });

  it("hides milestone status dropdown when only funding filter is active", () => {
    render(<ActivityFilters {...defaultProps} activeFilters={["funding"]} />);

    expect(screen.queryByTestId("milestone-status-filter")).not.toBeInTheDocument();
  });

  it("hides milestone status dropdown when only endorsements filter is active", () => {
    render(<ActivityFilters {...defaultProps} activeFilters={["endorsements"]} />);

    expect(screen.queryByTestId("milestone-status-filter")).not.toBeInTheDocument();
  });

  it("hides milestone status dropdown when only updates filter is active", () => {
    render(<ActivityFilters {...defaultProps} activeFilters={["updates"]} />);

    expect(screen.queryByTestId("milestone-status-filter")).not.toBeInTheDocument();
  });

  it("hides milestone status dropdown when milestoneStatusFilter prop is undefined", () => {
    render(
      <ActivityFilters
        {...defaultProps}
        milestoneStatusFilter={undefined}
        onMilestoneStatusChange={undefined}
      />
    );

    expect(screen.queryByTestId("milestone-status-filter")).not.toBeInTheDocument();
  });

  it("hides milestone status dropdown when onMilestoneStatusChange is undefined", () => {
    render(
      <ActivityFilters
        {...defaultProps}
        milestoneStatusFilter="all"
        onMilestoneStatusChange={undefined}
      />
    );

    expect(screen.queryByTestId("milestone-status-filter")).not.toBeInTheDocument();
  });
});

describe("ActivityFilters - Milestone Status Dropdown Options", () => {
  it("renders the milestone status trigger with correct value", () => {
    render(
      <ActivityFilters
        activeFilters={[]}
        onFilterToggle={vi.fn()}
        counts={{ milestones: 3 }}
        milestoneStatusFilter="all"
        onMilestoneStatusChange={vi.fn()}
      />
    );

    const trigger = screen.getByTestId("milestone-status-filter");
    expect(trigger).toBeInTheDocument();
    // The trigger should display the current value text
    expect(trigger).toHaveTextContent("All statuses");
  });
});
