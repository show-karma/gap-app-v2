/**
 * @file Component tests for EvaluationResultCard — verifies all three styles render.
 */
import { render, screen } from "@testing-library/react";

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const Stub = ({ source }: { source?: string }) => <div data-testid="markdown">{source}</div>;
    Stub.displayName = "MarkdownStub";
    return Stub;
  },
}));

import { EvaluationResultCard } from "@/src/features/standalone-evaluation/components/EvaluationResultCard";
import type { EvaluationResultResponse } from "@/src/features/standalone-evaluation/schemas/session.schema";

const baseResult: EvaluationResultResponse = {
  id: "r-1",
  sessionId: "s-1",
  score: 8,
  summary: "Strong application overall.",
  fullEvaluation: {},
  iterationNumber: 1,
  model: "claude-test",
  createdAt: new Date().toISOString(),
};

describe("EvaluationResultCard", () => {
  it("renders the rubric layout with criteria scores", () => {
    render(
      <EvaluationResultCard
        style="RUBRIC"
        result={{
          ...baseResult,
          fullEvaluation: {
            criteria: [
              { name: "Feasibility", score: 9, rationale: "Looks great" },
              { name: "Team", score: 7, rationale: "Strong leads" },
            ],
            strengths: ["Clear roadmap"],
            weaknesses: ["Light on metrics"],
            recommendation: "Fund",
          },
        }}
      />
    );
    expect(screen.getByTestId("eval-result-rubric")).toBeInTheDocument();
    expect(screen.getByText("Feasibility")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Strengths")).toBeInTheDocument();
    expect(screen.getByText("Weaknesses")).toBeInTheDocument();
    expect(screen.getByText("Recommendation")).toBeInTheDocument();
    expect(screen.getByText("Fund")).toBeInTheDocument();
  });

  it("renders the narrative layout with markdown sections", () => {
    render(
      <EvaluationResultCard
        style="NARRATIVE"
        result={{
          ...baseResult,
          fullEvaluation: {
            scores: { Feasibility: 8, Team: 7 },
            sections: [{ title: "Summary", body: "Markdown body here." }],
          },
        }}
      />
    );
    expect(screen.getByTestId("eval-result-narrative")).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Feasibility:")).toBeInTheDocument();
    expect(screen.getByTestId("markdown")).toHaveTextContent("Markdown body here.");
  });

  it("renders the quick-score layout with PASS chip and red flags", () => {
    render(
      <EvaluationResultCard
        style="QUICK_SCORE"
        result={{
          ...baseResult,
          score: null,
          fullEvaluation: {
            decision: "PASS",
            keyFactors: ["Strong team"],
            redFlags: ["Vague timeline"],
            oneLineSummary: "Solid candidate.",
          },
        }}
      />
    );
    expect(screen.getByTestId("eval-result-quick_score")).toBeInTheDocument();
    expect(screen.getByText("PASS")).toBeInTheDocument();
    expect(screen.getByText("Solid candidate.")).toBeInTheDocument();
    expect(screen.getByText("Strong team")).toBeInTheDocument();
    expect(screen.getByText("Vague timeline")).toBeInTheDocument();
  });
});
