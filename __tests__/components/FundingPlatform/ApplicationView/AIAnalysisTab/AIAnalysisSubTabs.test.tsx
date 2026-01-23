import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AIAnalysisSubTabs } from "@/components/FundingPlatform/ApplicationView/AIAnalysisTab/AIAnalysisSubTabs";

// Mock the cn utility
jest.mock("@/utilities/tailwind", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("AIAnalysisSubTabs", () => {
  describe("Rendering", () => {
    it("renders both tab buttons", () => {
      render(<AIAnalysisSubTabs activeTab="external" onTabChange={jest.fn()} />);

      expect(screen.getByText("External Evaluation")).toBeInTheDocument();
      expect(screen.getByText("Internal Evaluation")).toBeInTheDocument();
    });

    it("shows external tab as active by default", () => {
      render(<AIAnalysisSubTabs activeTab="external" onTabChange={jest.fn()} />);

      const externalButton = screen.getByText("External Evaluation").closest("button");
      expect(externalButton).toHaveClass("bg-white");
    });

    it("shows internal tab as active when selected", () => {
      render(<AIAnalysisSubTabs activeTab="internal" onTabChange={jest.fn()} />);

      const internalButton = screen.getByText("Internal Evaluation").closest("button");
      expect(internalButton).toHaveClass("bg-white");
    });
  });

  describe("Interaction", () => {
    it("calls onTabChange with 'external' when External tab is clicked", async () => {
      const user = userEvent.setup();
      const mockOnTabChange = jest.fn();

      render(<AIAnalysisSubTabs activeTab="internal" onTabChange={mockOnTabChange} />);

      await user.click(screen.getByText("External Evaluation"));

      expect(mockOnTabChange).toHaveBeenCalledWith("external");
    });

    it("calls onTabChange with 'internal' when Internal tab is clicked", async () => {
      const user = userEvent.setup();
      const mockOnTabChange = jest.fn();

      render(<AIAnalysisSubTabs activeTab="external" onTabChange={mockOnTabChange} />);

      await user.click(screen.getByText("Internal Evaluation"));

      expect(mockOnTabChange).toHaveBeenCalledWith("internal");
    });
  });

  describe("Icons", () => {
    it("renders icons for both tabs", () => {
      const { container } = render(
        <AIAnalysisSubTabs activeTab="external" onTabChange={jest.fn()} />
      );

      // Check that SVG icons are present
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBe(2);
    });

    it("applies purple color to internal icon when active", () => {
      const { container } = render(
        <AIAnalysisSubTabs activeTab="internal" onTabChange={jest.fn()} />
      );

      // The second button's icon should have purple styling
      const internalButton = screen.getByText("Internal Evaluation").closest("button");
      const icon = internalButton?.querySelector("svg");
      // SVG elements use classList in JSDOM
      expect(icon?.classList.toString()).toContain("text-purple-600");
    });
  });
});
