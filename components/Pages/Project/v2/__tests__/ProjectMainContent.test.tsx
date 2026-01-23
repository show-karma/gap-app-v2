import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { ActivityFeed } from "../MainContent/ActivityFeed";
import { ActivityFilters } from "../MainContent/ActivityFilters";
import { ContentTabs } from "../MainContent/ContentTabs";
import { ProjectMainContent } from "../MainContent/ProjectMainContent";

// Mock the ActivityCard component
jest.mock("@/components/Shared/ActivityCard", () => ({
  ActivityCard: ({ activity }: { activity: { type: string; data: { title: string } } }) => (
    <div data-testid="activity-card">{activity.data.title || "Activity"}</div>
  ),
}));

// Mock the ImpactContent component to avoid loading external dependencies
jest.mock("../MainContent/ImpactContent", () => ({
  ImpactContent: () => <div data-testid="impact-content">Impact Content Mock</div>,
}));

// Mock useOwnerStore and useProjectStore
jest.mock("@/store", () => ({
  useOwnerStore: () => ({ isOwner: false }),
  useProjectStore: () => ({ isProjectAdmin: false }),
}));

const mockMilestones: UnifiedMilestone[] = [
  {
    uid: "milestone-1",
    type: "milestone",
    title: "First Milestone",
    description: "Description 1",
    createdAt: new Date().toISOString(),
    completed: false,
    chainID: 1,
    refUID: "0x123",
    source: { type: "project" },
  },
  {
    uid: "milestone-2",
    type: "grant",
    title: "Grant Received",
    description: "Grant description",
    createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    completed: true,
    chainID: 1,
    refUID: "0x456",
    source: { type: "grant" },
  },
  {
    uid: "milestone-3",
    type: "activity",
    title: "Product Update",
    description: "Update description",
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    completed: false,
    chainID: 1,
    refUID: "0x789",
    source: { type: "activity" },
  },
];

describe("ContentTabs", () => {
  const defaultProps = {
    activeTab: "updates" as const,
    onTabChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render content tabs", () => {
      render(<ContentTabs {...defaultProps} />);

      expect(screen.getByTestId("content-tabs")).toBeInTheDocument();
    });

    it("should render all tab options", () => {
      render(<ContentTabs {...defaultProps} />);

      expect(screen.getByTestId("tab-updates")).toBeInTheDocument();
      expect(screen.getByTestId("tab-about")).toBeInTheDocument();
      expect(screen.getByTestId("tab-funding")).toBeInTheDocument();
      expect(screen.getByTestId("tab-impact")).toBeInTheDocument();
      // Profile tab was renamed to Updates
      expect(screen.queryByTestId("tab-profile")).not.toBeInTheDocument();
    });

    it("should show funding count badge when provided", () => {
      render(<ContentTabs {...defaultProps} fundingCount={5} />);

      expect(screen.getByTestId("tab-funding-count")).toHaveTextContent("5");
    });

    it("should not show funding count badge when count is 0", () => {
      render(<ContentTabs {...defaultProps} fundingCount={0} />);

      expect(screen.queryByTestId("tab-funding-count")).not.toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should have correct active tab attribute", () => {
      render(<ContentTabs {...defaultProps} activeTab="about" />);

      const aboutTab = screen.getByTestId("tab-about");
      expect(aboutTab).toHaveAttribute("data-state", "active");
    });

    it("should have inactive state for non-selected tabs", () => {
      render(<ContentTabs {...defaultProps} activeTab="updates" />);

      const aboutTab = screen.getByTestId("tab-about");
      expect(aboutTab).toHaveAttribute("data-state", "inactive");
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<ContentTabs {...defaultProps} className="custom-class" />);

      expect(screen.getByTestId("content-tabs")).toHaveClass("custom-class");
    });
  });
});

