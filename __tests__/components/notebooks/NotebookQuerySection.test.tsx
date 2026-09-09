import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotebookQueryTable } from "@/components/Pages/Communities/Notebooks/NotebookQueryTable";
import {
  NOTEBOOK_METRIC_AGGREGATIONS,
  NOTEBOOK_METRIC_DIMENSIONS,
  NOTEBOOK_METRIC_WINDOWS,
  type NotebookMetricQueryResult,
} from "@/services/notebooks/notebook-metric-registry.types";
import { querySectionKey } from "@/services/notebooks/notebook-page-data.types";
import {
  isNotebookChartMarkValidForGrouping,
  isNotebookChartSortValidForMark,
  NOTEBOOK_QUERY_AGGREGATIONS,
  NOTEBOOK_QUERY_CHART_MARK_GROUPING,
  NOTEBOOK_QUERY_CHART_MARKS,
  NOTEBOOK_QUERY_CHART_SIZES,
  NOTEBOOK_QUERY_CHART_SORTS,
  NOTEBOOK_QUERY_DIMENSION_GROUPING,
  NOTEBOOK_QUERY_DIMENSIONS,
  NOTEBOOK_QUERY_WINDOWS,
  NOTEBOOK_TEMPORAL_QUERY_CHART_SORT,
  NotebookQuerySectionSchema,
  resolveNotebookChartSize,
  resolveNotebookChartSort,
} from "@/services/notebooks/notebook-spec";

function result(overrides: Partial<NotebookMetricQueryResult> = {}): NotebookMetricQueryResult {
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
    ...overrides,
  };
}

/**
 * The stored vocabulary and the registry's have to agree.
 *
 * They are declared separately on purpose — the spec describes what may be
 * PERSISTED, and a stored page must not become invalid because a service
 * constant was refactored. Separate declarations mean drift is possible, so
 * this is where it gets caught: a failure here is not a reason to relax the
 * test, it is a reason to decide deliberately what happens to pages using the
 * value that moved.
 */
describe("query vocabulary contract", () => {
  it.each([
    ["dimensions", NOTEBOOK_QUERY_DIMENSIONS, NOTEBOOK_METRIC_DIMENSIONS],
    ["windows", NOTEBOOK_QUERY_WINDOWS, NOTEBOOK_METRIC_WINDOWS],
    ["aggregations", NOTEBOOK_QUERY_AGGREGATIONS, NOTEBOOK_METRIC_AGGREGATIONS],
  ])("should_offer_the_same_%s_the_registry_does", (_label, spec, registry) => {
    expect([...spec].sort()).toEqual([...registry].sort());
  });
});

describe("NotebookQuerySectionSchema", () => {
  const valid = {
    type: "query",
    metricId: "funding.disbursed",
    groupBy: "program",
    window: "90d",
    title: "Disbursed by program",
  };

  it("should_accept_a_query_the_catalogue_could_answer", () => {
    expect(NotebookQuerySectionSchema.safeParse(valid).success).toBe(true);
  });

  // Ruled out at the schema, not merely at the picker: the catalogue publishes
  // no project list, so nothing could ever validate one, and an unvalidated id
  // is an unbounded cache key. See issue #2092.
  it("should_refuse_projectUIDs_which_nothing_can_validate", () => {
    const parsed = NotebookQuerySectionSchema.safeParse({
      ...valid,
      filters: { projectUIDs: ["0xproject"] },
    });

    expect(parsed.success).toBe(false);
  });

  it("should_refuse_a_metric_id_that_is_not_shaped_like_one", () => {
    expect(
      NotebookQuerySectionSchema.safeParse({ ...valid, metricId: "Robert'); DROP TABLE" }).success
    ).toBe(false);
  });

  it("should_refuse_a_grouping_outside_the_vocabulary", () => {
    expect(NotebookQuerySectionSchema.safeParse({ ...valid, groupBy: "everything" }).success).toBe(
      false
    );
  });
});

