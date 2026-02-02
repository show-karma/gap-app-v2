import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ReactNode } from "react";
import { VerificationBadge } from "../icons/VerificationBadge";

// Mock the InfoTooltip component to capture its props
const mockInfoTooltip = jest.fn();
jest.mock("@/components/Utilities/InfoTooltip", () => ({
  InfoTooltip: ({ content, children, ...props }: { content: ReactNode; children: ReactNode }) => {
    mockInfoTooltip({ content, ...props });
    return (
      <div data-testid="info-tooltip" data-content={String(content)}>
        {children}
      </div>
    );
  },
}));

describe("VerificationBadge", () => {
  beforeEach(() => {
    mockInfoTooltip.mockClear();
  });

  describe("Rendering", () => {
    it("should render the badge icon", () => {
      render(<VerificationBadge data-testid="badge" />);

      expect(screen.getByTestId("badge")).toBeInTheDocument();
    });

    it("should apply custom className to the badge icon", () => {
      render(<VerificationBadge data-testid="badge" className="h-8 w-8" />);

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("h-8");
      expect(badge).toHaveClass("w-8");
    });

    it("should have proper accessibility attributes", () => {
      render(<VerificationBadge data-testid="badge" aria-label="Project is verified" />);

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute("aria-label", "Project is verified");
      expect(badge).toHaveAttribute("role", "img");
    });

    it("should have shrink-0 class to prevent shrinking", () => {
      render(<VerificationBadge data-testid="badge" />);

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("shrink-0");
    });
  });

  describe("Tooltip", () => {
    it("should render with tooltip wrapper by default", () => {
      render(<VerificationBadge data-testid="badge" />);

      // The badge should be wrapped in InfoTooltip
      expect(screen.getByTestId("info-tooltip")).toBeInTheDocument();
    });

    it("should pass default tooltip text to InfoTooltip", () => {
      render(<VerificationBadge data-testid="badge" />);

      expect(mockInfoTooltip).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "This project has received grant funding",
        })
      );
    });

    it("should pass custom tooltip text when provided", () => {
      render(<VerificationBadge data-testid="badge" tooltipText="Custom verification message" />);

      expect(mockInfoTooltip).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Custom verification message",
        })
      );
    });

    it("should pass correct props to InfoTooltip", () => {
      render(<VerificationBadge data-testid="badge" />);

      expect(mockInfoTooltip).toHaveBeenCalledWith(
        expect.objectContaining({
          side: "bottom",
          align: "center",
          delayDuration: 200,
          triggerAsChild: true,
        })
      );
    });

    it("should not render tooltip when showTooltip is false", () => {
      render(<VerificationBadge data-testid="badge" showTooltip={false} />);

      // When showTooltip is false, InfoTooltip should not be rendered
      expect(screen.queryByTestId("info-tooltip")).not.toBeInTheDocument();
      // But the badge should still render
      expect(screen.getByTestId("badge")).toBeInTheDocument();
    });

    it("should wrap badge in span with cursor-help class when tooltip is shown", () => {
      render(<VerificationBadge data-testid="badge" />);

      const badge = screen.getByTestId("badge");
      const wrapper = badge.closest("span");
      expect(wrapper).toHaveClass("inline-flex");
      expect(wrapper).toHaveClass("cursor-help");
    });

    it("should not wrap badge in span when showTooltip is false", () => {
      render(<VerificationBadge data-testid="badge" showTooltip={false} />);

      const badge = screen.getByTestId("badge");
      // When tooltip is disabled, badge is not wrapped in a span
      expect(badge.parentElement?.tagName).toBe("DIV"); // Direct child of render container
    });
  });

  describe("Default aria-label", () => {
    it("should have default aria-label when not provided", () => {
      render(<VerificationBadge data-testid="badge" />);

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute("aria-label", "Verified project");
    });

    it("should override aria-label when custom value provided", () => {
      render(<VerificationBadge data-testid="badge" aria-label="Custom label" />);

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute("aria-label", "Custom label");
    });
  });

  describe("SVG Structure", () => {
    it("should render SVG with correct viewBox", () => {
      render(<VerificationBadge data-testid="badge" />);

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute("viewBox", "0 0 24 24");
    });

    it("should render SVG with correct dimensions", () => {
      render(<VerificationBadge data-testid="badge" />);

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute("width", "24");
      expect(badge).toHaveAttribute("height", "24");
    });

    it("should have no fill on SVG", () => {
      render(<VerificationBadge data-testid="badge" />);

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute("fill", "none");
    });
  });
});