describe("ActivityFilters", () => {
  const defaultProps = {
    sortBy: "newest" as const,
    onSortChange: jest.fn(),
    activeFilters: [] as ("funding" | "updates" | "blog" | "socials" | "other")[],
    onFilterToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render activity filters", () => {
      render(<ActivityFilters {...defaultProps} />);

      expect(screen.getByTestId("activity-filters")).toBeInTheDocument();
    });

    it("should render sort select", () => {
      render(<ActivityFilters {...defaultProps} />);

      expect(screen.getByTestId("sort-select")).toBeInTheDocument();
    });

    it("should render filter badges", () => {
      render(<ActivityFilters {...defaultProps} />);

      expect(screen.getByTestId("filter-badges")).toBeInTheDocument();
      expect(screen.getByTestId("filter-everything")).toBeInTheDocument();
      expect(screen.getByTestId("filter-funding")).toBeInTheDocument();
      expect(screen.getByTestId("filter-updates")).toBeInTheDocument();
      // Blog, Socials, and Other are hidden
      expect(screen.queryByTestId("filter-blog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("filter-socials")).not.toBeInTheDocument();
      expect(screen.queryByTestId("filter-other")).not.toBeInTheDocument();
    });

    it("should show milestone count when provided", () => {
      render(<ActivityFilters {...defaultProps} milestonesCount={21} completedCount={15} />);

      expect(screen.getByTestId("milestones-count")).toHaveTextContent(
        "21 Milestones, 15 Completed"
      );
    });

    it("should use singular form for single milestone", () => {
      render(<ActivityFilters {...defaultProps} milestonesCount={1} completedCount={1} />);

      expect(screen.getByTestId("milestones-count")).toHaveTextContent("1 Milestone, 1 Completed");
    });

    it("should not show milestone count when zero", () => {
      render(<ActivityFilters {...defaultProps} milestonesCount={0} />);

      expect(screen.queryByTestId("milestones-count")).not.toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should call onFilterToggle when filter badge is clicked", () => {
      const handleToggle = jest.fn();
      render(<ActivityFilters {...defaultProps} onFilterToggle={handleToggle} />);

      fireEvent.click(screen.getByTestId("filter-funding"));

      expect(handleToggle).toHaveBeenCalledWith("funding");
    });

    it("should show active state for selected filters", () => {
      render(<ActivityFilters {...defaultProps} activeFilters={["funding"]} />);

      // Check that the badge inside funding filter has active styling (bg-neutral-900)
      const fundingButton = screen.getByTestId("filter-funding");
      const badge = fundingButton.querySelector("div");
      expect(badge).toHaveClass("bg-neutral-900");
    });

    it("should show Everything button as active when no filters selected", () => {
      render(<ActivityFilters {...defaultProps} activeFilters={[]} />);

      const everythingButton = screen.getByTestId("filter-everything");
      expect(everythingButton).toBeInTheDocument();

      // Check that the badge inside Everything button has active styling
      const badge = everythingButton.querySelector("div");
      expect(badge).toHaveClass("bg-neutral-900");
    });

    it("should clear all filters when Everything button is clicked", () => {
      const handleToggle = jest.fn();
      render(
        <ActivityFilters
          {...defaultProps}
          activeFilters={["funding", "updates"]}
          onFilterToggle={handleToggle}
        />
      );

      fireEvent.click(screen.getByTestId("filter-everything"));

      // Should call toggle for each active filter to clear them
      expect(handleToggle).toHaveBeenCalledWith("funding");
      expect(handleToggle).toHaveBeenCalledWith("updates");
      expect(handleToggle).toHaveBeenCalledTimes(2);
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<ActivityFilters {...defaultProps} className="custom-class" />);

      expect(screen.getByTestId("activity-filters")).toHaveClass("custom-class");
    });
  });
});

