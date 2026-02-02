import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MilestonesList } from "@/components/Milestone/MilestonesList";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

// Mock useQueryState from nuqs
const mockSetSelectedContentTypeQuery = jest.fn();
jest.mock("nuqs", () => ({
  useQueryState: jest.fn((key: string, options: any) => {
    if (key === "status") {
      return ["all", jest.fn()];
    }
    if (key === "contentType") {
      return ["all", mockSetSelectedContentTypeQuery];
    }
    return [options?.defaultValue || "", jest.fn()];
  }),
}));

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => "/project/test-project",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock stores
jest.mock("@/store", () => ({
  useOwnerStore: jest.fn((selector) => selector({ isOwner: false })),
  useProjectStore: jest.fn((selector) => selector({ isProjectAdmin: false })),
}));

// Mock ActivityCard component
jest.mock("@/components/Shared/ActivityCard", () => ({
  ActivityCard: ({ activity }: any) => (
    <div data-testid={`activity-card-${activity.type}`}>
      {activity.data?.title || activity.data?.uid || "Activity"}
    </div>
  ),
}));

// Mock ObjectivesSub component
jest.mock("@/components/Pages/Project/Objective/ObjectivesSub", () => ({
  ObjectivesSub: () => <div data-testid="objectives-sub">ObjectivesSub</div>,
}));

// Helper function to get Load More button (aria-label takes precedence over text content)
const getLoadMoreButton = () => screen.getByRole("button", { name: /more items/i });
const queryLoadMoreButton = () => screen.queryByRole("button", { name: /more items/i });

// Helper to create mock milestones
function createMockMilestone(
  index: number,
  overrides: Partial<UnifiedMilestone> = {}
): UnifiedMilestone {
  return {
    uid: `milestone-${index}`,
    title: `Test Milestone ${index}`,
    description: `Description for milestone ${index}`,
    completed: false,
    type: "project",
    createdAt: Date.now() - index * 86400000,
    endsAt: null,
    startsAt: null,
    chainID: 1,
    refUID: `ref-${index}`,
    source: {
      projectMilestone: {
        uid: `pm-${index}`,
        attester: "0x1234567890123456789012345678901234567890",
        completed: null,
      },
      grantMilestone: null,
    },
    mergedGrants: [],
    ...overrides,
  } as unknown as UnifiedMilestone;
}

// Helper to create multiple milestones
function createMockMilestones(count: number): UnifiedMilestone[] {
  return Array.from({ length: count }, (_, i) => createMockMilestone(i));
}

