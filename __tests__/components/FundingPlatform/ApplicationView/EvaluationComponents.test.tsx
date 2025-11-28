import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import {
  AdditionalNotes,
  DecisionDisplay,
  DisqualificationReason,
  EvaluationDisplay,
  EvaluationSummary,
  ImprovementRecommendations,
  ScoreDisplay,
  StatusChip,
} from "@/components/FundingPlatform/ApplicationView/EvaluationComponents";
import {
  getPriorityColor,
  getScoreColor,
  getScoreIcon,
  getStatusColor,
} from "@/components/FundingPlatform/ApplicationView/evaluationUtils";

// Mock MarkdownPreview
jest.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => (
    <div data-testid="markdown-preview">{source}</div>
  ),
}));

describe("EvaluationComponents", () => {
  describe("ScoreDisplay", () => {
    const mockGetScoreIcon = jest.fn((score: number) => getScoreIcon(score));
    const mockGetScoreColor = jest.fn((score: number) => getScoreColor(score));

    it("should render score with icon and text", () => {
      render(
        <ScoreDisplay
          score={8}
          isGrowthGrants={false}
          getScoreIcon={mockGetScoreIcon}
          getScoreColor={mockGetScoreColor}
        />
      );

      expect(screen.getByText("Score: 8/10")).toBeInTheDocument();
      expect(mockGetScoreIcon).toHaveBeenCalledWith(8);
    });

    it("should show probability badge for Growth Grants", () => {
      render(
        <ScoreDisplay
          score={8}
          isGrowthGrants={true}
          getScoreIcon={mockGetScoreIcon}
          getScoreColor={mockGetScoreColor}
        />
      );

      expect(screen.getByText("High")).toBeInTheDocument();
    });

    it("should show Medium probability for score 4-7 in Growth Grants", () => {
      render(
        <ScoreDisplay
          score={5}
          isGrowthGrants={true}
          getScoreIcon={mockGetScoreIcon}
          getScoreColor={mockGetScoreColor}
        />
      );

      expect(screen.getByText("Medium")).toBeInTheDocument();
    });

    it("should show Low probability for score <4 in Growth Grants", () => {
      render(
        <ScoreDisplay
          score={3}
          isGrowthGrants={true}
          getScoreIcon={mockGetScoreIcon}
          getScoreColor={mockGetScoreColor}
        />
      );

      expect(screen.getByText("Low")).toBeInTheDocument();
    });

    it("should show progress bar for non-Growth Grants", () => {
      const { container } = render(
        <ScoreDisplay
          score={8}
          isGrowthGrants={false}
          getScoreIcon={mockGetScoreIcon}
          getScoreColor={mockGetScoreColor}
        />
      );

      const progressBar = container.querySelector('[style*="width: 80%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it("should calculate progress bar width correctly (score * 10%)", () => {
      const { container } = render(
        <ScoreDisplay
          score={5}
          isGrowthGrants={false}
          getScoreIcon={mockGetScoreIcon}
          getScoreColor={mockGetScoreColor}
        />
      );

      const progressBar = container.querySelector('[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it("should not show progress bar for Growth Grants", () => {
      const { container } = render(
        <ScoreDisplay
          score={8}
          isGrowthGrants={true}
          getScoreIcon={mockGetScoreIcon}
          getScoreColor={mockGetScoreColor}
        />
      );

      const progressBar = container.querySelector('[style*="width"]');
      expect(progressBar).not.toBeInTheDocument();
    });
  });

  describe("DecisionDisplay", () => {
    it("should display decision in uppercase for non-audit grants", () => {
      render(<DecisionDisplay decision="approve" isAuditGrants={false} />);

      expect(screen.getByText("APPROVE")).toBeInTheDocument();
      expect(screen.getByText("Decision")).toBeInTheDocument();
    });

    it("should map PASS to High for audit grants", () => {
      render(<DecisionDisplay decision="PASS" isAuditGrants={true} />);

      expect(screen.getByText("High")).toBeInTheDocument();
      expect(screen.getByText("Probability of approval")).toBeInTheDocument();
    });

    it("should map NO_PASS to Medium for audit grants", () => {
      render(<DecisionDisplay decision="NO_PASS" isAuditGrants={true} />);

      expect(screen.getByText("Medium")).toBeInTheDocument();
    });

    it("should map REJECT to Low for audit grants", () => {
      render(<DecisionDisplay decision="REJECT" isAuditGrants={true} />);

      expect(screen.getByText("Low")).toBeInTheDocument();
    });

    it("should apply green color for approve/accept/high decisions", () => {
      const { container } = render(<DecisionDisplay decision="approve" isAuditGrants={false} />);

      const decisionText = screen.getByText("APPROVE");
      expect(decisionText.className).toContain("text-green-600");
    });

    it("should apply red color for reject/rejected/low decisions", () => {
      const { container } = render(<DecisionDisplay decision="reject" isAuditGrants={false} />);

      const decisionText = screen.getByText("REJECT");
      expect(decisionText.className).toContain("text-red-600");
    });

    it("should apply yellow color for pending/review/medium decisions", () => {
      const { container } = render(<DecisionDisplay decision="pending" isAuditGrants={false} />);

      const decisionText = screen.getByText("PENDING");
      expect(decisionText.className).toContain("text-yellow-600");
    });
  });

  describe("DisqualificationReason", () => {
    it("should render reason with MarkdownPreview", () => {
      render(<DisqualificationReason reason="Not eligible for funding" />);

      expect(screen.getByText("Disqualification Reason")).toBeInTheDocument();
      expect(screen.getByTestId("markdown-preview")).toHaveTextContent("Not eligible for funding");
    });

    it("should apply correct styling", () => {
      const { container } = render(<DisqualificationReason reason="Test reason" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("bg-red-50");
      expect(wrapper.className).toContain("border-red-200");
    });
  });

  describe("EvaluationSummary", () => {
    it("should render strengths when provided", () => {
      const summary = {
        strengths: ["Strong technical team", "Clear roadmap"],
      };

      render(<EvaluationSummary summary={summary} />);

      expect(screen.getByText("Evaluation Summary")).toBeInTheDocument();
      // Text content is "Strengths" but CSS uppercase makes it appear as "STRENGTHS"
      expect(screen.getByText("Strengths")).toBeInTheDocument();
      const markdownPreviews = screen.getAllByTestId("markdown-preview");
      expect(markdownPreviews.some((el) => el.textContent === "Strong technical team")).toBe(true);
    });

    it("should render concerns when provided", () => {
      const summary = {
        concerns: ["Limited budget", "Unclear timeline"],
      };

      render(<EvaluationSummary summary={summary} />);

      // Text content is "Concerns" but CSS uppercase makes it appear as "CONCERNS"
      expect(screen.getByText("Concerns")).toBeInTheDocument();
    });

    it("should render risk factors when provided", () => {
      const summary = {
        risk_factors: ["High competition", "Market uncertainty"],
      };

      render(<EvaluationSummary summary={summary} />);

      // Text content is "Risk Factors" but CSS uppercase makes it appear as "RISK FACTORS"
      expect(screen.getByText("Risk Factors")).toBeInTheDocument();
    });

    it("should render all sections when all are provided", () => {
      const summary = {
        strengths: ["Strength 1"],
        concerns: ["Concern 1"],
        risk_factors: ["Risk 1"],
      };

      render(<EvaluationSummary summary={summary} />);

      // Text content is "Strengths" but CSS uppercase makes it appear as "STRENGTHS"
      expect(screen.getByText("Strengths")).toBeInTheDocument();
      expect(screen.getByText("Concerns")).toBeInTheDocument();
      expect(screen.getByText("Risk Factors")).toBeInTheDocument();
    });

    it("should not render sections with empty arrays", () => {
      const summary = {
        strengths: [],
        concerns: [],
        risk_factors: [],
      };

      render(<EvaluationSummary summary={summary} />);

      expect(screen.queryByText("STRENGTHS")).not.toBeInTheDocument();
      expect(screen.queryByText("CONCERNS")).not.toBeInTheDocument();
      expect(screen.queryByText("RISK FACTORS")).not.toBeInTheDocument();
    });

    it("should not render sections when undefined", () => {
      const summary = {};

      render(<EvaluationSummary summary={summary} />);

      expect(screen.queryByText("STRENGTHS")).not.toBeInTheDocument();
    });
  });

  describe("ImprovementRecommendations", () => {
    const mockGetPriorityColor = jest.fn((priority: string) => getPriorityColor(priority));

    it("should render recommendations with priority badges", () => {
      const recommendations = [
        {
          priority: "high",
          recommendation: "Improve documentation",
          impact: "Will increase clarity",
        },
      ];

      render(
        <ImprovementRecommendations
          recommendations={recommendations}
          getPriorityColor={mockGetPriorityColor}
        />
      );

      expect(screen.getByText("Improvement Recommendations")).toBeInTheDocument();
      expect(screen.getByText("HIGH")).toBeInTheDocument();
      const markdownPreviews = screen.getAllByTestId("markdown-preview");
      expect(markdownPreviews.some((el) => el.textContent === "Improve documentation")).toBe(true);
      expect(screen.getByText(/Impact:/)).toBeInTheDocument();
    });

    it("should handle recommendations without priority", () => {
      const recommendations = [
        {
          recommendation: "Add more details",
        },
      ];

      render(
        <ImprovementRecommendations
          recommendations={recommendations}
          getPriorityColor={mockGetPriorityColor}
        />
      );

      expect(screen.getByTestId("markdown-preview")).toHaveTextContent("Add more details");
      expect(screen.queryByText("HIGH")).not.toBeInTheDocument();
    });

    it("should handle recommendations without impact", () => {
      const recommendations = [
        {
          priority: "medium",
          recommendation: "Test recommendation",
        },
      ];

      render(
        <ImprovementRecommendations
          recommendations={recommendations}
          getPriorityColor={mockGetPriorityColor}
        />
      );

      expect(screen.queryByText(/Impact:/)).not.toBeInTheDocument();
    });

    it("should render multiple recommendations", () => {
      const recommendations = [
        { priority: "high", recommendation: "Rec 1" },
        { priority: "low", recommendation: "Rec 2" },
      ];

      render(
        <ImprovementRecommendations
          recommendations={recommendations}
          getPriorityColor={mockGetPriorityColor}
        />
      );

      expect(screen.getByText("HIGH")).toBeInTheDocument();
      expect(screen.getByText("LOW")).toBeInTheDocument();
    });
  });

  describe("AdditionalNotes", () => {
    it("should render notes with MarkdownPreview", () => {
      render(<AdditionalNotes notes="These are additional notes" />);

      expect(screen.getByText("Additional Notes")).toBeInTheDocument();
      expect(screen.getByTestId("markdown-preview")).toHaveTextContent(
        "These are additional notes"
      );
    });
  });

  describe("StatusChip", () => {
    const mockGetStatusColor = jest.fn((status: string) => getStatusColor(status));

    it("should capitalize status text", () => {
      render(<StatusChip status="complete" getStatusColor={mockGetStatusColor} />);

      expect(screen.getByText("Complete")).toBeInTheDocument();
    });

    it("should apply correct color classes", () => {
      render(<StatusChip status="complete" getStatusColor={mockGetStatusColor} />);

      expect(mockGetStatusColor).toHaveBeenCalledWith("complete");
    });

    it("should handle single character status", () => {
      render(<StatusChip status="a" getStatusColor={mockGetStatusColor} />);

      expect(screen.getByText("A")).toBeInTheDocument();
    });
  });

  describe("EvaluationDisplay", () => {
    const mockGetScoreIcon = jest.fn((score: number) => getScoreIcon(score));
    const mockGetStatusColor = jest.fn((status: string) => getStatusColor(status));
    const mockGetScoreColor = jest.fn((score: number) => getScoreColor(score));
    const mockGetPriorityColor = jest.fn((priority: string) => getPriorityColor(priority));

    const defaultProps = {
      data: {},
      getScoreIcon: mockGetScoreIcon,
      getStatusColor: mockGetStatusColor,
      getScoreColor: mockGetScoreColor,
      getPriorityColor: mockGetPriorityColor,
    };

    it("should render score display when score is provided", () => {
      const data = { score: 8 };
      render(<EvaluationDisplay {...defaultProps} data={data} />);

      expect(screen.getByText("Score: 8/10")).toBeInTheDocument();
    });

    it("should render final_score when provided", () => {
      const data = { final_score: 9 };
      render(<EvaluationDisplay {...defaultProps} data={data} />);

      expect(screen.getByText("Score: 9/10")).toBeInTheDocument();
    });

    it("should render decision when provided", () => {
      const data = { decision: "approve" };
      render(<EvaluationDisplay {...defaultProps} data={data} />);

      expect(screen.getByText("APPROVE")).toBeInTheDocument();
    });

    it("should render disqualification reason when provided", () => {
      const data = { disqualification_reason: "Not eligible" };
      render(<EvaluationDisplay {...defaultProps} data={data} />);

      expect(screen.getByText("Disqualification Reason")).toBeInTheDocument();
      expect(screen.getByTestId("markdown-preview")).toHaveTextContent("Not eligible");
    });

    it("should not render disqualification reason when value is 'null'", () => {
      const data = { disqualification_reason: "null" };
      render(<EvaluationDisplay {...defaultProps} data={data} />);

      expect(screen.queryByText("Disqualification Reason")).not.toBeInTheDocument();
    });

    it("should render evaluation summary when provided", () => {
      const data = {
        evaluation_summary: {
          strengths: ["Strength 1"],
        },
      };
      render(<EvaluationDisplay {...defaultProps} data={data} />);

      expect(screen.getByText("Evaluation Summary")).toBeInTheDocument();
    });

    it("should render improvement recommendations when provided", () => {
      const data = {
        improvement_recommendations: [
          {
            priority: "high",
            recommendation: "Improve docs",
          },
        ],
      };
      render(<EvaluationDisplay {...defaultProps} data={data} />);

      expect(screen.getByText("Improvement Recommendations")).toBeInTheDocument();
    });

    it("should render additional notes when provided", () => {
      const data = { additional_notes: "Some notes" };
      render(<EvaluationDisplay {...defaultProps} data={data} />);

      expect(screen.getByText("Additional Notes")).toBeInTheDocument();
    });

    it("should render reviewer confidence when provided", () => {
      const data = { reviewer_confidence: "high" };
      render(<EvaluationDisplay {...defaultProps} data={data} />);

      expect(screen.getByText(/Reviewer Confidence:/)).toBeInTheDocument();
      expect(screen.getByText(/Reviewer Confidence: High/)).toBeInTheDocument();
    });

    it("should render footer disclaimer when provided", () => {
      render(<EvaluationDisplay {...defaultProps} footerDisclaimer="Test disclaimer" />);

      expect(screen.getByText("Test disclaimer")).toBeInTheDocument();
    });

    it("should not render footer disclaimer when not provided", () => {
      render(<EvaluationDisplay {...defaultProps} />);

      expect(screen.queryByText("Test disclaimer")).not.toBeInTheDocument();
    });

    it("should render generic fields for unknown keys", () => {
      const data = {
        custom_field: "Custom value",
        another_field: 123,
      };
      render(<EvaluationDisplay {...defaultProps} data={data} />);

      // Text is capitalized by CSS, so we check for lowercase version
      expect(screen.getByText("custom field")).toBeInTheDocument();
      expect(screen.getByText("another field")).toBeInTheDocument();
    });

    it("should not render generic fields for already rendered keys", () => {
      const data = {
        score: 8,
        decision: "approve",
        custom_field: "Custom value",
      };
      render(<EvaluationDisplay {...defaultProps} data={data} />);

      // Score and decision should be rendered by specific components
      expect(screen.getByText("Score: 8/10")).toBeInTheDocument();
      expect(screen.getByText("APPROVE")).toBeInTheDocument();

      // Custom field should still be rendered generically (text is lowercase due to capitalize CSS)
      expect(screen.getByText("custom field")).toBeInTheDocument();
    });

    it("should render status chip when evaluation_status is provided", () => {
      const data = {
        score: 8,
        evaluation_status: "complete",
      };
      render(<EvaluationDisplay {...defaultProps} data={data} />);

      expect(screen.getByText("Complete")).toBeInTheDocument();
    });

    it("should handle complex nested data structures", () => {
      const data = {
        score: 7,
        nested_object: {
          key1: "value1",
          key2: 42,
        },
        array_field: ["item1", "item2"],
      };
      render(<EvaluationDisplay {...defaultProps} data={data} />);

      // Text is capitalized by CSS, so we check for lowercase version
      expect(screen.getByText("nested object")).toBeInTheDocument();
      expect(screen.getByText("array field")).toBeInTheDocument();
    });
  });
});
