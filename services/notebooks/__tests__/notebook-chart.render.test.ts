import { afterEach, describe, expect, it, vi } from "vitest";
import { renderNotebookChartSvg } from "@/services/notebooks/notebook-chart.render";
import { isSafeChartSvg, isThemedChartSvg } from "@/services/notebooks/notebook-chart-svg";
import type { NotebookMetricQueryResult } from "@/services/notebooks/notebook-metric-registry.types";
import {
  NOTEBOOK_QUERY_CHART_MARKS,
  type NotebookQueryChartMark,
} from "@/services/notebooks/notebook-spec";

/**
 * THESE TESTS COMPILE REAL VEGA.
 *
 * That is the whole point of them. Every other test in this feature reasons
 * about a specification, and a specification is not what a reader sees — vega
 * emits its OWN defaults, raw hex, for every channel our config does not
 * cover, and no source-scanning lint can see a colour a library produced at
 * compile time. The only place that can be checked is the compiled output, so
 * this is where it is checked.
 */

function labelledResult(
  labels: string[],
  overrides: Partial<NotebookMetricQueryResult> = {}
): NotebookMetricQueryResult {
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
    rows: labels.map((label, index) => ({
      key: `k-${index}`,
      label,
      dimensions: { program: `k-${index}` },
      value: (index + 1) * 100,
      displayValue: `$${(index + 1) * 100}`,
    })),
    meta: {
      generatedAt: "2026-09-01T00:00:00.000Z",
      window: "90d",
      source: { tool: "gap", endpoints: ["/v2/x"], methodology: "Sum of payouts." },
      absenceDisplay: "—",
      warnings: [],
      stale: false,
    },
    ...overrides,
  };
}

/** The date-grouped shape the indicator resolver emits, already ascending. */
function dateResult(): NotebookMetricQueryResult {
  const days = ["2026-01-01", "2026-01-02", "2026-01-03"];

  return labelledResult(days, {
    query: {
      communityUidOrSlug: "filecoin",
      metricId: "indicator.capacity",
      groupBy: "date",
      window: "12m",
      filters: {},
      entity: "indicator",
      measure: "capacity",
    },
    columns: [
      { id: "label", label: "Label", valueKind: "text", unit: null },
      { id: "date", label: "Date", valueKind: "text", unit: null },
      { id: "value", label: "Capacity", valueKind: "number", unit: "TiB" },
    ],
    rows: days.map((day, index) => ({
      key: day,
      label: day,
      dimensions: { date: day },
      value: (index + 1) * 100,
      displayValue: `${(index + 1) * 100} TiB`,
    })),
  });
}

const sourceFor = (mark: NotebookQueryChartMark) =>
  mark === "line" ? dateResult() : labelledResult(["Program One", "Program Two", "Program Three"]);

