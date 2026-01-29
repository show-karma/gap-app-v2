import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProjectNavigationTabs } from "../Navigation/ProjectNavigationTabs";

// Mock next/navigation
const mockPathname = "/project/test-project-123";
jest.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-123" }),
  usePathname: () => mockPathname,
}));

describe("ProjectNavigationTabs", () => {
  describe("Rendering", () => {
    it("should render the navigation tabs container", () => {
      render(<ProjectNavigationTabs />);

      expect(screen.getByTestId("project-navigation-tabs")).toBeInTheDocument();
    });

    it("should render the tabs list", () => {
      render(<ProjectNavigationTabs />);

      expect(screen.getByTestId("navigation-tabs-list")).toBeInTheDocument();
    });

    it("should render all navigation tabs", () => {
      render(<ProjectNavigationTabs />);

      expect(screen.getByTestId("nav-tab-updates")).toBeInTheDocument();
      expect(screen.getByTestId("nav-tab-about")).toBeInTheDocument();
      expect(screen.getByTestId("nav-tab-funding")).toBeInTheDocument();
      expect(screen.getByTestId("nav-tab-impact")).toBeInTheDocument();
      expect(screen.getByTestId("nav-tab-team")).toBeInTheDocument();
    });

    it("should render tab labels", () => {
      render(<ProjectNavigationTabs />);

      expect(screen.getByText("Updates")).toBeInTheDocument();
      expect(screen.getByText("About")).toBeInTheDocument();
      expect(screen.getByText("Funding")).toBeInTheDocument();
      expect(screen.getByText("Impact")).toBeInTheDocument();
      expect(screen.getByText("Team")).toBeInTheDocument();
    });
  });

  describe("Navigation Links", () => {
    it("should have correct href for Updates tab", () => {
      render(<ProjectNavigationTabs />);

      const updatesTab = screen.getByTestId("nav-tab-updates");
      expect(updatesTab).toHaveAttribute("href", "/project/test-project-123");
    });

    it("should have correct href for About tab", () => {
      render(<ProjectNavigationTabs />);

      const aboutTab = screen.getByTestId("nav-tab-about");
      expect(aboutTab).toHaveAttribute("href", "/project/test-project-123/about");
    });

    it("should have correct href for Funding tab", () => {
      render(<ProjectNavigationTabs />);

      const fundingTab = screen.getByTestId("nav-tab-funding");
      expect(fundingTab).toHaveAttribute("href", "/project/test-project-123/funding");
    });

    it("should have correct href for Impact tab", () => {
      render(<ProjectNavigationTabs />);

      const impactTab = screen.getByTestId("nav-tab-impact");
      expect(impactTab).toHaveAttribute("href", "/project/test-project-123/impact");
    });

    it("should have correct href for Team tab", () => {
      render(<ProjectNavigationTabs />);

      const teamTab = screen.getByTestId("nav-tab-team");
      expect(teamTab).toHaveAttribute("href", "/project/test-project-123/team");
    });
  });

  describe("Active State", () => {
    it("should mark Updates tab as active on main page", () => {
      render(<ProjectNavigationTabs />);

      const updatesTab = screen.getByTestId("nav-tab-updates");
      expect(updatesTab).toHaveAttribute("data-state", "active");
      expect(updatesTab).toHaveAttribute("aria-selected", "true");
    });

    it("should mark other tabs as inactive on main page", () => {
      render(<ProjectNavigationTabs />);

      const teamTab = screen.getByTestId("nav-tab-team");
      expect(teamTab).toHaveAttribute("data-state", "inactive");
      expect(teamTab).toHaveAttribute("aria-selected", "false");
    });
  });

  describe("Counts", () => {
    it("should display funding count when provided", () => {
      render(<ProjectNavigationTabs fundingCount={5} />);

      expect(screen.getByTestId("nav-tab-funding-count")).toHaveTextContent("5");
    });

    it("should display team count when provided", () => {
      render(<ProjectNavigationTabs teamCount={3} />);

      expect(screen.getByTestId("nav-tab-team-count")).toHaveTextContent("3");
    });

    it("should not display count badge when count is 0", () => {
      render(<ProjectNavigationTabs fundingCount={0} teamCount={0} />);

      expect(screen.queryByTestId("nav-tab-funding-count")).not.toBeInTheDocument();
      expect(screen.queryByTestId("nav-tab-team-count")).not.toBeInTheDocument();
    });

    it("should not display count badge when count is not provided", () => {
      render(<ProjectNavigationTabs />);

      expect(screen.queryByTestId("nav-tab-funding-count")).not.toBeInTheDocument();
      expect(screen.queryByTestId("nav-tab-team-count")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have navigation role", () => {
      render(<ProjectNavigationTabs />);

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("should have aria-label for navigation", () => {
      render(<ProjectNavigationTabs />);

      expect(screen.getByLabelText("Project navigation")).toBeInTheDocument();
    });

    it("should have tablist role for tabs container", () => {
      render(<ProjectNavigationTabs />);

      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    it("should have tab role for each tab", () => {
      render(<ProjectNavigationTabs />);

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(5);
    });

    it("should have proper aria-selected state", () => {
      render(<ProjectNavigationTabs />);

      const updatesTab = screen.getByTestId("nav-tab-updates");
      const teamTab = screen.getByTestId("nav-tab-team");

      expect(updatesTab).toHaveAttribute("aria-selected", "true");
      expect(teamTab).toHaveAttribute("aria-selected", "false");
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<ProjectNavigationTabs className="custom-class" />);

      expect(screen.getByTestId("project-navigation-tabs")).toHaveClass("custom-class");
    });
  });
});

// NOTE: Team page active state test is covered by ProjectTeamPage tests
// which verify the correct active tab when rendering the team page.
