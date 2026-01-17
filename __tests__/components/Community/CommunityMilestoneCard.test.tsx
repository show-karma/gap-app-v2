import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import type { CommunityMilestoneUpdate } from "@/types/community-updates";

// Mock the entire component module path to avoid deep dependency chain
jest.mock("@/components/Shared/ActivityCard", () => ({
  containerClassName:
    "border border-gray-300 dark:border-zinc-400 rounded-xl bg-white dark:bg-zinc-800",
  ActivityCard: jest.fn(),
}));

// Mock ActivityAttribution component
jest.mock("@/components/Shared/ActivityCard/ActivityAttribution", () => ({
  ActivityAttribution: ({ date, attester, isCompleted }: any) => (
    <div data-testid="activity-attribution">
      <span data-testid="attribution-date">{date}</span>
      <span data-testid="attribution-completed">{isCompleted ? "true" : "false"}</span>
    </div>
  ),
}));

// Mock Next.js Link component
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, className, target, rel }: any) => (
    <a href={href} className={className} target={target} rel={rel}>
      {children}
    </a>
  ),
}));

// Mock ReadMore utility
jest.mock("@/utilities/ReadMore", () => ({
  ReadMore: ({ children, side }: any) => (
    <div data-testid="read-more" data-side={side}>
      {children}
    </div>
  ),
}));

// Mock formatDate utility
jest.mock("@/utilities/formatDate", () => ({
  formatDate: jest.fn((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }),
}));

// Mock MilestoneCompletionInfo component
jest.mock("@/components/Pages/Community/Updates/MilestoneCompletionInfo", () => ({
  MilestoneCompletionInfo: ({ completionReason, completionDate, completedBy }: any) => (
    <div data-testid="milestone-completion-info">
      <span data-testid="completion-reason">{completionReason}</span>
      <span data-testid="completion-date">{completionDate}</span>
      <span data-testid="completed-by">{completedBy}</span>
    </div>
  ),
}));

// Mock Heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  CheckCircleIcon: ({ className }: any) => (
    <svg data-testid="check-circle-icon" className={className} />
  ),
  ClockIcon: ({ className }: any) => <svg data-testid="clock-icon" className={className} />,
}));