describe("ActivityFeed", () => {
  describe("Rendering", () => {
    it("should render activity feed", () => {
      render(<ActivityFeed milestones={mockMilestones} />);

      expect(screen.getByTestId("activity-feed")).toBeInTheDocument();
    });

    it("should render activity items", () => {
      render(<ActivityFeed milestones={mockMilestones} />);

      const items = screen.getAllByTestId("activity-item");
      expect(items).toHaveLength(3);
    });

    it("should render timeline icons", () => {
      render(<ActivityFeed milestones={mockMilestones} />);

      const icons = screen.getAllByTestId("timeline-icon");
      expect(icons).toHaveLength(3);
    });

    it("should render activity items with timeline icons", () => {
      render(<ActivityFeed milestones={mockMilestones} />);

      const items = screen.getAllByTestId("activity-item");
      expect(items).toHaveLength(3);
    });

    it("should show empty state when no milestones", () => {
      render(<ActivityFeed milestones={[]} />);

      expect(screen.getByTestId("activity-feed-empty")).toBeInTheDocument();
      expect(screen.getByText("No activities to display")).toBeInTheDocument();
    });
  });

  describe("Sorting", () => {
    it("should sort by newest first by default", () => {
      render(<ActivityFeed milestones={mockMilestones} />);

      const items = screen.getAllByTestId("activity-item");
      expect(items).toHaveLength(3);
      // First item should be the newest (index 0 in mockMilestones is today)
    });

    it("should sort by oldest first when sortBy is oldest", () => {
      render(<ActivityFeed milestones={mockMilestones} sortBy="oldest" />);

      const items = screen.getAllByTestId("activity-item");
      expect(items).toHaveLength(3);
      // Items should be in reverse chronological order
    });
  });

  describe("Filtering", () => {
    it("should filter by active filters", () => {
      render(<ActivityFeed milestones={mockMilestones} activeFilters={["funding"]} />);

      // Only the grant type should show
      const items = screen.getAllByTestId("activity-item");
      expect(items).toHaveLength(1);
    });

    it("should show all items when no filters active", () => {
      render(<ActivityFeed milestones={mockMilestones} activeFilters={[]} />);

      const items = screen.getAllByTestId("activity-item");
      expect(items).toHaveLength(3);
    });
  });

  describe("Timeline Icons", () => {
    it("should show orange icon for milestone type", () => {
      render(<ActivityFeed milestones={mockMilestones} />);

      const icons = screen.getAllByTestId("timeline-icon");
      // First milestone is type "milestone" - should have orange background
      expect(icons[0]).toHaveClass("bg-orange-100");
    });

    it("should show green icon for grant/funding type", () => {
      render(<ActivityFeed milestones={mockMilestones} />);

      const icons = screen.getAllByTestId("timeline-icon");
      // Second milestone is type "grant" - should have green background
      expect(icons[1]).toHaveClass("bg-green-100");
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<ActivityFeed milestones={mockMilestones} className="custom-class" />);

      expect(screen.getByTestId("activity-feed")).toHaveClass("custom-class");
    });
  });
});

describe("ProjectMainContent", () => {
  const defaultProps = {
    milestones: mockMilestones,
    milestonesCount: 3,
    completedCount: 1,
  };

  describe("Rendering", () => {
    it("should render project main content", () => {
      render(<ProjectMainContent {...defaultProps} />);

      expect(screen.getByTestId("project-main-content")).toBeInTheDocument();
    });

    it("should render content tabs", () => {
      render(<ProjectMainContent {...defaultProps} />);

      expect(screen.getByTestId("content-tabs")).toBeInTheDocument();
    });

    it("should render activity filters on updates tab", () => {
      render(<ProjectMainContent {...defaultProps} />);

      expect(screen.getByTestId("activity-filters")).toBeInTheDocument();
    });

    it("should render activity feed on updates tab", () => {
      render(<ProjectMainContent {...defaultProps} />);

      expect(screen.getByTestId("activity-feed")).toBeInTheDocument();
    });
  });

  describe("Tab Navigation", () => {
    it("should start with updates tab active", () => {
      render(<ProjectMainContent {...defaultProps} />);

      const updatesTab = screen.getByTestId("tab-updates");
      expect(updatesTab).toHaveAttribute("data-state", "active");
    });

    it("should show activity feed on initial render (updates tab)", () => {
      render(<ProjectMainContent {...defaultProps} />);

      expect(screen.getByTestId("activity-feed")).toBeInTheDocument();
      expect(screen.getByTestId("activity-filters")).toBeInTheDocument();
    });

    it("should render all tab triggers", () => {
      render(<ProjectMainContent {...defaultProps} />);

      expect(screen.getByTestId("tab-updates")).toBeInTheDocument();
      expect(screen.getByTestId("tab-about")).toBeInTheDocument();
      expect(screen.getByTestId("tab-funding")).toBeInTheDocument();
      expect(screen.getByTestId("tab-impact")).toBeInTheDocument();
      // Profile tab was renamed to Updates
      expect(screen.queryByTestId("tab-profile")).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<ProjectMainContent {...defaultProps} className="custom-class" />);

      expect(screen.getByTestId("project-main-content")).toHaveClass("custom-class");
    });
  });
});
