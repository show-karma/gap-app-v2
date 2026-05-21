import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EvaluationDisplay } from "@/components/FundingPlatform/ApplicationView/EvaluationComponents";
import {
  getPriorityColor,
  getScoreColor,
  getScoreIcon,
  getStatusColor,
  parseEvaluation,
} from "@/components/FundingPlatform/ApplicationView/evaluationUtils";
import { InternalAIEvaluationDisplay } from "@/components/FundingPlatform/ApplicationView/InternalAIEvaluation";

// Mock dependencies
vi.mock("@/components/FundingPlatform/ApplicationView/evaluationUtils", () => ({
  parseEvaluation: vi.fn(),
  getScoreColor: vi.fn(),
  getScoreIcon: vi.fn(),
  getPriorityColor: vi.fn(),
  getStatusColor: vi.fn(),
}));

vi.mock("@/components/FundingPlatform/ApplicationView/EvaluationComponents", () => ({
  EvaluationDisplay: vi.fn(({ footerDisclaimer }) => (
    <div data-testid="evaluation-display">
      {footerDisclaimer && <div data-testid="footer-disclaimer">{footerDisclaimer}</div>}
    </div>
  )),
}));

vi.mock("@heroicons/react/24/outline", () => ({
  ChevronDownIcon: (props: any) => <svg data-testid="chevron-icon" {...props} />,
  ClockIcon: (props: any) => <svg data-testid="clock-icon" {...props} />,
  LockClosedIcon: (props: any) => <svg data-testid="lock-icon" {...props} />,
}));

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source?: string }) => (
    <div data-testid="markdown-preview">{source}</div>
  ),
}));

