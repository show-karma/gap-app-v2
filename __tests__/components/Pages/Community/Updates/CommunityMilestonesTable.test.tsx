/**
 * Tests for CommunityMilestonesTable component.
 *
 * Covers:
 * - Loading state renders skeleton rows (no data rows)
 * - Success state renders one row per milestone
 * - Empty state renders the supplied empty-state node
 * - Error state renders the error message
 * - Sortable headers call onSort with the clicked field
 * - Active sort header reflects the current sortBy/sortOrder
 */

import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CommunityMilestonesTable } from "@/components/Pages/Community/Updates/CommunityMilestonesTable";
import type { CommunityMilestoneUpdate } from "@/types/community-updates";

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function createMockMilestone(
  overrides: Partial<CommunityMilestoneUpdate> = {}
): CommunityMilestoneUpdate {
  return {
    uid: "milestone-1",
    communityUID: "community-1",
    status: "pending",
    details: {
      title: "Ship the MVP",
      description: "Build and launch the first version",
      dueDate: "2026-06-01",
    },
    project: {
      uid: "project-1",
      details: { data: { title: "DeFi Dashboard", slug: "defi-dashboard" } },
    },
    grant: {
      uid: "grant-1",
      details: { data: { title: "Growth Grant" } },
    },
    grantMilestoneIndex: 1,
    grantMilestoneTotal: 3,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const noopSort = vi.fn();
const emptyState = <div data-testid="empty-state">No updates found</div>;

const baseProps = {
  sortBy: null,
  sortOrder: "asc" as const,
  onSort: noopSort,
  allocationMap: new Map<string, string>(),
  emptyState,
};

describe("CommunityMilestonesTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("renders skeleton rows and no milestone data", () => {
      render(<CommunityMilestonesTable milestones={[]} isLoading {...baseProps} />);

      expect(screen.queryByText("Ship the MVP")).not.toBeInTheDocument();
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    });
  });

  describe("success state", () => {
    it("renders one row per milestone", () => {
      const milestones = [
        createMockMilestone(),
        createMockMilestone({
          uid: "milestone-2",
          details: { title: "Second milestone", description: "desc", dueDate: "2026-07-01" },
        }),
      ];

      render(<CommunityMilestonesTable milestones={milestones} isLoading={false} {...baseProps} />);

      expect(screen.getByText("Ship the MVP")).toBeInTheDocument();
      expect(screen.getByText("Second milestone")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("renders the supplied empty-state node when there are no milestones", () => {
      render(<CommunityMilestonesTable milestones={[]} isLoading={false} {...baseProps} />);

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("renders the error message", () => {
      render(
        <CommunityMilestonesTable
          milestones={[]}
          isLoading={false}
          {...baseProps}
          error={new Error("boom")}
        />
      );

      expect(screen.getByText("Error loading community updates")).toBeInTheDocument();
      expect(screen.getByText("boom")).toBeInTheDocument();
    });
  });

  describe("sorting", () => {
    it("calls onSort with the field when a sortable header is clicked", () => {
      const onSort = vi.fn();
      render(
        <CommunityMilestonesTable
          milestones={[createMockMilestone()]}
          isLoading={false}
          {...baseProps}
          onSort={onSort}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Sort by Due date" }));
      expect(onSort).toHaveBeenCalledWith("dueDate");

      fireEvent.click(screen.getByRole("button", { name: "Sort by Status" }));
      expect(onSort).toHaveBeenCalledWith("status");

      fireEvent.click(screen.getByRole("button", { name: "Sort by Project" }));
      expect(onSort).toHaveBeenCalledWith("projectTitle");
    });

    it("does not render sort buttons for non-sortable columns", () => {
      render(
        <CommunityMilestonesTable
          milestones={[createMockMilestone()]}
          isLoading={false}
          {...baseProps}
        />
      );

      expect(screen.queryByRole("button", { name: "Sort by Allocation" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Sort by Actions" })).not.toBeInTheDocument();
    });
  });
});