/**
 * THE CHART VOCABULARY, WRITTEN AS LITERALS.
 *
 * Comparing the enum against a constant derived from itself is a tautology —
 * it passes while this repo and the indexer have quietly agreed on nothing.
 * These lists are typed out because they are quoted from
 * `gap-indexer/app/modules/v2/domain/models/notebook-spec.ts`, and a literal is
 * the only form that fails when the indexer's copy moves and this one does not.
 */
describe("the chart vocabulary the indexer declares", () => {
  it("should_offer_exactly_the_marks_the_indexer_stores", () => {
    expect([...NOTEBOOK_QUERY_CHART_MARKS]).toEqual(["bar", "hbar", "donut", "line"]);
  });

  it("should_offer_exactly_the_sorts_the_indexer_stores", () => {
    expect([...NOTEBOOK_QUERY_CHART_SORTS]).toEqual([
      "value-desc",
      "value-asc",
      "label-asc",
      "source",
    ]);
  });

  it("should_offer_exactly_the_sizes_the_indexer_stores", () => {
    expect([...NOTEBOOK_QUERY_CHART_SIZES]).toEqual(["sm", "md", "lg"]);
  });
});

/**
 * A MARK IS VALID PER GROUPING, NOT GLOBALLY.
 *
 * A line asserts a trend between neighbouring points, which is true of dates
 * and false of programs — plotting one over an unordered set of categories
 * draws a slope that means nothing and that a reader will nonetheless read. A
 * donut asserts parts of a whole, which needs more than one part.
 *
 * TOTALITY IS THE TEST THAT MATTERS. Both tables are keyed by a closed
 * vocabulary, so a mark or a dimension added on either side without a decision
 * about how it draws leaves a hole here — and a hole in
 * `NOTEBOOK_QUERY_CHART_MARK_GROUPING` is a runtime `undefined.grouping`, not a
 * type error, because a `Record` over a widened key set still type-checks.
 */
describe("the mark/grouping law", () => {
  it("should_rule_on_every_mark_in_the_vocabulary", () => {
    expect(Object.keys(NOTEBOOK_QUERY_CHART_MARK_GROUPING).sort()).toEqual(
      [...NOTEBOOK_QUERY_CHART_MARKS].sort()
    );
  });

  it("should_rule_on_every_dimension_in_the_vocabulary", () => {
    expect(Object.keys(NOTEBOOK_QUERY_DIMENSION_GROUPING).sort()).toEqual(
      [...NOTEBOOK_QUERY_DIMENSIONS].sort()
    );
  });

  it.each([
    ["bar", "program", true],
    ["bar", "none", true],
    ["bar", "tier", true],
    ["bar", "function", true],
    ["bar", "project", true],
    ["hbar", "program", true],
    ["hbar", "none", true],
    ["donut", "program", true],
    ["donut", "tier", true],
    ["line", "date", true],
    // A donut of one slice is a circle, and the one slice is the whole. The
    // grouping is what produces the parts, so `none` has none.
    ["donut", "none", false],
    // The dishonest pair in each direction: a trend over unordered categories,
    // and categories over an axis that is a timeline.
    ["line", "program", false],
    ["line", "project", false],
    ["bar", "date", false],
    ["hbar", "date", false],
    ["donut", "date", false],
  ] as const)("should_answer_%s_over_%s_with_%s", (mark, groupBy, expected) => {
    expect(isNotebookChartMarkValidForGrouping(mark, groupBy)).toBe(expected);
  });
});

/**
 * A SORT IS A CLAIM TOO. Over a temporal grouping the row order IS the
 * meaning — the resolver has already sorted its date buckets ascending — so
 * any other order either redraws the line as a nonsense zig-zag or is
 * silently ignored by the renderer while the stored document goes on
 * asserting an ordering nothing ever honours.
 */