describe("every mark, compiled for real", () => {
  it.each([...NOTEBOOK_QUERY_CHART_MARKS])("should_compile_%s_to_an_svg", async (mark) => {
    const svg = await renderNotebookChartSvg({ mark }, sourceFor(mark));

    expect(svg).toMatch(/^<svg /);
  });

  /**
   * THE ASSERTION THIS WHOLE FEATURE RESTS ON.
   *
   * `--chart-1` is a bare HSL triple in `styles/globals.css`, so the palette
   * has to reach the SVG as `hsl(var(--chart-1))` — `var(--chart-1)` alone is
   * not a valid paint and renders black. Vega is free to normalise, resolve or
   * discard a colour string it does not understand, so "the config says so" is
   * not evidence. The compiled bytes are.
   */
  it.each([...NOTEBOOK_QUERY_CHART_MARKS])(
    "should_paint_%s_from_the_theme_palette_token",
    async (mark) => {
      const svg = await renderNotebookChartSvg({ mark }, sourceFor(mark));

      expect(svg).toContain("hsl(var(--chart-1))");
    }
  );

  it.each([...NOTEBOOK_QUERY_CHART_MARKS])(
    "should_emit_no_raw_colour_literal_anywhere_in_%s",
    async (mark) => {
      const svg = await renderNotebookChartSvg({ mark }, sourceFor(mark));

      expect(svg).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(svg).not.toMatch(/rgba?\(\s*\d/);
      expect(svg).not.toMatch(/hsla?\(\s*\d/);
    }
  );

  /**
   * The guards, run against the only input that can prove the allowlists are
   * not too TIGHT. A fail-closed guard that refuses real output turns every
   * chart into a table, silently — which looks like the feature not shipping
   * rather than like a bug.
   */
  it.each([...NOTEBOOK_QUERY_CHART_MARKS])("should_satisfy_both_guards_for_%s", async (mark) => {
    const svg = await renderNotebookChartSvg({ mark }, sourceFor(mark));

    expect(svg === null ? "null" : isSafeChartSvg(svg)).toBe(true);
    expect(svg === null ? "null" : isThemedChartSvg(svg)).toBe(true);
  });
});

describe("the root element handed to the page", () => {
  it("should_keep_its_viewbox_and_lose_its_intrinsic_size", async () => {
    const svg = await renderNotebookChartSvg({ mark: "bar" }, sourceFor("bar"));
    const root = (svg ?? "").slice(0, (svg ?? "").indexOf(">") + 1);

    expect(root).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/);
    expect(root).not.toMatch(/\swidth=/);
    expect(root).not.toMatch(/\sheight=/);
  });

  it("should_be_hidden_from_assistive_technology_and_the_tab_order", async () => {
    const svg = await renderNotebookChartSvg({ mark: "bar" }, sourceFor("bar"));
    const root = (svg ?? "").slice(0, (svg ?? "").indexOf(">") + 1);

    expect(root).toContain('aria-hidden="true"');
    expect(root).toContain('focusable="false"');
  });
});

/**
 * THE TWO LABELS THAT MUST NOT BREAK ANYTHING.
 *
 * Both are real community and project names, not attacks, and both are exactly
 * what a substring blacklist would refuse. They are here rather than only in
 * the guard's own suite because the guard could be right about a fixture and
 * wrong about what vega really emits for these strings.
 */
describe("labels a real community might have", () => {
  it("should_render_a_project_named_after_a_hex_colour", async () => {
    const svg = await renderNotebookChartSvg(
      { mark: "bar" },
      labelledResult(["#ff0000 Collective", "Program Two"])
    );

    expect(svg).toContain("#ff0000 Collective");
  });

  it("should_render_a_project_whose_name_looks_like_markup_as_escaped_text", async () => {
    const svg = await renderNotebookChartSvg(
      { mark: "bar" },
      labelledResult(["<script>alert(1)</script>", "Program Two"])
    );

    expect(svg).not.toBeNull();
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).not.toContain("<script");
  });
});

/**
 * A SPEC THIS BUILD PRODUCES CANNOT NAME A RESOURCE — `data` is always inline
 * values. The blocked loader is the second boundary behind that, and this is
 * the assertion that the first one holds in practice: a real compile of every
 * mark, with nothing touching the network.
 */
describe("the network", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should_never_be_touched_while_compiling_a_chart", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    for (const mark of NOTEBOOK_QUERY_CHART_MARKS) {
      await renderNotebookChartSvg({ mark }, sourceFor(mark));
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("degrading to the table", () => {
  it("should_resolve_to_null_when_there_is_nothing_to_draw", async () => {
    await expect(renderNotebookChartSvg({ mark: "bar" }, labelledResult([]))).resolves.toBeNull();
  });

  it("should_resolve_to_null_rather_than_reject_on_a_mark_the_grouping_forbids", async () => {
    await expect(
      renderNotebookChartSvg({ mark: "line" }, labelledResult(["Program One"]))
    ).resolves.toBeNull();
  });
});

/**
 * Determinism is what makes the output CACHEABLE by content.
 *
 * The page caches a compiled chart under a digest of the result, so two
 * compilations of one result that differed by a pixel would serve a reader a
 * chart that disagrees with the table printed beneath it after a revalidation.
 */
describe("determinism", () => {
  it("should_compile_the_same_result_to_the_same_bytes_twice", async () => {
    const [first, second] = await Promise.all([
      renderNotebookChartSvg({ mark: "bar" }, sourceFor("bar")),
      renderNotebookChartSvg({ mark: "bar" }, sourceFor("bar")),
    ]);

    expect(first).toBe(second);
  });
});

/**
 * A SOFT BENCHMARK, not a gate.
 *
 * Compilation is synchronous CPU on the request thread and the page compiles
 * its charts sequentially, so a mark that became an order of magnitude slower
 * would show up as page latency long before it showed up as a failure. The
 * bound is generous because CI machines are not fast; a breach means look, not
 * revert.
 */
describe("compile cost", () => {
  it("should_compile_a_chart_well_inside_a_page_render_budget", async () => {
    const started = performance.now();

    await renderNotebookChartSvg({ mark: "bar" }, sourceFor("bar"));

    expect(performance.now() - started).toBeLessThan(2000);
  });
});
