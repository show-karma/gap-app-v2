import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
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
  ClockIcon: (props: any) => <svg data-testid="clock-icon" {...props} />,
  LockClosedIcon: (props: any) => <svg data-testid="lock-icon" {...props} />,
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
});