describe("MilestonesList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Basic Rendering", () => {
    it("should render milestone list with items", () => {
      const milestones = createMockMilestones(5);
      render(<MilestonesList milestones={milestones} />);

      expect(screen.getAllByTestId("activity-card-milestone")).toHaveLength(5);
    });

    it("should render empty state when no milestones and not authorized", () => {
      render(<MilestonesList milestones={[]} />);

      expect(screen.getByText("No milestones found!")).toBeInTheDocument();
    });

    it("should render filter dropdown", () => {
      const milestones = createMockMilestones(3);
      render(<MilestonesList milestones={milestones} />);

      expect(screen.getByRole("button", { name: /All Updates/i })).toBeInTheDocument();
    });

    it("should render ObjectivesSub component", () => {
      const milestones = createMockMilestones(3);
      render(<MilestonesList milestones={milestones} />);

      expect(screen.getByTestId("objectives-sub")).toBeInTheDocument();
    });
  });

  describe("Pagination - Initial Load", () => {
    it("should only show first 15 milestones initially when more exist", () => {
      const milestones = createMockMilestones(25);
      render(<MilestonesList milestones={milestones} />);

      expect(screen.getAllByTestId("activity-card-milestone")).toHaveLength(15);
    });

    it("should show all milestones when total is less than 15", () => {
      const milestones = createMockMilestones(10);
      render(<MilestonesList milestones={milestones} />);

      expect(screen.getAllByTestId("activity-card-milestone")).toHaveLength(10);
    });

    it("should show Load More button when there are more items", () => {
      const milestones = createMockMilestones(20);
      render(<MilestonesList milestones={milestones} />);

      const loadMoreButton = getLoadMoreButton();
      expect(loadMoreButton).toBeInTheDocument();
      expect(loadMoreButton).toHaveTextContent("5 remaining");
    });

    it("should not show Load More button when all items are displayed", () => {
      const milestones = createMockMilestones(10);
      render(<MilestonesList milestones={milestones} />);

      expect(queryLoadMoreButton()).not.toBeInTheDocument();
    });
  });

  describe("Pagination - Load More Functionality", () => {
    it("should load more milestones when clicking Load More", async () => {
      const milestones = createMockMilestones(25);
      render(<MilestonesList milestones={milestones} />);

      expect(screen.getAllByTestId("activity-card-milestone")).toHaveLength(15);

      const loadMoreButton = getLoadMoreButton();
      fireEvent.click(loadMoreButton);

      // Show loading skeleton
      expect(screen.getByTestId("milestones-loading-skeleton")).toBeInTheDocument();

      // Advance timers to complete loading
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getAllByTestId("activity-card-milestone")).toHaveLength(25);
      });
    });

    it("should show correct remaining count after loading more", async () => {
      const milestones = createMockMilestones(50);
      render(<MilestonesList milestones={milestones} />);

      // Initial state: 15 shown, 35 remaining
      expect(screen.getByText("35 remaining", { exact: false })).toBeInTheDocument();

      // Click load more
      fireEvent.click(getLoadMoreButton());
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        // After first load: 30 shown, 20 remaining
        expect(screen.getByText("20 remaining", { exact: false })).toBeInTheDocument();
      });
    });

    it("should hide Load More button when all items are loaded", async () => {
      const milestones = createMockMilestones(20);
      render(<MilestonesList milestones={milestones} />);

      expect(screen.getAllByTestId("activity-card-milestone")).toHaveLength(15);
      expect(getLoadMoreButton()).toBeInTheDocument();

      fireEvent.click(getLoadMoreButton());
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getAllByTestId("activity-card-milestone")).toHaveLength(20);
        expect(queryLoadMoreButton()).not.toBeInTheDocument();
      });
    });

    it("should show loading skeleton while loading more", () => {
      const milestones = createMockMilestones(30);
      render(<MilestonesList milestones={milestones} />);

      fireEvent.click(getLoadMoreButton());

      // Loading skeleton should be visible
      expect(screen.getByTestId("milestones-loading-skeleton")).toBeInTheDocument();
      expect(screen.getAllByTestId("milestone-item-skeleton")).toHaveLength(3);
    });

    it("should hide Load More button while loading", () => {
      const milestones = createMockMilestones(30);
      render(<MilestonesList milestones={milestones} />);

      const loadMoreButton = getLoadMoreButton();
      fireEvent.click(loadMoreButton);

      // Button should not be visible during loading
      expect(queryLoadMoreButton()).not.toBeInTheDocument();
    });
  });

  describe("Pagination - Multiple Load More Clicks", () => {
    it("should correctly load items across multiple clicks", async () => {
      const milestones = createMockMilestones(50);
      render(<MilestonesList milestones={milestones} />);

      // Initial: 15 items
      expect(screen.getAllByTestId("activity-card-milestone")).toHaveLength(15);

      // First click: 30 items
      fireEvent.click(getLoadMoreButton());
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getAllByTestId("activity-card-milestone")).toHaveLength(30);
      });

      // Second click: 45 items
      fireEvent.click(getLoadMoreButton());
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getAllByTestId("activity-card-milestone")).toHaveLength(45);
      });

      // Third click: 50 items (all loaded)
      fireEvent.click(getLoadMoreButton());
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getAllByTestId("activity-card-milestone")).toHaveLength(50);
        expect(queryLoadMoreButton()).not.toBeInTheDocument();
      });
    });
  });

  describe("Skeleton Loaders", () => {
    it("should render MilestoneItemSkeleton with correct structure", () => {
      const milestones = createMockMilestones(20);
      render(<MilestonesList milestones={milestones} />);

      fireEvent.click(getLoadMoreButton());

      const skeletons = screen.getAllByTestId("milestone-item-skeleton");
      expect(skeletons).toHaveLength(3);

      // Check skeleton has expected structure
      const skeleton = skeletons[0];
      expect(skeleton).toHaveClass("border", "bg-white", "rounded-xl");
    });

    it("should hide skeleton after loading completes", async () => {
      const milestones = createMockMilestones(20);
      render(<MilestonesList milestones={milestones} />);

      fireEvent.click(getLoadMoreButton());

      expect(screen.getByTestId("milestones-loading-skeleton")).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.queryByTestId("milestones-loading-skeleton")).not.toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have accessible Load More button with proper aria-label", () => {
      const milestones = createMockMilestones(25);
      render(<MilestonesList milestones={milestones} />);

      const loadMoreButton = getLoadMoreButton();
      expect(loadMoreButton).toHaveAttribute("aria-label", expect.stringContaining("more items"));
    });

    it("should have proper button type attribute", () => {
      const milestones = createMockMilestones(25);
      render(<MilestonesList milestones={milestones} />);

      const loadMoreButton = getLoadMoreButton();
      expect(loadMoreButton).toHaveAttribute("type", "button");
    });
  });

  describe("Content Type Filtering with Pagination", () => {
    it("should display totalItems count when showAllTypes is true", () => {
      const milestones = createMockMilestones(5);
      render(<MilestonesList milestones={milestones} showAllTypes={true} totalItems={100} />);

      expect(screen.getByText(/All Updates \(100\)/i)).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle exactly 15 milestones (no Load More needed)", () => {
      const milestones = createMockMilestones(15);
      render(<MilestonesList milestones={milestones} />);

      expect(screen.getAllByTestId("activity-card-milestone")).toHaveLength(15);
      expect(queryLoadMoreButton()).not.toBeInTheDocument();
    });

    it("should handle 16 milestones (Load More for 1 item)", () => {
      const milestones = createMockMilestones(16);
      render(<MilestonesList milestones={milestones} />);

      expect(screen.getAllByTestId("activity-card-milestone")).toHaveLength(15);
      expect(screen.getByText("1 remaining", { exact: false })).toBeInTheDocument();
    });

    it("should handle empty milestones array", () => {
      render(<MilestonesList milestones={[]} />);

      expect(screen.queryByTestId("activity-card-milestone")).not.toBeInTheDocument();
      expect(queryLoadMoreButton()).not.toBeInTheDocument();
    });

    it("should handle single milestone", () => {
      const milestones = createMockMilestones(1);
      render(<MilestonesList milestones={milestones} />);

      expect(screen.getAllByTestId("activity-card-milestone")).toHaveLength(1);
      expect(queryLoadMoreButton()).not.toBeInTheDocument();
    });
  });

  describe("Mixed Content Types", () => {
    it("should correctly handle and paginate different milestone types", () => {
      const milestones: UnifiedMilestone[] = [
        ...createMockMilestones(10).map((m) => ({ ...m, type: "project" as const })),
        ...Array.from({ length: 5 }, (_, i) =>
          createMockMilestone(i + 10, {
            type: "activity" as any,
            projectUpdate: { uid: `update-${i}`, title: `Update ${i}` } as any,
          })
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          createMockMilestone(i + 15, {
            type: "grant_update" as any,
            grantUpdate: { uid: `grant-update-${i}` } as any,
          })
        ),
      ];

      render(<MilestonesList milestones={milestones} showAllTypes={true} />);

      // Should show first 15 items of any type
      const allCards = screen.getAllByTestId(/activity-card-/);
      expect(allCards.length).toBe(15);
    });
  });
});
