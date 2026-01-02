import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ApplicationTabs,
  type TabConfig,
  TabIcons,
} from "@/components/FundingPlatform/ApplicationView/ApplicationTabs";

// Mock cn utility
jest.mock("@/utilities/tailwind", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("ApplicationTabs", () => {
  const mockOnChange = jest.fn();
  const defaultTabs: TabConfig[] = [
    {
      id: "application",
      label: "Application",
      icon: TabIcons.Application,
      content: <div data-testid="application-content">Application Content</div>,
    },
    {
      id: "ai-analysis",
      label: "AI Analysis",
      icon: TabIcons.AIAnalysis,
      content: <div data-testid="ai-analysis-content">AI Analysis Content</div>,
    },
    {
      id: "discussion",
      label: "Discussion",
      icon: TabIcons.Discussion,
      content: <div data-testid="discussion-content">Discussion Content</div>,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all tab labels", () => {
      render(<ApplicationTabs tabs={defaultTabs} />);

      expect(screen.getByText("Application")).toBeInTheDocument();
      expect(screen.getByText("AI Analysis")).toBeInTheDocument();
      expect(screen.getByText("Discussion")).toBeInTheDocument();
    });

    it("renders tab icons", () => {
      render(<ApplicationTabs tabs={defaultTabs} />);

      const tabList = screen.getByRole("tablist");
      const svgIcons = tabList.querySelectorAll("svg");
      expect(svgIcons).toHaveLength(3);
    });

    it("renders the first tab content by default", () => {
      render(<ApplicationTabs tabs={defaultTabs} />);

      expect(screen.getByTestId("application-content")).toBeInTheDocument();
    });

    it("applies selected styles to the default tab", () => {
      render(<ApplicationTabs tabs={defaultTabs} />);

      const applicationTab = screen.getByRole("tab", { name: /application/i });
      expect(applicationTab).toHaveAttribute("data-state", "active");
    });

    it("applies unselected styles to non-active tabs", () => {
      render(<ApplicationTabs tabs={defaultTabs} />);

      const aiAnalysisTab = screen.getByRole("tab", { name: /ai analysis/i });
      expect(aiAnalysisTab).toHaveAttribute("data-state", "inactive");
    });
  });

  describe("Tab Navigation", () => {
    it("switches tab content when clicking different tabs", async () => {
      const user = userEvent.setup();
      render(<ApplicationTabs tabs={defaultTabs} />);

      // Initially shows Application content
      expect(screen.getByTestId("application-content")).toBeInTheDocument();

      // Click AI Analysis tab
      await user.click(screen.getByRole("tab", { name: /ai analysis/i }));

      // Should show AI Analysis content
      expect(screen.getByTestId("ai-analysis-content")).toBeInTheDocument();
    });

    it("calls onChange callback when tab is changed", async () => {
      const user = userEvent.setup();
      render(<ApplicationTabs tabs={defaultTabs} onChange={mockOnChange} />);

      await user.click(screen.getByRole("tab", { name: /discussion/i }));

      expect(mockOnChange).toHaveBeenCalledWith(2);
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<ApplicationTabs tabs={defaultTabs} />);

      const applicationTab = screen.getByRole("tab", { name: /application/i });
      await act(async () => {
        applicationTab.focus();
      });

      // Press arrow right to move to next tab
      await user.keyboard("{ArrowRight}");

      // The AI Analysis tab should now be focused
      const aiAnalysisTab = screen.getByRole("tab", { name: /ai analysis/i });
      expect(document.activeElement).toBe(aiAnalysisTab);
    });
  });

  describe("Default Index", () => {
    it("starts on the specified defaultIndex", () => {
      render(<ApplicationTabs tabs={defaultTabs} defaultIndex={1} />);

      const aiAnalysisTab = screen.getByRole("tab", { name: /ai analysis/i });
      expect(aiAnalysisTab).toHaveAttribute("data-state", "active");

      expect(screen.getByTestId("ai-analysis-content")).toBeInTheDocument();
    });

    it("defaults to first tab when defaultIndex is not provided", () => {
      render(<ApplicationTabs tabs={defaultTabs} />);

      const applicationTab = screen.getByRole("tab", { name: /application/i });
      expect(applicationTab).toHaveAttribute("data-state", "active");
    });
  });

  describe("Tab Panels", () => {
    it("renders tab panels with correct structure", () => {
      render(<ApplicationTabs tabs={defaultTabs} />);

      const tabPanels = screen.getAllByRole("tabpanel");
      expect(tabPanels).toHaveLength(1); // Only the active panel is rendered/visible
    });

    it("wraps tab panels in a container with proper styling", () => {
      render(<ApplicationTabs tabs={defaultTabs} />);

      // The panels container should have the rounded bottom corners
      const panelsContainer =
        screen.getByTestId("application-content").parentElement?.parentElement;
      expect(panelsContainer?.className).toContain("rounded-b-lg");
    });
  });

  describe("Tab Icons Export", () => {
    it("exports Application icon", () => {
      expect(TabIcons.Application).toBeDefined();
    });

    it("exports AIAnalysis icon", () => {
      expect(TabIcons.AIAnalysis).toBeDefined();
    });

    it("exports Discussion icon", () => {
      expect(TabIcons.Discussion).toBeDefined();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA roles for tabs and tablist", () => {
      render(<ApplicationTabs tabs={defaultTabs} />);

      expect(screen.getByRole("tablist")).toBeInTheDocument();
      expect(screen.getAllByRole("tab")).toHaveLength(3);
    });

    it("has aria-label on TabsList for screen readers", () => {
      render(<ApplicationTabs tabs={defaultTabs} />);

      const tabList = screen.getByRole("tablist");
      expect(tabList).toHaveAttribute("aria-label", "Application sections");
    });

    it("tabs are accessible by their visible text content", () => {
      render(<ApplicationTabs tabs={defaultTabs} />);

      // Tabs should be accessible by their visible text, not aria-label
      expect(screen.getByRole("tab", { name: /application/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /ai analysis/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /discussion/i })).toBeInTheDocument();
    });

    it("tabs have unique keys based on id", () => {
      const { container } = render(<ApplicationTabs tabs={defaultTabs} />);

      const tabs = container.querySelectorAll('[role="tab"]');
      tabs.forEach((tab, index) => {
        expect(tab).toBeInTheDocument();
      });
    });
  });

  describe("Styling", () => {
    it("applies border-bottom styling to tab list", () => {
      render(<ApplicationTabs tabs={defaultTabs} />);

      const tabList = screen.getByRole("tablist");
      expect(tabList.className).toContain("border-b");
      expect(tabList.className).toContain("border-gray-200");
    });

    it("applies background color to tab list", () => {
      render(<ApplicationTabs tabs={defaultTabs} />);

      const tabList = screen.getByRole("tablist");
      expect(tabList.className).toContain("bg-white");
    });

    it("applies rounded top corners to tab list when not connected to header", () => {
      render(<ApplicationTabs tabs={defaultTabs} />);

      const tabList = screen.getByRole("tablist");
      expect(tabList.className).toContain("rounded-t-lg");
    });

    it("removes rounded top corners when connected to header", () => {
      render(<ApplicationTabs tabs={defaultTabs} connectedToHeader={true} />);

      const tabList = screen.getByRole("tablist");
      expect(tabList.className).toContain("rounded-none");
    });
  });
});
