/**
 * Tests that the Insights tab's renderer is truly schema-agnostic — whatever
 * shape the LLM JSON takes, the right layout primitive is chosen and key
 * names are humanized rather than echoed raw. These pin the renderer's
 * contract so prompt changes don't quietly produce ugly UI.
 */

import { render, screen } from "@testing-library/react";
import { KarmaProfileEvaluationDisplay } from "@/components/FundingPlatform/ApplicationView/KarmaProfileEvaluation";

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => (
    <div data-testid="markdown-preview">{source}</div>
  ),
}));

vi.mock("@/utilities/tailwind", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

const baseProps = {
  context: null,
  status: "completed" as const,
  evaluatedAt: "2026-05-22T14:30:00.000Z",
};

function renderWith(json: object | string) {
  const evaluation = typeof json === "string" ? json : JSON.stringify(json);
  return render(<KarmaProfileEvaluationDisplay {...baseProps} evaluation={evaluation} />);
}

describe("KarmaProfileEvaluationDisplay — schema-agnostic renderer", () => {
  describe("Status states (no evaluation data)", () => {
    it("renders skipped state with skip-reason copy", () => {
      render(
        <KarmaProfileEvaluationDisplay
          evaluation=""
          context={null}
          status="skipped"
          evaluatedAt={undefined}
          skipReason="uid_empty"
        />
      );
      expect(screen.getByText(/didn't link a Karma project/i)).toBeInTheDocument();
    });

    it("renders failed state with retry copy", () => {
      render(
        <KarmaProfileEvaluationDisplay
          evaluation=""
          context={null}
          status="failed"
          evaluatedAt={undefined}
        />
      );
      expect(screen.getByText(/evaluation failed/i)).toBeInTheDocument();
    });

    it("renders pending state when status is pending", () => {
      render(
        <KarmaProfileEvaluationDisplay
          evaluation=""
          context={null}
          status="pending"
          evaluatedAt={undefined}
        />
      );
      expect(screen.getByText(/evaluation pending/i)).toBeInTheDocument();
    });

    it("renders pending when evaluation string is empty even on completed status", () => {
      render(
        <KarmaProfileEvaluationDisplay
          evaluation=""
          context={null}
          status="completed"
          evaluatedAt={undefined}
        />
      );
      expect(screen.getByText(/evaluation pending/i)).toBeInTheDocument();
    });
  });

  describe("Malformed JSON", () => {
    it("renders parse-error message when evaluation is not valid JSON", () => {
      renderWith("not-json{");
      expect(screen.getByText(/failed to parse evaluation/i)).toBeInTheDocument();
    });
  });

  describe("Generic shape dispatch", () => {
    it("humanizes snake_case top-level keys as section headings", () => {
      renderWith({
        track_record_verdict: "strong",
        history_depth: "established",
      });
      // Section headings are uppercase-tracked but the humanized form must be present.
      expect(screen.getByText(/Track Record Verdict/i)).toBeInTheDocument();
      expect(screen.getByText(/History Depth/i)).toBeInTheDocument();
    });

    it("humanizes camelCase keys too", () => {
      renderWith({ trackRecordVerdict: "mixed" });
      expect(screen.getByText(/Track Record Verdict/i)).toBeInTheDocument();
    });

    it("renders short enum-looking strings humanized", () => {
      renderWith({ verdict: "no_history" });
      expect(screen.getByText("No History")).toBeInTheDocument();
    });

    it("does NOT humanize prose strings (preserves user-readable text)", () => {
      const prose =
        "The applicant has delivered 2 grants with mixed completion rates over the past 18 months.";
      renderWith({ summary: prose });
      expect(screen.getByText(prose)).toBeInTheDocument();
    });

    it("renders string arrays as bulleted lists", () => {
      renderWith({
        wins: ["Completed Q1 milestone on time", "Open-source delivery proven"],
      });
      expect(screen.getByText("Completed Q1 milestone on time")).toBeInTheDocument();
      expect(screen.getByText("Open-source delivery proven")).toBeInTheDocument();
    });

    it("renders maps of primitives as a stat tile grid (no field-name assumptions)", () => {
      renderWith({
        delivery_stats: {
          total_grants: 5,
          completed_grants: 3,
          past_due_milestones: 2,
        },
      });
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      // Labels humanized from snake_case
      expect(screen.getByText("Total Grants")).toBeInTheDocument();
      expect(screen.getByText("Completed Grants")).toBeInTheDocument();
      expect(screen.getByText("Past Due Milestones")).toBeInTheDocument();
    });

    it("recurses on nested objects (deep schema works)", () => {
      renderWith({
        outer_section: {
          inner_field: "deep value here, this is a non-trivial paragraph that should render",
        },
      });
      expect(screen.getByText(/deep value here/i)).toBeInTheDocument();
      expect(screen.getByText(/Outer Section/i)).toBeInTheDocument();
      expect(screen.getByText(/Inner Field/i)).toBeInTheDocument();
    });

    it("handles a completely different schema gracefully (prompt could evolve)", () => {
      renderWith({
        risk_category: "moderate",
        concerns: ["A specific concern about timeline"],
        recommendation: "Approve with conditions",
      });
      // Renderer treats fields agnostically — none are hardcoded.
      expect(screen.getByText("Moderate")).toBeInTheDocument();
      expect(screen.getByText("A specific concern about timeline")).toBeInTheDocument();
      expect(screen.getByText("Approve with conditions")).toBeInTheDocument();
    });
  });

  describe("Top-level primitives", () => {
    it("renders bare top-level numbers without crashing", () => {
      renderWith(42 as any);
      expect(screen.getByText("42")).toBeInTheDocument();
    });
  });

  describe("Timestamp display", () => {
    it("shows evaluatedAt formatted as YYYY-MM-DD HH:mm", () => {
      renderWith({ verdict: "strong" });
      // baseProps.evaluatedAt = "2026-05-22T14:30:00.000Z" — local TZ may differ but the date portion is stable.
      expect(screen.getByText(/Evaluated 2026-05-22/)).toBeInTheDocument();
    });

    it("hides the timestamp line when evaluatedAt is invalid", () => {
      render(
        <KarmaProfileEvaluationDisplay
          evaluation={JSON.stringify({ verdict: "strong" })}
          context={null}
          status="completed"
          evaluatedAt="not-a-date"
        />
      );
      expect(screen.queryByText(/^Evaluated /)).not.toBeInTheDocument();
    });
  });
});
