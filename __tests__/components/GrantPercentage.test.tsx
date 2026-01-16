import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { GrantPercentage } from "@/components/Pages/Project/Grants/components/GrantPercentage";
import "@testing-library/jest-dom";

// Mock formatPercentage utility
jest.mock("@/utilities/formatNumber", () => ({
  formatPercentage: jest.fn((value: number) => Math.round(value)),
}));

describe("GrantPercentage", () => {
  const mockGrantWithMilestones = {
    uid: "grant-1",
    milestones: [
      { uid: "m1", completed: true },
      { uid: "m2", completed: true },
      { uid: "m3", completed: false },
      { uid: "m4", completed: false },
    ],
    updates: [],
  };

  const mockGrantWithUpdates = {
    uid: "grant-2",
    milestones: [],
    updates: [
      {
        uid: "u1",
        createdAt: "2024-01-01",
        data: { completionPercentage: "75" },
      },
      {
        uid: "u2",
        createdAt: "2024-01-02",
        data: { completionPercentage: "85" },
      },
    ],
  };

  const mockGrantWithNoProgress = {
    uid: "grant-3",
    milestones: [],
    updates: [],
  };

  describe("Rendering", () => {
    it("should render percentage based on completed milestones", () => {
      render(<GrantPercentage grant={mockGrantWithMilestones as any} />);

      expect(screen.getByText("50% complete")).toBeInTheDocument();
    });

    it("should render percentage from latest update", () => {
      render(<GrantPercentage grant={mockGrantWithUpdates as any} />);

      expect(screen.getByText("85% complete")).toBeInTheDocument();
    });

    it("should not render when percentage is 0", () => {
      const { container } = render(<GrantPercentage grant={mockGrantWithNoProgress as any} />);

      expect(container.firstChild).toBeNull();
    });

    it("should have proper styling classes", () => {
      render(<GrantPercentage grant={mockGrantWithMilestones as any} />);

      const element = screen.getByText("50% complete").closest("div");
      expect(element).toHaveClass("bg-teal-50", "dark:bg-teal-700");
      expect(element).toHaveClass("text-teal-600", "dark:text-teal-200");
    });

    it("should have rounded-full styling", () => {
      render(<GrantPercentage grant={mockGrantWithMilestones as any} />);

      const element = screen.getByText("50% complete").closest("div");
      expect(element).toHaveClass("rounded-full");
    });

    it("should apply custom className to span", () => {
      render(<GrantPercentage grant={mockGrantWithMilestones as any} className="custom-class" />);

      const span = screen.getByText("50% complete");
      expect(span).toHaveClass("custom-class");
    });
  });

  describe("Percentage Calculation", () => {
    it("should calculate 50% for 2 of 4 milestones completed", () => {
      render(<GrantPercentage grant={mockGrantWithMilestones as any} />);

      expect(screen.getByText("50% complete")).toBeInTheDocument();
    });

    it("should calculate 100% when all milestones completed", () => {
      const allCompleted = {
        ...mockGrantWithMilestones,
        milestones: mockGrantWithMilestones.milestones.map((m) => ({
          ...m,
          completed: true,
        })),
      };

      render(<GrantPercentage grant={allCompleted as any} />);

      expect(screen.getByText("100% complete")).toBeInTheDocument();
    });

    it("should return 0 when no milestones are completed", () => {
      const noneCompleted = {
        ...mockGrantWithMilestones,
        milestones: mockGrantWithMilestones.milestones.map((m) => ({
          ...m,
          completed: false,
        })),
      };

      const { container } = render(<GrantPercentage grant={noneCompleted as any} />);

      expect(container.firstChild).toBeNull();
    });

    it("should prioritize manual percentage from updates over milestones", () => {
      const grantWithBoth = {
        ...mockGrantWithMilestones,
        updates: mockGrantWithUpdates.updates,
      };

      render(<GrantPercentage grant={grantWithBoth as any} />);

      // Should use update percentage (85) instead of milestone percentage (50)
      expect(screen.getByText("85% complete")).toBeInTheDocument();
    });

    it("should use most recent update when multiple updates exist", () => {
      render(<GrantPercentage grant={mockGrantWithUpdates as any} />);

      // Latest update (2024-01-02) has 85%
      expect(screen.getByText("85% complete")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty milestones array", () => {
      const emptyMilestones = {
        uid: "grant",
        milestones: [],
        updates: [],
      };

      const { container } = render(<GrantPercentage grant={emptyMilestones as any} />);

      expect(container.firstChild).toBeNull();
    });

    it("should handle undefined milestones", () => {
      const noMilestones = {
        uid: "grant",
        updates: [],
      };

      const { container } = render(<GrantPercentage grant={noMilestones as any} />);

      expect(container.firstChild).toBeNull();
    });

    it("should handle NaN completion percentage gracefully", () => {
      const invalidPercentage = {
        uid: "grant",
        milestones: [],
        updates: [
          {
            uid: "u1",
            createdAt: "2024-01-01",
            data: { completionPercentage: "invalid" },
          },
        ],
      };

      const { container } = render(<GrantPercentage grant={invalidPercentage as any} />);

      expect(container.firstChild).toBeNull();
    });

    it("should handle updates without completion percentage", () => {
      const noPercentage = {
        uid: "grant",
        milestones: [{ uid: "m1", completed: true }],
        updates: [
          {
            uid: "u1",
            createdAt: "2024-01-01",
            data: {},
          },
        ],
      };

      render(<GrantPercentage grant={noPercentage as any} />);

      // Should fall back to milestone calculation (100%)
      expect(screen.getByText("100% complete")).toBeInTheDocument();
    });

    it("should handle single milestone", () => {
      const singleMilestone = {
        uid: "grant",
        milestones: [{ uid: "m1", completed: true }],
        updates: [],
      };

      render(<GrantPercentage grant={singleMilestone as any} />);

      expect(screen.getByText("100% complete")).toBeInTheDocument();
    });
  });

  describe("Update Sorting", () => {
    it("should use the latest update by date", () => {
      const updates = {
        uid: "grant",
        milestones: [],
        updates: [
          {
            uid: "u1",
            createdAt: "2024-01-01",
            data: { completionPercentage: "25" },
          },
          {
            uid: "u2",
            createdAt: "2024-01-03",
            data: { completionPercentage: "75" },
          },
          {
            uid: "u3",
            createdAt: "2024-01-02",
            data: { completionPercentage: "50" },
          },
        ],
      };

      render(<GrantPercentage grant={updates as any} />);

      // Should use u2 (2024-01-03) with 75%
      expect(screen.getByText("75% complete")).toBeInTheDocument();
    });

    it("should skip updates without valid completion percentage", () => {
      const mixedUpdates = {
        uid: "grant",
        milestones: [],
        updates: [
          {
            uid: "u1",
            createdAt: "2024-01-03",
            data: {},
          },
          {
            uid: "u2",
            createdAt: "2024-01-02",
            data: { completionPercentage: "60" },
          },
        ],
      };

      render(<GrantPercentage grant={mixedUpdates as any} />);

      // Should skip u1 and use u2
      expect(screen.getByText("60% complete")).toBeInTheDocument();
    });
  });

  describe("Dark Mode Support", () => {
    it("should have dark mode background class", () => {
      render(<GrantPercentage grant={mockGrantWithMilestones as any} />);

      const element = screen.getByText("50% complete").closest("div");
      expect(element).toHaveClass("dark:bg-teal-700");
    });

    it("should have dark mode text color class", () => {
      render(<GrantPercentage grant={mockGrantWithMilestones as any} />);

      const element = screen.getByText("50% complete").closest("div");
      expect(element).toHaveClass("dark:text-teal-200");
    });
  });

  describe("Responsive Styling", () => {
    it("should have responsive padding", () => {
      render(<GrantPercentage grant={mockGrantWithMilestones as any} />);

      const element = screen.getByText("50% complete").closest("div");
      expect(element).toHaveClass("max-2xl:px-2");
    });

    it("should have proper sizing classes", () => {
      render(<GrantPercentage grant={mockGrantWithMilestones as any} />);

      const element = screen.getByText("50% complete").closest("div");
      expect(element).toHaveClass("h-max", "w-max");
    });
  });

  describe("Memoization", () => {
    it("should recalculate percentage when grant changes", () => {
      const { rerender } = render(<GrantPercentage grant={mockGrantWithMilestones as any} />);

      expect(screen.getByText("50% complete")).toBeInTheDocument();

      rerender(<GrantPercentage grant={mockGrantWithUpdates as any} />);

      expect(screen.getByText("85% complete")).toBeInTheDocument();
    });
  });
});
