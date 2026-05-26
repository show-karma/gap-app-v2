import * as Sentry from "@sentry/nextjs";
import { render, screen, within } from "@testing-library/react";
import type React from "react";
import { AIEvaluationDisplay } from "../AIEvaluationDisplay";

vi.mock("lucide-react", async () => {
  const actual = await vi.importActual<typeof import("lucide-react")>("lucide-react");
  return {
    ...actual,
    AlertTriangle: (props: React.SVGProps<SVGSVGElement>) => (
      <svg data-testid="alert-triangle-icon" {...props} />
    ),
    Info: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="info-icon" {...props} />,
  };
});

describe("AIEvaluationDisplay", () => {
  beforeEach(() => {
    vi.mocked(Sentry.captureMessage).mockClear();
  });

  it("renders the applicant-friendly error state", () => {
    render(<AIEvaluationDisplay evaluation={null} isLoading={false} isEnabled hasError />);

    const errorState = screen.getByTestId("ai-evaluation-error");
    expect(errorState).toBeInTheDocument();
    expect(
      within(errorState).getByText("AI feedback is unavailable right now")
    ).toBeInTheDocument();
    expect(
      within(errorState).getByText(
        "Your application can still be submitted. Try again if you want feedback before submitting, or continue without it."
      )
    ).toBeInTheDocument();
    expect(within(errorState).getByTestId("info-icon")).toBeInTheDocument();
    expect(within(errorState).queryByTestId("alert-triangle-icon")).not.toBeInTheDocument();
  });

  it("does not render when AI evaluation is disabled", () => {
    render(<AIEvaluationDisplay evaluation={null} isLoading={false} isEnabled={false} hasError />);

    expect(screen.queryByTestId("ai-evaluation-card")).not.toBeInTheDocument();
  });

  it("renders a numeric final_score", () => {
    render(<AIEvaluationDisplay evaluation={{ final_score: 8 }} isLoading={false} isEnabled />);

    expect(screen.getByText("Score: 8/10")).toBeInTheDocument();
  });

  it("coerces string-numeric final_score and renders the parsed value", () => {
    render(<AIEvaluationDisplay evaluation={{ final_score: "7" }} isLoading={false} isEnabled />);

    expect(screen.getByText("Score: 7/10")).toBeInTheDocument();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("hides the score, renders a Score unavailable placeholder, and logs to Sentry for non-numeric final_score", () => {
    render(
      <AIEvaluationDisplay
        evaluation={{ final_score: "n/a" }}
        isLoading={false}
        isEnabled
        programName="Audit Grants"
      />
    );

    expect(screen.queryByText(/Score: /)).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(screen.getByTestId("ai-evaluation-score-unavailable")).toBeInTheDocument();
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("ai-evaluation-malformed-score"),
      expect.objectContaining({
        level: "warning",
        extra: expect.objectContaining({
          rawScoreSample: "n/a",
          programName: "Audit Grants",
        }),
      })
    );
  });

  it("treats out-of-range numeric final_score as malformed (renders Score unavailable, logs to Sentry)", () => {
    render(<AIEvaluationDisplay evaluation={{ final_score: 42 }} isLoading={false} isEnabled />);

    expect(screen.queryByText(/Score: /)).not.toBeInTheDocument();
    expect(screen.getByTestId("ai-evaluation-score-unavailable")).toBeInTheDocument();
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("ai-evaluation-malformed-score"),
      expect.objectContaining({ level: "warning" })
    );
  });

  it("treats null final_score as missing (no score block, no Score unavailable banner)", () => {
    render(<AIEvaluationDisplay evaluation={{ final_score: null }} isLoading={false} isEnabled />);

    expect(screen.queryByText(/Score: /)).not.toBeInTheDocument();
    expect(screen.queryByTestId("ai-evaluation-score-unavailable")).not.toBeInTheDocument();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("logs to Sentry when feedback is not a string", () => {
    render(
      <AIEvaluationDisplay
        evaluation={{ final_score: 7, feedback: { unexpected: "object" } }}
        isLoading={false}
        isEnabled
        programName="Growth Grants"
      />
    );

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("ai-evaluation-malformed-field"),
      expect.objectContaining({
        level: "warning",
        extra: expect.objectContaining({
          field: "feedback",
          valueType: "object",
          programName: "Growth Grants",
        }),
      })
    );
  });

  it("ignores non-array improvement_recommendations and logs to Sentry", () => {
    render(
      <AIEvaluationDisplay
        evaluation={{ final_score: 5, improvement_recommendations: { "0": "bad" } }}
        isLoading={false}
        isEnabled
      />
    );

    expect(screen.queryByText("Improvement Recommendations")).not.toBeInTheDocument();
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("ai-evaluation-malformed-recommendations"),
      expect.objectContaining({ level: "warning" })
    );
  });
});
