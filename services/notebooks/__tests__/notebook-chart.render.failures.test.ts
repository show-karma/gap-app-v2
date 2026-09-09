import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderNotebookChartSvg } from "@/services/notebooks/notebook-chart.render";
import type { NotebookMetricQueryResult } from "@/services/notebooks/notebook-metric-registry.types";

/**
 * WHAT HAPPENS WHEN THE RENDERER GOES WRONG.
 *
 * `renderNotebookChartSvg` must NEVER reject. It is awaited inside a page's
 * data phase, one section among many, and a rejection there does not lose a
 * chart — it loses the PAGE. Every failure resolves to `null`, which the page
 * reads as "render the table", and a table is a complete answer.
 *
 * The other half of the contract is that a `View` is finalised whatever
 * happens. A view holds dataflow state and timers; leaking one per failed
 * chart on a server rendering pages on demand is a slow leak that shows up as
 * memory pressure days later, nowhere near the chart that caused it.
 *
 * Vega is mocked HERE and only here. The suite next door compiles the real
 * library, which is the only thing that can prove what a chart looks like;
 * this file is the only way to prove what happens when a stage that cannot be
 * made to fail on demand fails anyway.
 */
const stage = vi.hoisted(() => ({
  toSVG: vi.fn(),
  finalize: vi.fn(),
  parse: vi.fn((spec: unknown) => spec),
}));

vi.mock("vega", () => ({
  None: 0,
  logger: () => ({
    level: () => undefined,
    error: () => undefined,
    warn: () => undefined,
    info: () => undefined,
    debug: () => undefined,
  }),
  loader: () => ({
    load: async () => "",
    sanitize: async () => ({ href: "" }),
  }),
  parse: (spec: unknown) => stage.parse(spec),
  View: class {
    toSVG() {
      return stage.toSVG();
    }
    finalize() {
      stage.finalize();
    }
  },
}));

vi.mock("vega-lite", () => ({
  compile: (spec: unknown) => ({ spec }),
}));

function result(): NotebookMetricQueryResult {
  return {
    query: {
      communityUidOrSlug: "filecoin",
      metricId: "funding.disbursed",
      groupBy: "program",
      window: "90d",
      filters: {},
      entity: "funding",
      measure: "disbursed",
    },
    columns: [
      { id: "label", label: "Program", valueKind: "text", unit: null },
      { id: "value", label: "Disbursed", valueKind: "currency", unit: "USDC" },
    ],
    rows: [
      {
        key: "prog-1",
        label: "Program One",
        dimensions: { program: "prog-1" },
        value: 1250,
        displayValue: "$1,250",
      },
    ],
    meta: {
      generatedAt: "2026-09-01T00:00:00.000Z",
      window: "90d",
      source: { tool: "gap", endpoints: ["/v2/x"], methodology: "Sum of payouts." },
      absenceDisplay: "—",
      warnings: [],
      stale: false,
    },
  };
}

describe("when a stage after the view was constructed throws", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stage.parse.mockImplementation((spec: unknown) => spec);
  });

  it("should_resolve_to_null_rather_than_reject", async () => {
    stage.toSVG.mockRejectedValue(new Error("scenegraph exploded"));

    await expect(renderNotebookChartSvg({ mark: "bar" }, result())).resolves.toBeNull();
  });

  it("should_finalize_the_view_it_had_already_constructed", async () => {
    stage.toSVG.mockRejectedValue(new Error("scenegraph exploded"));

    await renderNotebookChartSvg({ mark: "bar" }, result());

    expect(stage.finalize).toHaveBeenCalledTimes(1);
  });

  it("should_report_the_failure_rather_than_swallow_it", async () => {
    stage.toSVG.mockRejectedValue(new Error("scenegraph exploded"));

    await renderNotebookChartSvg({ mark: "bar" }, result());

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: { feature: "notebooks", stage: "chart-render" } })
    );
  });

  // A synchronous throw takes a different path through the try block than a
  // rejected promise, and only one of them has a view to finalise.
  it("should_resolve_to_null_when_the_throw_is_synchronous", async () => {
    stage.toSVG.mockImplementation(() => {
      throw new Error("renderer exploded");
    });

    await expect(renderNotebookChartSvg({ mark: "bar" }, result())).resolves.toBeNull();
    expect(stage.finalize).toHaveBeenCalledTimes(1);
  });
});

describe("when the failure is before a view exists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should_resolve_to_null_without_trying_to_finalize_anything", async () => {
    stage.parse.mockImplementation(() => {
      throw new Error("unparseable dataflow");
    });

    await expect(renderNotebookChartSvg({ mark: "bar" }, result())).resolves.toBeNull();
    expect(stage.finalize).not.toHaveBeenCalled();
  });
});

/**
 * The guards decide, and the decision is a table.
 *
 * A vega that started emitting markup outside the allowlist is a library
 * regression, not a page fault — so it is reported and the section degrades,
 * rather than throwing on a published page.
 */
describe("when the compiled output fails a guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stage.parse.mockImplementation((spec: unknown) => spec);
  });

  it("should_return_no_svg_when_the_structure_is_not_one_we_recognise", async () => {
    stage.toSVG.mockResolvedValue('<svg viewBox="0 0 1 1"><foreignObject/></svg>');

    await expect(renderNotebookChartSvg({ mark: "bar" }, result())).resolves.toBeNull();
    expect(stage.finalize).toHaveBeenCalledTimes(1);
  });

  it("should_return_no_svg_when_a_paint_is_not_a_theme_token", async () => {
    stage.toSVG.mockResolvedValue('<svg viewBox="0 0 1 1"><rect fill="#4c78a8"/></svg>');

    await expect(renderNotebookChartSvg({ mark: "bar" }, result())).resolves.toBeNull();
  });

  it("should_report_a_guard_refusal_so_a_library_regression_is_visible", async () => {
    stage.toSVG.mockResolvedValue('<svg viewBox="0 0 1 1"><rect fill="#4c78a8"/></svg>');

    await renderNotebookChartSvg({ mark: "bar" }, result());

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ tags: { feature: "notebooks", stage: "chart-guard" } })
    );
  });

  it("should_return_the_normalised_svg_when_both_guards_pass", async () => {
    stage.toSVG.mockResolvedValue(
      '<svg class="marks" width="10" height="10" viewBox="0 0 10 10">' +
        '<rect fill="hsl(var(--chart-1))"/></svg>'
    );

    const svg = await renderNotebookChartSvg({ mark: "bar" }, result());

    expect(svg).toContain('viewBox="0 0 10 10"');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toMatch(/\swidth=/);
    expect(stage.finalize).toHaveBeenCalledTimes(1);
  });
});

/**
 * The builder declines before anything is compiled, so a section that cannot
 * be drawn costs nothing at all — no dataflow, no view, no render.
 */
describe("when the builder declines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should_never_reach_vega_at_all", async () => {
    const empty = { ...result(), rows: [] };

    await expect(renderNotebookChartSvg({ mark: "bar" }, empty)).resolves.toBeNull();
    expect(stage.parse).not.toHaveBeenCalled();
    expect(stage.toSVG).not.toHaveBeenCalled();
  });
});
