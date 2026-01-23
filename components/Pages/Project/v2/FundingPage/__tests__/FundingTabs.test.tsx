import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FundingTabs } from "../FundingTabs";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-123" }),
}));

describe("FundingTabs", () => {
  describe("Rendering", () => {
    it("should render funding tabs container", () => {
      render(<FundingTabs />);

      expect(screen.getByTestId("funding-tabs")).toBeInTheDocument();
    });

    it("should render all navigation tabs", () => {
      render(<FundingTabs />);

      expect(screen.getByTestId("tab-updates")).toBeInTheDocument();
      expect(screen.getByTestId("tab-about")).toBeInTheDocument();
      expect(screen.getByTestId("tab-funding")).toBeInTheDocument();
      expect(screen.getByTestId("tab-impact")).toBeInTheDocument();
      expect(screen.getByTestId("tab-team")).toBeInTheDocument();
    });

    it("should display correct tab labels", () => {
      render(<FundingTabs />);

      expect(screen.getByText("Updates")).toBeInTheDocument();
      expect(screen.getByText("About")).toBeInTheDocument();
      expect(screen.getByText("Funding")).toBeInTheDocument();
      expect(screen.getByText("Impact")).toBeInTheDocument();
      expect(screen.getByText("Team")).toBeInTheDocument();
    });
  });

  describe("Active state", () => {
    it("should mark funding tab as active", () => {
      render(<FundingTabs />);

      const fundingTab = screen.getByTestId("tab-funding");
      expect(fundingTab).toHaveAttribute("aria-selected", "true");
    });

    it("should mark other tabs as inactive", () => {
      render(<FundingTabs />);

      expect(screen.getByTestId("tab-updates")).toHaveAttribute("aria-selected", "false");
      expect(screen.getByTestId("tab-about")).toHaveAttribute("aria-selected", "false");
      expect(screen.getByTestId("tab-impact")).toHaveAttribute("aria-selected", "false");
      expect(screen.getByTestId("tab-team")).toHaveAttribute("aria-selected", "false");
    });

    it("should have aria-current on funding tab", () => {
      render(<FundingTabs />);

      const fundingTab = screen.getByTestId("tab-funding");
      expect(fundingTab).toHaveAttribute("aria-current", "page");
    });
  });

  describe("Count badges", () => {
    it("should display funding count when provided", () => {
      render(<FundingTabs fundingCount={5} />);

      expect(screen.getByTestId("tab-funding-count")).toBeInTheDocument();
      expect(screen.getByTestId("tab-funding-count")).toHaveTextContent("5");
    });

    it("should display team count when provided", () => {
      render(<FundingTabs teamCount={3} />);

      expect(screen.getByTestId("tab-team-count")).toBeInTheDocument();
      expect(screen.getByTestId("tab-team-count")).toHaveTextContent("3");
    });

    it("should not display badge when count is 0", () => {
      render(<FundingTabs fundingCount={0} teamCount={0} />);

      expect(screen.queryByTestId("tab-funding-count")).not.toBeInTheDocument();
      expect(screen.queryByTestId("tab-team-count")).not.toBeInTheDocument();
    });

    it("should not display badge when count is undefined", () => {
      render(<FundingTabs />);

      expect(screen.queryByTestId("tab-funding-count")).not.toBeInTheDocument();
      expect(screen.queryByTestId("tab-team-count")).not.toBeInTheDocument();
    });
  });

  describe("Navigation links", () => {
    it("should have correct href for updates tab", () => {
      render(<FundingTabs />);

      const updatesTab = screen.getByTestId("tab-updates");
      expect(updatesTab).toHaveAttribute("href", "/project/test-project-123");
    });

    it("should have correct href for about tab", () => {
      render(<FundingTabs />);

      const aboutTab = screen.getByTestId("tab-about");
      expect(aboutTab).toHaveAttribute("href", "/project/test-project-123/about");
    });

    it("should have correct href for funding tab", () => {
      render(<FundingTabs />);

      const fundingTab = screen.getByTestId("tab-funding");
      expect(fundingTab).toHaveAttribute("href", "/project/test-project-123/funding");
    });

    it("should have correct href for impact tab", () => {
      render(<FundingTabs />);

      const impactTab = screen.getByTestId("tab-impact");
      expect(impactTab).toHaveAttribute("href", "/project/test-project-123/impact");
    });

    it("should have correct href for team tab", () => {
      render(<FundingTabs />);

      const teamTab = screen.getByTestId("tab-team");
      expect(teamTab).toHaveAttribute("href", "/project/test-project-123/team");
    });
  });

  describe("Accessibility", () => {
    it("should have tablist role on container", () => {
      render(<FundingTabs />);

      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    it("should have tab role on each tab link", () => {
      render(<FundingTabs />);

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(5);
    });

    it("should have aria-label on tablist", () => {
      render(<FundingTabs />);

      expect(screen.getByRole("tablist")).toHaveAttribute("aria-label", "Project sections");
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<FundingTabs className="custom-class" />);

      expect(screen.getByTestId("funding-tabs")).toHaveClass("custom-class");
    });
  });
});