vi.mock("@/utilities/tailwind", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("InternalAIEvaluationDisplay", () => {
  const mockParseEvaluation = parseEvaluation as vi.MockedFunction<typeof parseEvaluation>;
  const mockGetScoreIcon = getScoreIcon as vi.MockedFunction<typeof getScoreIcon>;
  const mockGetStatusColor = getStatusColor as vi.MockedFunction<typeof getStatusColor>;
  const mockGetScoreColor = getScoreColor as vi.MockedFunction<typeof getScoreColor>;
  const mockGetPriorityColor = getPriorityColor as vi.MockedFunction<typeof getPriorityColor>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetScoreIcon.mockReturnValue(<div data-testid="score-icon">Icon</div>);
    mockGetStatusColor.mockReturnValue("bg-green-100");
    mockGetScoreColor.mockReturnValue("bg-green-500");
    mockGetPriorityColor.mockReturnValue("bg-red-100");
  });

  describe("Rendering", () => {
    it("should render lock icon and header text", () => {
      render(<InternalAIEvaluationDisplay evaluation={null} isLoading={false} />);

      expect(screen.getByTestId("lock-icon")).toBeInTheDocument();
      expect(screen.getByText("Internal AI Evaluation")).toBeInTheDocument();
    });

    it("should render disclaimer message", () => {
      render(<InternalAIEvaluationDisplay evaluation={null} isLoading={false} />);

      expect(
        screen.getByText("For reviewer use only - not visible to applicants")
      ).toBeInTheDocument();
    });

    it("should apply custom className when provided", () => {
      const { container } = render(
        <InternalAIEvaluationDisplay evaluation={null} isLoading={false} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("Pending State", () => {
    it("should show pending message when evaluation is null", () => {
      render(<InternalAIEvaluationDisplay evaluation={null} isLoading={false} />);

      expect(screen.getByTestId("clock-icon")).toBeInTheDocument();
      expect(screen.getByText("Internal evaluation pending")).toBeInTheDocument();
      expect(
        screen.getByText(
          /The internal evaluation will be automatically generated after application submission/
        )
      ).toBeInTheDocument();
    });

    it("should show pending message when evaluation is empty string", () => {
      render(<InternalAIEvaluationDisplay evaluation={""} isLoading={false} />);

      expect(screen.getByText("Internal evaluation pending")).toBeInTheDocument();
    });
  });

  describe("Evaluation Display", () => {
    it("should render EvaluationDisplay when evaluation exists", () => {
      const evaluationData = '{"score": 8, "decision": "approve"}';
      mockParseEvaluation.mockReturnValue({ score: 8, decision: "approve" });

      render(<InternalAIEvaluationDisplay evaluation={evaluationData} isLoading={false} />);

      expect(mockParseEvaluation).toHaveBeenCalledWith(evaluationData);
      expect(EvaluationDisplay).toHaveBeenCalled();
    });

    it("should pass correct props to EvaluationDisplay", () => {
      const evaluationData = '{"score": 8}';
      const parsedData = { score: 8 };
      mockParseEvaluation.mockReturnValue(parsedData);

      render(
        <InternalAIEvaluationDisplay
          evaluation={evaluationData}
          isLoading={false}
          programName="Test Program"
        />
      );

      expect(EvaluationDisplay).toHaveBeenCalledTimes(1);
      const callArgs = (EvaluationDisplay as vi.Mock).mock.calls[0];
      expect(callArgs[0]).toMatchObject({
        data: parsedData,
        programName: "Test Program",
        getScoreIcon: mockGetScoreIcon,
        getStatusColor: mockGetStatusColor,
        getScoreColor: mockGetScoreColor,
        getPriorityColor: mockGetPriorityColor,
        footerDisclaimer:
          "This internal AI evaluation is for reviewer use only and is not visible to applicants.",
      });
    });

    it("should show footer disclaimer in EvaluationDisplay", () => {
      const evaluationData = '{"score": 8}';
      mockParseEvaluation.mockReturnValue({ score: 8 });

      render(<InternalAIEvaluationDisplay evaluation={evaluationData} isLoading={false} />);

      expect(screen.getByTestId("footer-disclaimer")).toHaveTextContent(
        "This internal AI evaluation is for reviewer use only and is not visible to applicants."
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle parsing errors gracefully", () => {
      const invalidEvaluation = '{"invalid": json}';
      mockParseEvaluation.mockReturnValue(null);

      render(<InternalAIEvaluationDisplay evaluation={invalidEvaluation} isLoading={false} />);

      expect(screen.getByText(/Failed to parse evaluation data/)).toBeInTheDocument();
    });

    it("should show error message when parseEvaluation returns null", () => {
      const evaluationData = '{"score": 8}';
      mockParseEvaluation.mockReturnValue(null);

      render(<InternalAIEvaluationDisplay evaluation={evaluationData} isLoading={false} />);

      expect(
        screen.getByText("Failed to parse evaluation data. Please try again.")
      ).toBeInTheDocument();
    });

    it("should not render EvaluationDisplay when parsing fails", () => {
      const evaluationData = '{"invalid": json}';
      mockParseEvaluation.mockReturnValue(null);

      render(<InternalAIEvaluationDisplay evaluation={evaluationData} isLoading={false} />);

      expect(EvaluationDisplay).not.toHaveBeenCalled();
    });
  });

  describe("Program Name", () => {
    it("should pass programName to EvaluationDisplay when provided", () => {
      const evaluationData = '{"score": 8}';
      mockParseEvaluation.mockReturnValue({ score: 8 });

      render(
        <InternalAIEvaluationDisplay
          evaluation={evaluationData}
          isLoading={false}
          programName="My Program"
        />
      );

      expect(EvaluationDisplay).toHaveBeenCalledTimes(1);
      const callArgs = (EvaluationDisplay as vi.Mock).mock.calls[0];
      expect(callArgs[0]).toMatchObject({
        programName: "My Program",
      });
    });

    it("should handle undefined programName", () => {
      const evaluationData = '{"score": 8}';
      mockParseEvaluation.mockReturnValue({ score: 8 });

      render(<InternalAIEvaluationDisplay evaluation={evaluationData} isLoading={false} />);

      expect(EvaluationDisplay).toHaveBeenCalledTimes(1);
      const callArgs = (EvaluationDisplay as vi.Mock).mock.calls[0];
      expect(callArgs[0]).toMatchObject({
        programName: undefined,
      });
    });
  });

  describe("Loading State", () => {
    it("should handle isLoading prop (currently not used but tested for future use)", () => {
      render(<InternalAIEvaluationDisplay evaluation={null} isLoading={true} />);

      // Component doesn't currently use isLoading, but we test it's accepted
      expect(screen.getByText("Internal evaluation pending")).toBeInTheDocument();
    });
  });

  describe("Karma profile context audit section (DEV-285)", () => {
    const sampleContext =
      "## Project\n- Title: Curio Storage\n\n## Past Programs\n1. **Filecoin ProPGF Batch 2**";

    beforeEach(() => {
      mockParseEvaluation.mockReturnValue({ score: 8 });
    });

    it("should_render_audit_toggle_when_context_provided", () => {
      render(<InternalAIEvaluationDisplay evaluation='{"score": 8}' context={sampleContext} />);

      expect(screen.getByText("Karma profile context used")).toBeInTheDocument();
    });

    it("should_NOT_render_audit_section_when_context_is_null", () => {
      render(<InternalAIEvaluationDisplay evaluation='{"score": 8}' context={null} />);

      expect(screen.queryByText("Karma profile context used")).not.toBeInTheDocument();
    });

    it("should_NOT_render_audit_section_when_context_prop_omitted", () => {
      render(<InternalAIEvaluationDisplay evaluation='{"score": 8}' />);

      expect(screen.queryByText("Karma profile context used")).not.toBeInTheDocument();
    });

    it("should_be_collapsed_by_default_so_audit_does_not_dominate_the_view", () => {
      render(<InternalAIEvaluationDisplay evaluation='{"score": 8}' context={sampleContext} />);

      // Toggle is rendered but content is not (collapsed = no MarkdownPreview)
      expect(screen.getByText("Karma profile context used")).toBeInTheDocument();
      expect(screen.queryByTestId("markdown-preview")).not.toBeInTheDocument();
    });

    it("should_expand_to_show_markdown_when_toggle_clicked", async () => {
      const user = userEvent.setup();
      render(<InternalAIEvaluationDisplay evaluation='{"score": 8}' context={sampleContext} />);

      await user.click(screen.getByText("Karma profile context used"));

      const markdown = screen.getByTestId("markdown-preview");
      expect(markdown).toBeInTheDocument();
      expect(markdown.textContent).toContain("Curio Storage");
    });

    it("should_collapse_again_on_second_click_for_toggle_behavior", async () => {
      const user = userEvent.setup();
      render(<InternalAIEvaluationDisplay evaluation='{"score": 8}' context={sampleContext} />);

      const toggle = screen.getByText("Karma profile context used");
      await user.click(toggle);
      expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();

      await user.click(toggle);
      expect(screen.queryByTestId("markdown-preview")).not.toBeInTheDocument();
    });

    it("should_expose_aria_expanded_state_for_screen_readers", async () => {
      const user = userEvent.setup();
      render(<InternalAIEvaluationDisplay evaluation='{"score": 8}' context={sampleContext} />);

      const button = screen.getByText("Karma profile context used").closest("button");
      expect(button).toHaveAttribute("aria-expanded", "false");

      await user.click(button!);
      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("should_render_audit_section_below_the_evaluation_content_not_above", () => {
      const { container } = render(
        <InternalAIEvaluationDisplay evaluation='{"score": 8}' context={sampleContext} />
      );

      const evalDisplay = screen.getByTestId("evaluation-display");
      const auditToggle = screen.getByText("Karma profile context used").closest("button");

      expect(evalDisplay).toBeInTheDocument();
      expect(auditToggle).toBeInTheDocument();
      // DOM order: evaluation display first, audit section after.
      const nodes = Array.from(container.querySelectorAll("*"));
      const evalIdx = nodes.indexOf(evalDisplay);
      const auditIdx = nodes.indexOf(auditToggle as Element);
      expect(evalIdx).toBeGreaterThan(-1);
      expect(auditIdx).toBeGreaterThan(evalIdx);
    });
  });
});