describe("the sort/mark law", () => {
  it.each([
    ["bar", "value-desc", true],
    ["bar", "value-asc", true],
    ["bar", "label-asc", true],
    ["bar", "source", true],
    ["hbar", "label-asc", true],
    ["donut", "value-desc", true],
    ["line", "source", true],
    ["line", "value-desc", false],
    ["line", "value-asc", false],
    ["line", "label-asc", false],
  ] as const)("should_answer_%s_with_%s_as_%s", (mark, sort, expected) => {
    expect(isNotebookChartSortValidForMark(mark, sort)).toBe(expected);
  });

  it("should_allow_only_the_source_order_for_every_temporal_mark", () => {
    const temporal = NOTEBOOK_QUERY_CHART_MARKS.filter(
      (mark) => NOTEBOOK_QUERY_CHART_MARK_GROUPING[mark].grouping === "temporal"
    );

    expect(temporal.length).toBeGreaterThan(0);
    for (const mark of temporal) {
      for (const sort of NOTEBOOK_QUERY_CHART_SORTS) {
        expect(isNotebookChartSortValidForMark(mark, sort)).toBe(
          sort === NOTEBOOK_TEMPORAL_QUERY_CHART_SORT
        );
      }
    }
  });
});

/**
 * The presentation object, mirrored from the indexer.
 *
 * Everything refused below is refused by `.strict()` rather than by a list of
 * banned keys, which is why the SSRF cases (`data.url`, `data.values`) and the
 * expressive ones (`encoding`, `transform`, `color`, `width`) are the same
 * test: an author's chart object carries a mark and two presentation hints,
 * and nothing that could name a resource or compute a figure.
 */
describe("NotebookQueryChartSchema, through the section it lives on", () => {
  const charted = (chart: unknown, groupBy = "program") => ({
    type: "query",
    metricId: "funding.disbursed",
    groupBy,
    window: "90d",
    title: "Disbursed by program",
    chart,
  });

  it.each([
    ["a bar over a categorical grouping", { mark: "bar" }, "program"],
    ["a bar with both presentation hints", { mark: "bar", sort: "value-asc", size: "lg" }, "tier"],
    ["a horizontal bar", { mark: "hbar", sort: "label-asc" }, "project"],
    ["an ungrouped bar", { mark: "bar" }, "none"],
    ["a grouped donut", { mark: "donut", size: "sm" }, "program"],
    ["a line over dates", { mark: "line", sort: "source" }, "date"],
    ["a line over dates that leaves the sort absent", { mark: "line" }, "date"],
  ] as const)("should_accept_%s", (_label, chart, groupBy) => {
    const parsed = NotebookQuerySectionSchema.safeParse(charted(chart, groupBy));

    expect(parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join("."))).toEqual(
      []
    );
  });

  it("should_accept_a_query_section_that_names_no_chart_at_all", () => {
    const { chart: _chart, ...withoutChart } = charted({ mark: "bar" });

    expect(NotebookQuerySectionSchema.safeParse(withoutChart).success).toBe(true);
  });

  it.each([
    ["a mark outside the vocabulary", { mark: "sankey" }, "program"],
    ["a sort outside the vocabulary", { mark: "bar", sort: "value" }, "program"],
    ["a size outside the vocabulary", { mark: "bar", size: "xl" }, "program"],
    ["no mark at all", { sort: "value-desc" }, "program"],
    // The SSRF pair. Neither key exists on either side, so a stored spec can
    // never name a resource for the renderer to fetch.
    ["a data url", { mark: "bar", data: { url: "https://attacker.invalid/x.json" } }, "program"],
    [
      "inline data values",
      { mark: "bar", data: { values: [{ label: "x", value: 1 }] } },
      "program",
    ],
    // A spec SELECTS and LABELS; it cannot compute. These are the keys that
    // would let it.
    ["an encoding block", { mark: "bar", encoding: { x: { field: "label" } } }, "program"],
    ["a transform block", { mark: "bar", transform: [{ calculate: "1", as: "y" }] }, "program"],
    ["a raw colour", { mark: "bar", color: "#ff0000" }, "program"],
    ["an explicit width", { mark: "bar", width: 4000 }, "program"],
    // The grouping law, at the schema.
    ["an ungrouped donut", { mark: "donut" }, "none"],
    ["a bar over dates", { mark: "bar" }, "date"],
    ["a line over programs", { mark: "line" }, "program"],
    // A sort a temporal mark can never honour: the schema refuses the claim
    // rather than storing an inert one.
    ["a line ranked by value", { mark: "line", sort: "value-desc" }, "date"],
  ] as const)("should_refuse_%s", (_label, chart, groupBy) => {
    expect(NotebookQuerySectionSchema.safeParse(charted(chart, groupBy)).success).toBe(false);
  });

  // The builder reads the issue path to mark the offending control, so the
  // path is part of the contract rather than an artefact of where the refine
  // was attached.
  it("should_blame_the_mark_when_it_cannot_draw_the_grouping", () => {
    const parsed = NotebookQuerySectionSchema.safeParse(charted({ mark: "donut" }, "none"));

    expect(
      parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join("."))
    ).toContain("chart.mark");
  });

  it("should_blame_the_sort_when_a_temporal_mark_cannot_honour_it", () => {
    const parsed = NotebookQuerySectionSchema.safeParse(
      charted({ mark: "line", sort: "value-desc" }, "date")
    );

    expect(
      parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join("."))
    ).toContain("chart.sort");
  });
});

