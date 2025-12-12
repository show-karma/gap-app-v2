import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationSubTabs } from "@/components/FundingPlatform/ApplicationView/ApplicationTab/ApplicationSubTabs";

// Mock cn utility
jest.mock("@/utilities/tailwind", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("ApplicationSubTabs", () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders Application tab by default", () => {
      render(
        <ApplicationSubTabs
          activeTab="application"
          onTabChange={mockOnTabChange}
          showPostApproval={false}
        />
      );

      expect(screen.getByText("Application")).toBeInTheDocument();
    });

    it("does not render Post Approval tab when showPostApproval is false", () => {
      render(
        <ApplicationSubTabs
          activeTab="application"
          onTabChange={mockOnTabChange}
          showPostApproval={false}
        />
      );

      expect(screen.queryByText("Post Approval")).not.toBeInTheDocument();
    });

    it("renders Post Approval tab when showPostApproval is true", () => {
      render(
        <ApplicationSubTabs
          activeTab="application"
          onTabChange={mockOnTabChange}
          showPostApproval={true}
        />
      );

      expect(screen.getByText("Application")).toBeInTheDocument();
      expect(screen.getByText("Post Approval")).toBeInTheDocument();
    });
  });

  describe("Active State", () => {
    it("applies active styles to Application tab when active", () => {
      render(
        <ApplicationSubTabs
          activeTab="application"
          onTabChange={mockOnTabChange}
          showPostApproval={true}
        />
      );

      const applicationTab = screen.getByText("Application").closest("button");
      expect(applicationTab?.className).toContain("bg-white");
      expect(applicationTab?.className).toContain("shadow-sm");
    });

    it("applies active styles to Post Approval tab when active", () => {
      render(
        <ApplicationSubTabs
          activeTab="post-approval"
          onTabChange={mockOnTabChange}
          showPostApproval={true}
        />
      );

      const postApprovalTab = screen.getByText("Post Approval").closest("button");
      expect(postApprovalTab?.className).toContain("bg-white");
      expect(postApprovalTab?.className).toContain("shadow-sm");
    });

    it("applies inactive styles to non-active tabs", () => {
      render(
        <ApplicationSubTabs
          activeTab="application"
          onTabChange={mockOnTabChange}
          showPostApproval={true}
        />
      );

      const postApprovalTab = screen.getByText("Post Approval").closest("button");
      expect(postApprovalTab?.className).toContain("text-gray-600");
    });
  });

  describe("Interactions", () => {
    it("calls onTabChange with 'application' when Application tab is clicked", async () => {
      const user = userEvent.setup();
      render(
        <ApplicationSubTabs
          activeTab="post-approval"
          onTabChange={mockOnTabChange}
          showPostApproval={true}
        />
      );

      await user.click(screen.getByText("Application"));
      expect(mockOnTabChange).toHaveBeenCalledWith("application");
    });

    it("calls onTabChange with 'post-approval' when Post Approval tab is clicked", async () => {
      const user = userEvent.setup();
      render(
        <ApplicationSubTabs
          activeTab="application"
          onTabChange={mockOnTabChange}
          showPostApproval={true}
        />
      );

      await user.click(screen.getByText("Post Approval"));
      expect(mockOnTabChange).toHaveBeenCalledWith("post-approval");
    });
  });

  describe("Accessibility", () => {
    it("renders buttons with type='button'", () => {
      render(
        <ApplicationSubTabs
          activeTab="application"
          onTabChange={mockOnTabChange}
          showPostApproval={true}
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("type", "button");
      });
    });
  });
});
