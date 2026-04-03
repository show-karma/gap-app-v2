import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ActivityFilters } from "@/components/Pages/Project/v2/MainContent/ActivityFilters";
import type { MilestoneStatusFilter } from "@/services/milestone-status-filter.service";
import type { ActivityFilterType } from "@/types/v2/project-profile.types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ projectId: "test-project" }),
}));

describe("MilestoneStatusFilter visibility in ActivityFilters", () => {
  const defaultProps = {
    activeFilters: [] as ActivityFilterType[],
    onFilterToggle: vi.fn(),
    counts: {
      funding: 2,
      milestones: 5,
      updates: 3,
      endorsements: 1,
    } as Partial<Record<ActivityFilterType, number>>,
    milestonesCount: 5,
    completedCount: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows milestone status dropdown when no filter is active (All selected)", () => {
    render(
      <ActivityFilters
        {...defaultProps}
        activeFilters={[]}
        milestoneStatusFilter="all"
        onMilestoneStatusChange={vi.fn()}
      />
    );

    expect(screen.getByTestId("milestone-status-filter")).toBeInTheDocument();
  });

  it("shows milestone status dropdown when milestones filter is active", () => {
    render(
      <ActivityFilters
        {...defaultProps}
        activeFilters={["milestones"]}
        milestoneStatusFilter="all"
        onMilestoneStatusChange={vi.fn()}
      />
    );

    expect(screen.getByTestId("milestone-status-filter")).toBeInTheDocument();
  });

  it("hides milestone status dropdown when only non-milestone filters are active", () => {
    render(
      <ActivityFilters
        {...defaultProps}
        activeFilters={["funding"]}
        milestoneStatusFilter="all"
        onMilestoneStatusChange={vi.fn()}
      />
    );

    expect(screen.queryByTestId("milestone-status-filter")).not.toBeInTheDocument();
  });

  it("hides milestone status dropdown when updates filter is active without milestones", () => {
    render(
      <ActivityFilters
        {...defaultProps}
        activeFilters={["updates", "endorsements"]}
        milestoneStatusFilter="all"
        onMilestoneStatusChange={vi.fn()}
      />
    );

    expect(screen.queryByTestId("milestone-status-filter")).not.toBeInTheDocument();
  });

  it("shows milestone status dropdown when milestones AND other filters are active", () => {
    render(
      <ActivityFilters
        {...defaultProps}
        activeFilters={["milestones", "funding"]}
        milestoneStatusFilter="all"
        onMilestoneStatusChange={vi.fn()}
      />
    );

    expect(screen.getByTestId("milestone-status-filter")).toBeInTheDocument();
  });

  it("does not show milestone status dropdown when props are not provided", () => {
    render(<ActivityFilters {...defaultProps} activeFilters={[]} />);

    expect(screen.queryByTestId("milestone-status-filter")).not.toBeInTheDocument();
  });

  it("shows 'All statuses' as default placeholder", () => {
    render(
      <ActivityFilters
        {...defaultProps}
        activeFilters={[]}
        milestoneStatusFilter="all"
        onMilestoneStatusChange={vi.fn()}
      />
    );

    const trigger = screen.getByTestId("milestone-status-filter");
    expect(trigger).toHaveTextContent("All statuses");
  });
});