/**
 * WHY THESE ARE FUNCTIONS AND NOT `.default()`.
 *
 * The indexer publishes this schema as JSON Schema, and Ajv in strict mode
 * refuses a `default` keyword inside a response schema at `app.ready()` — the
 * whole server fails to boot. So the stored document genuinely omits the key
 * and the reader supplies the value, on both sides, from these.
 */
describe("the chart presentation resolvers", () => {
  it("should_default_an_unsorted_chart_to_the_largest_value_first", () => {
    expect(resolveNotebookChartSort("bar", undefined)).toBe("value-desc");
  });

  it("should_default_an_unsized_chart_to_the_middle_size", () => {
    expect(resolveNotebookChartSize({ mark: "bar" })).toBe("md");
  });

  it("should_return_what_the_author_stored_when_they_stored_one", () => {
    expect(resolveNotebookChartSort("bar", "label-asc")).toBe("label-asc");
    expect(resolveNotebookChartSize({ mark: "bar", size: "lg" })).toBe("lg");
  });

  // The resolver must not hand a temporal mark the categorical default: the
  // renderer preserves source order for a line, so a resolved `value-desc`
  // would be a value nothing acts on.
  it("should_resolve_a_temporal_mark_to_the_source_order_regardless_of_what_was_stored", () => {
    expect(resolveNotebookChartSort("line", undefined)).toBe(NOTEBOOK_TEMPORAL_QUERY_CHART_SORT);
  });

  it("should_resolve_every_mark_to_a_sort_that_mark_can_honour", () => {
    for (const mark of NOTEBOOK_QUERY_CHART_MARKS) {
      expect(isNotebookChartSortValidForMark(mark, resolveNotebookChartSort(mark, undefined))).toBe(
        true
      );
    }
  });
});

/**
 * Two sections asking the same question must share one key.
 *
 * The key is what makes a page fetch once instead of once per section, so a
 * key that varied with filter ORDER would silently double the work for a page
 * whose author happened to tick two programs in a different sequence.
 */
