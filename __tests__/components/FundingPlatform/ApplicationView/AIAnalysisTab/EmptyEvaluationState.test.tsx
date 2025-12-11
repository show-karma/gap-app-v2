import { render, screen } from "@testing-library/react";
import { EmptyEvaluationState } from "@/components/FundingPlatform/ApplicationView/AIAnalysisTab/EmptyEvaluationState";

describe("EmptyEvaluationState", () => {
  describe("Rendering", () => {
    it("renders with default props", () => {
      render(<EmptyEvaluationState />);

      expect(screen.getByText("No AI Evaluation Yet")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Run an AI evaluation to get automated feedback and analysis of this application."
        )
      ).toBeInTheDocument();
    });

    it("renders with custom title", () => {
      render(<EmptyEvaluationState title="Custom Title" />);

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
    });

    it("renders with custom description", () => {
      render(<EmptyEvaluationState description="Custom description text" />);

      expect(screen.getByText("Custom description text")).toBeInTheDocument();
    });

    it("renders with both custom title and description", () => {
      render(<EmptyEvaluationState title="My Title" description="My description" />);

      expect(screen.getByText("My Title")).toBeInTheDocument();
      expect(screen.getByText("My description")).toBeInTheDocument();
    });

    it("renders the sparkles icon", () => {
      render(<EmptyEvaluationState />);

      // The icon should be present (we check for the SVG element)
      const container = screen.getByText("No AI Evaluation Yet").closest("div");
      expect(container?.parentElement?.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("Actions", () => {
    it("renders action buttons when provided", () => {
      render(
        <EmptyEvaluationState
          actions={
            <>
              <button type="button">Run Evaluation</button>
              <button type="button">Run Internal</button>
            </>
          }
        />
      );

      expect(screen.getByText("Run Evaluation")).toBeInTheDocument();
      expect(screen.getByText("Run Internal")).toBeInTheDocument();
    });

    it("does not render actions container when no actions provided", () => {
      render(<EmptyEvaluationState />);

      // There should be no flex container for actions
      const container = screen.getByText("No AI Evaluation Yet").closest("div")?.parentElement;
      const actionsContainer = container?.querySelector(".flex.items-center.justify-center.gap-3");
      expect(actionsContainer).not.toBeInTheDocument();
    });

    it("renders single action button", () => {
      render(<EmptyEvaluationState actions={<button type="button">Single Action</button>} />);

      expect(screen.getByText("Single Action")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("has correct container classes", () => {
      const { container } = render(<EmptyEvaluationState />);

      // The outermost div should have the styling classes
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv).toHaveClass("bg-gray-50", "rounded-lg", "border", "p-8", "text-center");
    });
  });
});