// Mock tailwind utility
jest.mock("@/utilities/tailwind", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

// Import the component after all mocks are set up
import { CommunityMilestoneCard } from "@/components/Pages/Community/Updates/CommunityMilestoneCard";

describe("CommunityMilestoneCard", () => {
  // Helper to create a date in the past
  const pastDate = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  };

  // Helper to create a date in the future
  const futureDate = (daysAhead: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return date.toISOString();
  };

  const createMockMilestone = (
    overrides: Partial<CommunityMilestoneUpdate> = {}
  ): CommunityMilestoneUpdate => ({
    uid: "milestone-123",
    communityUID: "community-456",
    status: "pending",
    details: {
      title: "Test Milestone",
      description: "This is a test milestone description",
      dueDate: futureDate(30), // Default to future date
    },
    project: {
      uid: "project-789",
      details: {
        data: {
          title: "Test Project",
          slug: "test-project",
        },
      },
    },
    grant: {
      uid: "grant-abc",
      details: {
        data: {
          title: "Test Grant Program",
        },
      },
    },
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset date mocking if any
    jest.useRealTimers();
  });

  describe("Status Display - Past Due Logic", () => {
    it('should display "Past Due" status when milestone is not completed and due date has passed', () => {
      const milestone = createMockMilestone({
        status: "pending",
        details: {
          title: "Test Milestone",
          description: "Description",
          dueDate: pastDate(10), // 10 days ago
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.getByText("Past Due")).toBeInTheDocument();
      expect(screen.queryByText("Pending")).not.toBeInTheDocument();
      expect(screen.queryByText("Completed")).not.toBeInTheDocument();
    });

    it('should display "Pending" status when milestone is not completed and due date is in the future', () => {
      const milestone = createMockMilestone({
        status: "pending",
        details: {
          title: "Test Milestone",
          description: "Description",
          dueDate: futureDate(30), // 30 days from now
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.queryByText("Past Due")).not.toBeInTheDocument();
      expect(screen.queryByText("Completed")).not.toBeInTheDocument();
    });

    it('should display "Completed" status when milestone is completed regardless of due date', () => {
      const milestone = createMockMilestone({
        status: "completed",
        details: {
          title: "Test Milestone",
          description: "Description",
          dueDate: pastDate(10), // Even if past due
          completionReason: "Done!",
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.queryByText("Past Due")).not.toBeInTheDocument();
      expect(screen.queryByText("Pending")).not.toBeInTheDocument();
    });

    it('should display "Pending" when there is no due date', () => {
      const milestone = createMockMilestone({
        status: "pending",
        details: {
          title: "Test Milestone",
          description: "Description",
          dueDate: null,
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.queryByText("Past Due")).not.toBeInTheDocument();
    });

    it("should apply red styling for past due status", () => {
      const milestone = createMockMilestone({
        status: "pending",
        details: {
          title: "Test Milestone",
          description: "Description",
          dueDate: pastDate(10),
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      const statusBadge = screen.getByText("Past Due").closest("div");
      expect(statusBadge).toHaveClass("bg-red-100");
      expect(statusBadge).toHaveClass("text-red-800");
    });

    it("should apply yellow styling for pending status", () => {
      const milestone = createMockMilestone({
        status: "pending",
        details: {
          title: "Test Milestone",
          description: "Description",
          dueDate: futureDate(30),
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      const statusBadge = screen.getByText("Pending").closest("div");
      expect(statusBadge).toHaveClass("bg-yellow-100");
      expect(statusBadge).toHaveClass("text-yellow-800");
    });

    it("should apply green styling for completed status", () => {
      const milestone = createMockMilestone({
        status: "completed",
        details: {
          title: "Test Milestone",
          description: "Description",
          dueDate: futureDate(30),
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      const statusBadge = screen.getByText("Completed").closest("div");
      expect(statusBadge).toHaveClass("bg-green-100");
      expect(statusBadge).toHaveClass("text-green-800");
    });

    it("should show CheckCircleIcon for completed status", () => {
      const milestone = createMockMilestone({ status: "completed" });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();
      expect(screen.queryByTestId("clock-icon")).not.toBeInTheDocument();
    });

    it("should show ClockIcon for pending and past due status", () => {
      const pendingMilestone = createMockMilestone({ status: "pending" });

      const { rerender } = render(<CommunityMilestoneCard milestone={pendingMilestone} />);

      expect(screen.getByTestId("clock-icon")).toBeInTheDocument();
      expect(screen.queryByTestId("check-circle-icon")).not.toBeInTheDocument();

      // Also test past due
      const pastDueMilestone = createMockMilestone({
        status: "pending",
        details: {
          title: "Test",
          description: "",
          dueDate: pastDate(10),
        },
      });

      rerender(<CommunityMilestoneCard milestone={pastDueMilestone} />);

      expect(screen.getByTestId("clock-icon")).toBeInTheDocument();
    });
  });

  describe("Project and Grant Data Access", () => {
    it("should correctly display project title from details.data.title", () => {
      const milestone = createMockMilestone({
        project: {
          uid: "project-123",
          details: {
            data: {
              title: "My Awesome Project",
              slug: "my-awesome-project",
            },
          },
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.getByText("My Awesome Project")).toBeInTheDocument();
    });

    it("should correctly link to project using details.data.slug", () => {
      const milestone = createMockMilestone({
        project: {
          uid: "project-123",
          details: {
            data: {
              title: "Test Project",
              slug: "correct-project-slug",
            },
          },
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      const projectLink = screen.getByText("Test Project").closest("a");
      expect(projectLink).toHaveAttribute("href", "/project/correct-project-slug");
    });

    it("should correctly display grant title from details.data.title", () => {
      const milestone = createMockMilestone({
        grant: {
          uid: "grant-123",
          details: {
            data: {
              title: "Filecoin ProPGF Batch 1",
            },
          },
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.getByText("Filecoin ProPGF Batch 1")).toBeInTheDocument();
    });

    it('should display "Project Milestone" when grant title is not available', () => {
      const milestone = createMockMilestone({
        grant: undefined,
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.getByText("Project Milestone")).toBeInTheDocument();
    });

    it("should link to funding page with correct project slug and grant uid", () => {
      const milestone = createMockMilestone({
        project: {
          uid: "project-123",
          details: {
            data: {
              title: "Test Project",
              slug: "my-project-slug",
            },
          },
        },
        grant: {
          uid: "0xgrant123abc",
          details: {
            data: {
              title: "Test Grant",
            },
          },
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      const viewMilestoneLink = screen.getByText("View full milestone →");
      expect(viewMilestoneLink).toHaveAttribute(
        "href",
        "/project/my-project-slug/funding/0xgrant123abc"
      );
    });

    it("should link to project updates when grant is not available", () => {
      const milestone = createMockMilestone({
        project: {
          uid: "project-123",
          details: {
            data: {
              title: "Test Project",
              slug: "my-project-slug",
            },
          },
        },
        grant: undefined,
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      const viewUpdatesLink = screen.getByText("View project updates →");
      expect(viewUpdatesLink).toHaveAttribute("href", "/project/my-project-slug/updates");
    });

    it("should handle missing project details gracefully", () => {
      const milestone = createMockMilestone({
        project: {
          uid: "project-123",
          details: undefined as any,
        },
      });

      // Should not throw an error
      render(<CommunityMilestoneCard milestone={milestone} />);

      // Project title link should exist but with undefined slug
      const projectLink = screen.getByRole("link", { name: "" });
      expect(projectLink).toHaveAttribute("href", "/project/undefined");
    });
  });

  describe("Rendering - Basic Elements", () => {
    it("should render milestone title", () => {
      const milestone = createMockMilestone({
        details: {
          title: "Important Milestone Title",
          description: "Description",
          dueDate: futureDate(30),
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.getByText("Important Milestone Title")).toBeInTheDocument();
    });

    it("should render milestone description", () => {
      const milestone = createMockMilestone({
        details: {
          title: "Title",
          description: "This is the milestone description text",
          dueDate: futureDate(30),
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      const readMore = screen.getByTestId("read-more");
      expect(readMore).toHaveTextContent("This is the milestone description text");
    });

    it("should not render description section when description is empty", () => {
      const milestone = createMockMilestone({
        details: {
          title: "Title",
          description: "",
          dueDate: futureDate(30),
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.queryByTestId("read-more")).not.toBeInTheDocument();
    });

    it("should display due date for pending milestones", () => {
      const milestone = createMockMilestone({
        status: "pending",
        details: {
          title: "Title",
          description: "Description",
          dueDate: futureDate(60), // Use future date to ensure "Pending" status
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      // Should display "Due" text for pending milestones
      const dueElements = screen.getAllByText(/Due/);
      expect(dueElements.length).toBeGreaterThan(0);
    });

    it("should not display due date for completed milestones", () => {
      const milestone = createMockMilestone({
        status: "completed",
        details: {
          title: "Title",
          description: "Description",
          dueDate: futureDate(30),
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      // The "Due" text should not appear for completed milestones
      const dueTexts = screen.queryAllByText(/^Due/);
      expect(dueTexts.length).toBe(0);
    });
  });

  describe("Completion Information", () => {
    it("should display completion info when milestone is completed with completion reason", () => {
      const milestone = createMockMilestone({
        status: "completed",
        details: {
          title: "Title",
          description: "Description",
          dueDate: futureDate(30),
          completionReason: "Successfully delivered all features",
          completionDate: "2025-01-15T00:00:00.000Z",
          completedBy: "0x1234567890",
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.getByTestId("milestone-completion-info")).toBeInTheDocument();
      expect(screen.getByTestId("completion-reason")).toHaveTextContent(
        "Successfully delivered all features"
      );
    });

    it("should not display completion info for pending milestones", () => {
      const milestone = createMockMilestone({
        status: "pending",
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.queryByTestId("milestone-completion-info")).not.toBeInTheDocument();
    });

    it("should not display completion info when completed but no completion reason", () => {
      const milestone = createMockMilestone({
        status: "completed",
        details: {
          title: "Title",
          description: "Description",
          dueDate: futureDate(30),
          completionReason: undefined,
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.queryByTestId("milestone-completion-info")).not.toBeInTheDocument();
    });
  });

  describe("Attribution", () => {
    it("should show createdAt date for pending milestones", () => {
      const milestone = createMockMilestone({
        status: "pending",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-15T00:00:00.000Z",
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      const attribution = screen.getByTestId("activity-attribution");
      expect(attribution).toBeInTheDocument();
      expect(screen.getByTestId("attribution-date")).toHaveTextContent("2025-01-01T00:00:00.000Z");
      expect(screen.getByTestId("attribution-completed")).toHaveTextContent("false");
    });

    it("should show updatedAt date for completed milestones", () => {
      const milestone = createMockMilestone({
        status: "completed",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-15T00:00:00.000Z",
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.getByTestId("attribution-date")).toHaveTextContent("2025-01-15T00:00:00.000Z");
      expect(screen.getByTestId("attribution-completed")).toHaveTextContent("true");
    });
  });

  describe("Links and Navigation", () => {
    it("should have proper external link attributes on project link", () => {
      const milestone = createMockMilestone();

      render(<CommunityMilestoneCard milestone={milestone} />);

      const projectLink = screen.getByText("Test Project").closest("a");
      expect(projectLink).toHaveAttribute("target", "_blank");
      expect(projectLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should have proper external link attributes on view milestone link", () => {
      const milestone = createMockMilestone();

      render(<CommunityMilestoneCard milestone={milestone} />);

      const viewLink = screen.getByText("View full milestone →");
      expect(viewLink).toHaveAttribute("target", "_blank");
      expect(viewLink).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Edge Cases", () => {
    it("should handle milestone due date just passed (1 second ago)", () => {
      // Create a milestone with due date set to 1 second ago
      const oneSecondAgo = new Date(Date.now() - 1000).toISOString();
      const milestone = createMockMilestone({
        status: "pending",
        details: {
          title: "Test",
          description: "Description",
          dueDate: oneSecondAgo,
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      // Should show as Past Due since due date has passed
      expect(screen.getByText("Past Due")).toBeInTheDocument();
    });

    it("should handle very old past due dates", () => {
      const milestone = createMockMilestone({
        status: "pending",
        details: {
          title: "Test",
          description: "Description",
          dueDate: "2020-01-01T00:00:00.000Z", // Very old date
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.getByText("Past Due")).toBeInTheDocument();
    });

    it("should handle future date far in the future", () => {
      const milestone = createMockMilestone({
        status: "pending",
        details: {
          title: "Test",
          description: "Description",
          dueDate: "2030-12-31T00:00:00.000Z", // Far future date
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("should handle empty grant details data gracefully", () => {
      const milestone = createMockMilestone({
        grant: {
          uid: "grant-123",
          details: {
            data: {
              title: "",
            },
          },
        },
      });

      render(<CommunityMilestoneCard milestone={milestone} />);

      // Should fall back to "Project Milestone" when title is empty
      expect(screen.getByText("Project Milestone")).toBeInTheDocument();
    });
  });

  describe("Memoization", () => {
    it("should be memoized (exported as memo component)", () => {
      // The component should be memoized to prevent unnecessary re-renders
      // This test verifies the export is the memoized version
      expect(CommunityMilestoneCard).toBeDefined();
      expect(typeof CommunityMilestoneCard).toBe("object"); // Memo returns an object
    });
  });
});