describe("querySectionKey", () => {
  it("should_key_two_orderings_of_the_same_filters_identically", () => {
    const a = querySectionKey({
      metricId: "m",
      groupBy: "program",
      window: "90d",
      filters: { programIds: ["b", "a"], inScope: true },
    });
    const b = querySectionKey({
      metricId: "m",
      groupBy: "program",
      window: "90d",
      filters: { inScope: true, programIds: ["a", "b"] },
    });

    expect(a).toBe(b);
  });

  it("should_key_a_duplicate_id_the_same_as_a_single_one", () => {
    const once = querySectionKey({
      metricId: "m",
      groupBy: "none",
      window: "90d",
      filters: { programIds: ["a"] },
    });
    const twice = querySectionKey({
      metricId: "m",
      groupBy: "none",
      window: "90d",
      filters: { programIds: ["a", "a"] },
    });

    expect(once).toBe(twice);
  });

  it.each([
    ["a different metric", { metricId: "other", groupBy: "none", window: "90d" }],
    ["a different grouping", { metricId: "m", groupBy: "program", window: "90d" }],
    ["a different window", { metricId: "m", groupBy: "none", window: "all" }],
    [
      "a different filter value",
      { metricId: "m", groupBy: "none", window: "90d", filters: { programIds: ["z"] } },
    ],
  ])("should_key_%s_differently", (_label, section) => {
    const base = querySectionKey({ metricId: "m", groupBy: "none", window: "90d" });

    expect(querySectionKey(section)).not.toBe(base);
  });
});

/**
 * THE REAL PAYLOAD SHAPE, taken from the live rig.
 *
 * A grouped query returns THREE columns — `label`, the grouping dimension,
 * and the measure — not the two a hand-written fixture naturally assumes.
 * The single-text-column fixture above is what let this renderer print
 * `row.label` in both text columns undetected: the mock was more cooperative
 * than the wire. These cases pin the shape the server actually sends.
 */
describe("a grouped result, shaped as the server actually sends it", () => {
  const grouped = () =>
    result({
      query: { ...result().query, groupBy: "program" },
      columns: [
        { id: "label", label: "Program", valueKind: "text", unit: null },
        { id: "program", label: "Program id", valueKind: "text", unit: null },
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
    });

  it("should_render_the_dimension_column_from_the_row_dimensions_not_the_label", () => {
    render(<NotebookQueryTable result={grouped()} />);

    const cells = screen.getAllByRole("cell").map((cell) => cell.textContent);
    expect(cells).toEqual(["Program One", "prog-1", "$1,250"]);
  });

  it("should_render_an_em_dash_for_a_dimension_the_row_does_not_carry", () => {
    const missing = grouped();
    missing.rows[0].dimensions = {};

    render(<NotebookQueryTable result={missing} />);

    // Not a blank cell: a blank reads as a rendering fault, the em dash
    // reads as absent data.
    expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "Program One",
      "—",
      "$1,250",
    ]);
  });
});

describe("NotebookQueryTable", () => {
  it("should_render_the_declared_columns_and_the_query_layers_display_values", () => {
    render(<NotebookQueryTable result={result()} />);

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Program",
      "Disbursed (USDC)",
    ]);
    expect(screen.getByText("$1,250")).toBeInTheDocument();
  });

  // The renderer never re-derives from `value`, so an absent figure arrives
  // already rendered as the em dash and cannot become a zero here.
  it("should_show_the_em_dash_the_query_layer_produced_and_never_a_zero", () => {
    render(
      <NotebookQueryTable
        result={result({
          rows: [
            {
              key: "prog-1",
              label: "Program One",
              dimensions: {},
              value: null,
              displayValue: "—",
            },
          ],
        })}
      />
    );

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("should_distinguish_no_rows_from_a_failure", () => {
    render(<NotebookQueryTable result={result({ rows: [] })} />);

    expect(screen.getByText(/no rows matched/i)).toBeInTheDocument();
  });

  it("should_state_the_methodology_and_window_beside_the_figures", () => {
    render(<NotebookQueryTable result={result()} />);

    expect(screen.getByText(/Sum of payouts\./)).toBeInTheDocument();
    expect(screen.getByText(/90d/)).toBeInTheDocument();
  });
});
