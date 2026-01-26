/**
 * @file Tests for SettingsSidebar component
 * @description Tests the sidebar navigation for program settings
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SettingsSidebar,
  SIDEBAR_SECTIONS,
  type SidebarTabKey,
} from "@/components/FundingPlatform/Sidebar";
import "@testing-library/jest-dom";

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe("SettingsSidebar", () => {
  const defaultProps = {
    activeTab: "build" as SidebarTabKey,
    onTabChange: jest.fn(),
    communityId: "test-community",
    programId: "program-123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render all sidebar sections", () => {
      render(<SettingsSidebar {...defaultProps} />);

      // Check all section titles are rendered
      expect(screen.getByText("Setup")).toBeInTheDocument();
      expect(screen.getByText("Team")).toBeInTheDocument();
      expect(screen.getByText("Configuration")).toBeInTheDocument();
      expect(screen.getByText("Advanced")).toBeInTheDocument();
    });

    it("should render all navigation items", () => {
      render(<SettingsSidebar {...defaultProps} />);

      // Check all items are rendered
      expect(screen.getByText("Program Details")).toBeInTheDocument();
      expect(screen.getByText("Application Form")).toBeInTheDocument();
      expect(screen.getByText("Post-Approval Form")).toBeInTheDocument();
      expect(screen.getByText("Reviewers")).toBeInTheDocument();
      expect(screen.getByText("Email & Privacy")).toBeInTheDocument();
      expect(screen.getByText("AI Evaluation")).toBeInTheDocument();
    });

    it("should render the back link to programs page", () => {
      render(<SettingsSidebar {...defaultProps} />);

      const backLink = screen.getByRole("link", { name: /back to programs/i });
      expect(backLink).toHaveAttribute("href", "/community/test-community/admin/funding-platform");
    });

    it("should render program title when provided", () => {
      render(<SettingsSidebar {...defaultProps} programTitle="My Grant Program" />);

      expect(screen.getByText("My Grant Program")).toBeInTheDocument();
    });

    it("should not render program title when not provided", () => {
      render(<SettingsSidebar {...defaultProps} />);

      expect(screen.queryByText("My Grant Program")).not.toBeInTheDocument();
    });

    it("should mark required items with asterisk", () => {
      render(<SettingsSidebar {...defaultProps} />);

      // Application Form is the only required item
      const asterisks = screen.getAllByText("*");
      // One asterisk for the required item and one in the footer note
      expect(asterisks.length).toBeGreaterThanOrEqual(1);
    });

    it("should render the required note at the bottom", () => {
      render(<SettingsSidebar {...defaultProps} />);

      expect(screen.getByText(/required to enable program/i)).toBeInTheDocument();
    });
  });

  describe("active tab styling", () => {
    it("should highlight the active tab", () => {
      const { container } = render(<SettingsSidebar {...defaultProps} activeTab="build" />);

      // The active tab should have blue background
      const activeButton = container.querySelector(".bg-blue-50");
      expect(activeButton).toBeInTheDocument();
    });

    it("should change active tab highlighting when prop changes", () => {
      const { rerender, container } = render(
        <SettingsSidebar {...defaultProps} activeTab="build" />
      );

      // Get navigation button by name pattern
      const getNavButton = (name: RegExp) => {
        return screen.getByRole("button", { name });
      };

      // Initially build tab is active
      const buildButton = getNavButton(/application form/i);
      expect(buildButton?.className).toContain("bg-blue");

      // Change to reviewers tab
      rerender(<SettingsSidebar {...defaultProps} activeTab="reviewers" />);

      const reviewersButton = getNavButton(/reviewers/i);
      expect(reviewersButton?.className).toContain("bg-blue");
    });
  });

  describe("completed steps", () => {
    it("should show check marks for completed steps", () => {
      const completedSteps = new Set<SidebarTabKey>(["program-details", "build"]);

      render(<SettingsSidebar {...defaultProps} completedSteps={completedSteps} />);

      // Completed steps should have green icons (we'll check by class presence)
      // Since the active tab is "build", program-details should show as completed
      const { container } = render(
        <SettingsSidebar {...defaultProps} completedSteps={completedSteps} activeTab="settings" />
      );

      // Check for green icon classes on non-active completed items
      const greenIcons = container.querySelectorAll(".text-green-600");
      expect(greenIcons.length).toBeGreaterThan(0);
    });

    it("should not show check marks for incomplete steps", () => {
      const completedSteps = new Set<SidebarTabKey>(["program-details"]);

      const { container } = render(
        <SettingsSidebar {...defaultProps} completedSteps={completedSteps} activeTab="settings" />
      );

      // The reviewers tab should not have a green icon (it's not completed)
      const reviewersButton = screen.getByRole("button", { name: /reviewers/i });
      const parentContainer = reviewersButton?.parentElement;
      expect(parentContainer?.innerHTML).not.toContain("text-green-600");
    });
  });

  describe("tab navigation", () => {
    // Helper to get navigation button by name pattern
    const getNavButton = (name: RegExp) => {
      return screen.getByRole("button", { name });
    };

    it("should call onTabChange when a tab is clicked", async () => {
      const user = userEvent.setup();
      const onTabChange = jest.fn();

      render(<SettingsSidebar {...defaultProps} onTabChange={onTabChange} />);

      const reviewersButton = getNavButton(/reviewers/i);
      await user.click(reviewersButton);

      expect(onTabChange).toHaveBeenCalledWith("reviewers");
    });

    it("should call onTabChange with correct tab key for each item", async () => {
      const user = userEvent.setup();
      const onTabChange = jest.fn();

      render(<SettingsSidebar {...defaultProps} onTabChange={onTabChange} />);

      // Click on AI Evaluation
      await user.click(getNavButton(/ai evaluation/i));
      expect(onTabChange).toHaveBeenCalledWith("ai-config");

      // Click on Email & Privacy
      await user.click(getNavButton(/email & privacy/i));
      expect(onTabChange).toHaveBeenCalledWith("settings");

      // Click on Post-Approval Form
      await user.click(getNavButton(/post-approval form/i));
      expect(onTabChange).toHaveBeenCalledWith("post-approval");
    });
  });

  describe("SIDEBAR_SECTIONS constant", () => {
    it("should have 4 sections", () => {
      expect(SIDEBAR_SECTIONS).toHaveLength(4);
    });

    it("should have correct section titles", () => {
      const sectionTitles = SIDEBAR_SECTIONS.map((s) => s.title);
      expect(sectionTitles).toEqual(["Setup", "Team", "Configuration", "Advanced"]);
    });

    it("should have the required flag only on Application Form", () => {
      const allItems = SIDEBAR_SECTIONS.flatMap((s) => s.items);
      const requiredItems = allItems.filter((item) => item.required);

      expect(requiredItems).toHaveLength(1);
      expect(requiredItems[0].key).toBe("build");
    });
  });

  describe("accessibility", () => {
    it("should have navigation role", () => {
      render(<SettingsSidebar {...defaultProps} />);

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("should have list structure for navigation items", () => {
      render(<SettingsSidebar {...defaultProps} />);

      const lists = screen.getAllByRole("list");
      expect(lists.length).toBeGreaterThanOrEqual(4); // One per section
    });

    it("should render items as buttons for keyboard navigation", () => {
      render(<SettingsSidebar {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      // 6 navigation items (help tooltips were removed to keep sidebar clean)
      expect(buttons.length).toBe(6);

      // Verify all navigation buttons have proper text content
      const navButtons = buttons.filter((btn) => btn.querySelector(".text-sm"));
      expect(navButtons.length).toBe(6);
    });
  });

  describe("custom className", () => {
    it("should apply custom className", () => {
      const { container } = render(<SettingsSidebar {...defaultProps} className="custom-class" />);

      const sidebar = container.firstChild;
      expect(sidebar).toHaveClass("custom-class");
    });
  });
});
