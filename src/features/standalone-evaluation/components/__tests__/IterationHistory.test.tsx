import { act, render, screen } from "@testing-library/react";
import { Profiler, type ProfilerOnRenderCallback } from "react";
import type { EvaluationResultResponse } from "../../schemas/session.schema";
import { useEvaluationDraftStore } from "../../store/evaluationDraftStore";
import { IterationHistory } from "../IterationHistory";

// Stub the result card so the populated-case test doesn't pull in the lazily
// imported MarkdownPreview; the render-loop behaviour under test is owned by the
// store selector in IterationHistory, not by the card.
vi.mock("../EvaluationResultCard", () => ({
  EvaluationResultCard: ({ result }: { result: EvaluationResultResponse }) => (
    <div data-testid="result-card">{result.id}</div>
  ),
}));

const makeResult = (
  overrides: Partial<EvaluationResultResponse> = {}
): EvaluationResultResponse => ({
  id: "result-1",
  sessionId: "session-1",
  score: 80,
  summary: "Solid application",
  fullEvaluation: {},
  iterationNumber: 1,
  model: "test-model",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("IterationHistory — React #185 render-stability regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useEvaluationDraftStore.setState({ resultsBySession: {} });
    });
  });

  it("renders the empty state without an infinite re-render loop when the session has no results", () => {
    // Regression guard for the Zustand v5 selector footgun: when the session
    // key is absent, an inline `?? []` inside the selector allocates a new array
    // every render and pegs React into "Maximum update depth exceeded" (#185).
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    let renderCount = 0;
    const onRender: ProfilerOnRenderCallback = () => {
      renderCount += 1;
    };

    expect(() =>
      render(
        <Profiler id="iteration-history" onRender={onRender}>
          <IterationHistory sessionId="session-without-results" style="RUBRIC" />
        </Profiler>
      )
    ).not.toThrow();

    // Reaching the empty-state copy proves the snapshot stabilized.
    expect(screen.getByText(/No iterations yet/i)).toBeInTheDocument();

    // A stable selector commits a bounded number of times; the buggy selector
    // would loop until React aborts with #185.
    expect(renderCount).toBeLessThanOrEqual(3);

    const logged = errorSpy.mock.calls.flat().join(" ");
    expect(logged).not.toMatch(/Maximum update depth|getSnapshot/i);

    errorSpy.mockRestore();
  });

  it("does not re-render into a loop when an unrelated store slice updates", () => {
    let renderCount = 0;
    const onRender: ProfilerOnRenderCallback = () => {
      renderCount += 1;
    };

    render(
      <Profiler id="iteration-history" onRender={onRender}>
        <IterationHistory sessionId="session-without-results" style="RUBRIC" />
      </Profiler>
    );
    const afterInitial = renderCount;

    // Mutating an unrelated slice must not cascade into a render loop for a
    // session that has no results.
    act(() => {
      useEvaluationDraftStore.setState({ applicationText: "changed" });
    });

    expect(renderCount).toBeLessThanOrEqual(afterInitial + 1);
  });

  it("renders the sorted iteration history when the session has results", () => {
    act(() => {
      useEvaluationDraftStore.setState({
        resultsBySession: {
          "session-1": [
            makeResult({ id: "result-2", iterationNumber: 2 }),
            makeResult({ id: "result-1", iterationNumber: 1 }),
          ],
        },
      });
    });

    render(<IterationHistory sessionId="session-1" style="RUBRIC" />);

    expect(screen.getByText(/2 iterations/i)).toBeInTheDocument();
    expect(screen.getAllByTestId("result-card")).toHaveLength(2);
  });
});
