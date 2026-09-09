import { describe, expect, it } from "vitest";
import {
  buildNotebookChartVegaLiteSpec,
  NOTEBOOK_CHART_MARK_TEMPLATES,
  NOTEBOOK_CHART_MAX_ROWS,
  NOTEBOOK_CHART_PALETTE,
  NOTEBOOK_CHART_SIZE_WIDTH,
  NOTEBOOK_CHART_VEGA_CONFIG,
} from "@/services/notebooks/notebook-chart-vega";
import type { NotebookMetricQueryResult } from "@/services/notebooks/notebook-metric-registry.types";
import {
  NOTEBOOK_QUERY_CHART_MARKS,
  NOTEBOOK_QUERY_CHART_SIZES,
  type NotebookQueryChart,
  type NotebookQueryChartMark,
} from "@/services/notebooks/notebook-spec";

/**
 * The result factory, kept the same shape as the one the section tests use, so
 * a payload that renders a table renders a chart from the identical object.
 */
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
 * A DATE-GROUPED result, shaped exactly as the resolver emits one.
 *
 * `gap-indexer/.../notebook-metric.read.service.ts` buckets the raw indicator
 * points by day, sorts the buckets ASCENDING by date string and emits
 * `row(date, date, { date }, sum)` — so the key and the label are both the ISO
 * day and the rows arrive already in order. That ordering is the entire reason
 * a line is honest here, and the reason the builder must not re-sort it.
 */
function dateResult(values: Array<number | null> = [3, 5, 4]): NotebookMetricQueryResult {
  const days = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"];

  return result({
    query: { ...result().query, groupBy: "date", window: "12m" },
    columns: [
      { id: "label", label: "Label", valueKind: "text", unit: null },
      { id: "date", label: "Date", valueKind: "text", unit: null },
      { id: "value", label: "Disbursed", valueKind: "currency", unit: "USDC" },
    ],
    rows: values.map((value, index) => ({
      key: days[index],
      label: days[index],
      dimensions: { date: days[index] },
      value,
      displayValue: value === null ? "—" : `$${value}`,
    })),
  });
}

/**
 * Two complete parts of one whole.
 *
 * The default factory holds a SINGLE row, and a single row is the one thing a
 * donut cannot honestly draw: one slice is the whole circle, so the picture
 * asserts 100% of something the result never measured.
 */
function twoPrograms(): NotebookMetricQueryResult {
  return result({
    rows: [
      {
        key: "prog-1",
        label: "Program One",
        dimensions: { program: "prog-1" },
        value: 1250,
        displayValue: "$1,250",
      },
      {
        key: "prog-2",
        label: "Program Two",
        dimensions: { program: "prog-2" },
        value: 400,
        displayValue: "$400",
      },
    ],
  });
}

/** A result the named mark can draw honestly: a timeline for the line, parts for the donut. */
function sourceFor(mark: NotebookQueryChartMark): NotebookMetricQueryResult {
  if (mark === "line") return dateResult();
  return twoPrograms();
}

/** Every key name anywhere in a value, however deeply nested. */
function everyKey(value: unknown, found: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) everyKey(item, found);
    return found;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      found.add(key);
      everyKey(child, found);
    }
  }
  return found;
}

const chart = (overrides: Partial<NotebookQueryChart> = {}): NotebookQueryChart => ({
  mark: "bar",
  ...overrides,
});

describe("the mark template table", () => {
  /**
   * Adding a mark is adding a row, and this is what makes that true: the
   * builder reads the template for `chart.mark` and would crash on `undefined`
   * for a mark the vocabulary grew and this table did not.
   */
  it("should_hold_a_template_for_every_mark_in_the_vocabulary", () => {
    expect(Object.keys(NOTEBOOK_CHART_MARK_TEMPLATES).sort()).toEqual(
      [...NOTEBOOK_QUERY_CHART_MARKS].sort()
    );
  });

  it("should_reserve_the_additive_rule_for_the_mark_that_asserts_a_whole", () => {
    const additive = Object.entries(NOTEBOOK_CHART_MARK_TEMPLATES)
      .filter(([, template]) => template.requiresAdditive)
      .map(([mark]) => mark);

    expect(additive).toEqual(["donut"]);
  });

  it("should_preserve_source_order_only_where_the_resolver_ordered_it", () => {
    const preserved = Object.entries(NOTEBOOK_CHART_MARK_TEMPLATES)
      .filter(([, template]) => template.preserveSourceOrder)
      .map(([mark]) => mark);

    expect(preserved).toEqual(["line"]);
  });
});

/**
 * THE SSRF BOUNDARY, STATED AS A PROPERTY OF THE OUTPUT.
 *
 * Vega's loader will fetch a `data.url` if a spec carries one, so the defence
 * that matters is that no spec this builder produces ever can: `data` is
 * constructed, not copied, and the author's chart object is read field by
 * field and never spread.
 */
describe("what the builder will and will not put in a spec", () => {
  it.each([...NOTEBOOK_QUERY_CHART_MARKS])(
    "should_inline_the_rows_and_never_a_url_for_%s",
    (mark) => {
      const spec = buildNotebookChartVegaLiteSpec(chart({ mark }), sourceFor(mark));

      expect(spec).not.toBeNull();
      expect(spec?.data).toEqual({ values: expect.any(Array) });
      expect(everyKey(spec)).not.toContain("url");
    }
  );

  /**
   * The type refuses these; a stored document from a widened indexer would
   * not. So the assertion is on the OUTPUT, not on the input's type — the
   * builder never spreads `chart`, so nothing an author stored can reach the
   * spec except `mark`, `sort` and `size`.
   */
  it("should_ignore_keys_smuggled_past_the_type", () => {
    const smuggled = {
      mark: "bar",
      data: { url: "https://attacker.invalid/steal.json" },
      transform: [{ calculate: "1", as: "x" }],
      encoding: { x: { field: "secret" } },
      config: { background: "#ff0000" },
    } as unknown as NotebookQueryChart;

    const spec = buildNotebookChartVegaLiteSpec(smuggled, result());

    expect(spec?.data).toEqual({ values: [{ label: "Program One", value: 1250 }] });
    expect(everyKey(spec)).not.toContain("transform");
    expect(everyKey(spec)).not.toContain("url");
    expect(spec?.config).toBe(NOTEBOOK_CHART_VEGA_CONFIG);
  });
});

/**
 * A grouped result carries THREE columns, and only two of them are the chart.
 *
 * The row's identity is `row.label`; the grouping dimension is a separate
 * column whose value is an id, and `displayValue` is a formatted string the
 * query layer produced. Charting either of the other two is how a picture
 * comes to disagree with the table printed beneath it.
 */
describe("which fields of a row become the chart", () => {
  const grouped = () =>
    result({
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
        {
          key: "prog-2",
          label: "Program Two",
          dimensions: { program: "prog-2" },
          value: 400,
          displayValue: "$400",
        },
      ],
    });

  it("should_plot_the_row_label_and_never_the_dimension_id", () => {
    const spec = buildNotebookChartVegaLiteSpec(chart(), grouped());

    expect(spec?.data.values).toEqual([
      { label: "Program One", value: 1250 },
      { label: "Program Two", value: 400 },
    ]);
  });

  it("should_plot_the_numeric_value_and_never_re_derive_one_from_the_display_string", () => {
    const withMisleadingDisplay = grouped();
    withMisleadingDisplay.rows[0].displayValue = "$9,999";

    const spec = buildNotebookChartVegaLiteSpec(chart(), withMisleadingDisplay);

    expect(spec?.data.values[0].value).toBe(1250);
  });

  it("should_title_the_axes_from_the_column_labels_the_result_declares", () => {
    const spec = buildNotebookChartVegaLiteSpec(chart(), grouped());

    expect(spec?.encoding.x?.axis?.title).toBe("Program");
    expect(spec?.encoding.y?.axis?.title).toBe("Disbursed (USDC)");
  });
});

describe("ordering", () => {
  const three = () =>
    result({
      rows: [
        { key: "b", label: "Beta", dimensions: {}, value: 5, displayValue: "$5" },
        { key: "c", label: "Alpha", dimensions: {}, value: 9, displayValue: "$9" },
        { key: "a", label: "Gamma", dimensions: {}, value: 1, displayValue: "$1" },
      ],
    });

  it("should_order_by_largest_value_when_the_author_stored_no_sort", () => {
    const spec = buildNotebookChartVegaLiteSpec(chart(), three());

    expect(spec?.data.values.map((datum) => datum.label)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it.each([
    ["value-asc", ["Gamma", "Beta", "Alpha"]],
    ["label-asc", ["Alpha", "Beta", "Gamma"]],
    ["source", ["Beta", "Alpha", "Gamma"]],
  ] as const)("should_order_by_%s_when_the_author_stored_it", (sort, expected) => {
    const spec = buildNotebookChartVegaLiteSpec(chart({ sort }), three());

    expect(spec?.data.values.map((datum) => datum.label)).toEqual(expected);
  });

  /**
   * The category scale must not re-sort what was just sorted. Vega-Lite sorts
   * a nominal field alphabetically by default, so `sort: null` on the category
   * channel is what makes the order above the order drawn.
   */
  it("should_tell_vega_lite_not_to_reorder_a_categorical_scale", () => {
    const spec = buildNotebookChartVegaLiteSpec(chart(), three());

    expect(spec?.encoding.x?.sort).toBeNull();
  });

  /**
   * A line's order is the resolver's, and the resolver sorted it by date. A
   * `value-desc` on a line would draw a monotonic descent over a scrambled
   * timeline — the single most misleading picture this feature could produce.
   */
  it("should_keep_the_resolvers_date_order_even_when_a_sort_is_stored", () => {
    const spec = buildNotebookChartVegaLiteSpec(
      chart({ mark: "line", sort: "value-desc" }),
      dateResult()
    );

    expect(spec?.data.values.map((datum) => datum.label)).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]);
  });

  it("should_read_a_date_grouping_as_a_utc_timeline_rather_than_as_names", () => {
    const spec = buildNotebookChartVegaLiteSpec(chart({ mark: "line" }), dateResult());

    expect(spec?.encoding.x?.type).toBe("temporal");
    // Without this a date-only string is parsed in the server's local zone and
    // every point slides by the offset — a chart that disagrees with its own
    // table on which day a figure belongs to.
    expect(spec?.encoding.x?.scale).toEqual({ type: "utc" });
  });
});

/**
 * DEGRADING TO THE TABLE IS THE PRODUCT BEHAVIOUR, not an error path.
 *
 * `null` means "render the figures instead". Every case below is a picture
 * that would be wrong, misleading or unreadable, and a table is none of those.
 */
describe("when the builder declines to draw", () => {
  it("should_decline_an_empty_result", () => {
    expect(buildNotebookChartVegaLiteSpec(chart(), result({ rows: [] }))).toBeNull();
  });

  it("should_decline_a_result_whose_every_figure_is_absent", () => {
    const absent = result({
      rows: [
        { key: "a", label: "Alpha", dimensions: {}, value: null, displayValue: "—" },
        { key: "b", label: "Beta", dimensions: {}, value: null, displayValue: "—" },
      ],
    });

    expect(buildNotebookChartVegaLiteSpec(chart(), absent)).toBeNull();
  });

  it("should_draw_the_figures_it_has_and_drop_only_the_absent_rows", () => {
    const partial = result({
      rows: [
        { key: "a", label: "Alpha", dimensions: {}, value: 4, displayValue: "$4" },
        { key: "b", label: "Beta", dimensions: {}, value: null, displayValue: "—" },
      ],
    });

    const spec = buildNotebookChartVegaLiteSpec(chart(), partial);

    expect(spec?.data.values).toEqual([{ label: "Alpha", value: 4 }]);
  });

  it("should_decline_a_result_past_the_row_cap", () => {
    const overCap = result({
      rows: Array.from({ length: NOTEBOOK_CHART_MAX_ROWS + 1 }, (_, index) => ({
        key: `k-${index}`,
        label: `Item ${index}`,
        dimensions: {},
        value: index + 1,
        displayValue: `$${index + 1}`,
      })),
    });

    expect(buildNotebookChartVegaLiteSpec(chart(), overCap)).toBeNull();
    expect(
      buildNotebookChartVegaLiteSpec(chart(), result({ rows: overCap.rows.slice(1) }))
    ).not.toBeNull();
  });

  /**
   * A donut's arcs are shares of their own sum. Percentages already are shares
   * of something else, so summing them produces a denominator that exists
   * nowhere, and a negative value has no arc at all.
   */
  it("should_decline_a_donut_over_percentages", () => {
    const percent = result({
      columns: [
        { id: "label", label: "Program", valueKind: "text", unit: null },
        { id: "value", label: "SLA met", valueKind: "percent", unit: "%" },
      ],
      rows: [
        { key: "a", label: "Alpha", dimensions: {}, value: 90, displayValue: "90%" },
        { key: "b", label: "Beta", dimensions: {}, value: 80, displayValue: "80%" },
      ],
    });

    expect(buildNotebookChartVegaLiteSpec(chart({ mark: "donut" }), percent)).toBeNull();
    // The same figures as bars are perfectly honest, so the refusal has to be
    // the donut's and not the metric's.
    expect(buildNotebookChartVegaLiteSpec(chart({ mark: "bar" }), percent)).not.toBeNull();
  });

  it("should_decline_a_donut_over_a_negative_figure", () => {
    const negative = result({
      rows: [
        { key: "a", label: "Alpha", dimensions: {}, value: -5, displayValue: "-$5" },
        { key: "b", label: "Beta", dimensions: {}, value: 9, displayValue: "$9" },
      ],
    });

    expect(buildNotebookChartVegaLiteSpec(chart({ mark: "donut" }), negative)).toBeNull();
    expect(buildNotebookChartVegaLiteSpec(chart({ mark: "bar" }), negative)).not.toBeNull();
  });

  /**
   * `row.key` IS THE IDENTITY; `row.label` IS ONLY THE DISPLAY NAME.
   *
   * The query contract guarantees the first is unique and says nothing about
   * the second, so two programs — or two projects — may legitimately be called
   * the same thing. A nominal scale keyed on that name puts both at ONE
   * coordinate: one bar hides the other, and two arcs merge into a single
   * slice in a single colour. Neither figure is readable and the picture
   * disagrees with the table beneath it.
   *
   * The chart is declined rather than repaired, because every repair invents
   * something: a suffix would print a name the data does not have, and keying
   * the scale on `row.key` would label the axis with ids.
   */
  it("should_decline_a_result_whose_rows_share_a_display_label", () => {
    const collides = result({
      rows: [
        {
          key: "prog-1",
          label: "Retro Funding",
          dimensions: { program: "prog-1" },
          value: 900,
          displayValue: "$900",
        },
        {
          key: "prog-2",
          label: "Retro Funding",
          dimensions: { program: "prog-2" },
          value: 400,
          displayValue: "$400",
        },
      ],
    });

    expect(buildNotebookChartVegaLiteSpec(chart({ mark: "bar" }), collides)).toBeNull();
    expect(buildNotebookChartVegaLiteSpec(chart({ mark: "hbar" }), collides)).toBeNull();
    expect(buildNotebookChartVegaLiteSpec(chart({ mark: "donut" }), collides)).toBeNull();
  });

  /**
   * The same two rows under two names draw perfectly well, so the refusal is
   * the collision's and not the shape's.
   */
  it("should_draw_the_same_two_rows_when_their_labels_differ", () => {
    expect(buildNotebookChartVegaLiteSpec(chart({ mark: "bar" }), twoPrograms())).not.toBeNull();
  });

  /**
   * ONE SLICE IS THE WHOLE CIRCLE.
   *
   * A donut asserts that its arcs are the parts of something, and a lone
   * positive figure drawn as a full ring asserts it is 100% of that something
   * — a claim the result never made. The identical figure as a bar claims
   * nothing beyond its own height.
   */
  it("should_decline_a_donut_over_a_single_part", () => {
    expect(buildNotebookChartVegaLiteSpec(chart({ mark: "donut" }), result())).toBeNull();
    expect(buildNotebookChartVegaLiteSpec(chart({ mark: "bar" }), result())).not.toBeNull();
  });

  /**
   * AN ABSENT PART IS NOT A MISSING PART OF THE PICTURE — IT IS A MISSING PART
   * OF THE WHOLE.
   *
   * Dropping a row with no figure is right for a bar, which only ever claims
   * the heights it draws. For a donut it silently re-bases the denominator on
   * the rows that survived, so the remaining arcs are drawn as the entire
   * whole. The table prints the em dash and tells the truth.
   */
  it("should_decline_a_donut_when_a_part_of_the_whole_is_absent", () => {
    const incomplete = result({
      rows: [
        { key: "a", label: "Alpha", dimensions: {}, value: 4, displayValue: "$4" },
        { key: "b", label: "Beta", dimensions: {}, value: 6, displayValue: "$6" },
        { key: "c", label: "Gamma", dimensions: {}, value: null, displayValue: "—" },
      ],
    });

    expect(buildNotebookChartVegaLiteSpec(chart({ mark: "donut" }), incomplete)).toBeNull();
    // A bar claims only the heights it draws, so the absent row is still fine
    // to leave out there.
    expect(buildNotebookChartVegaLiteSpec(chart({ mark: "bar" }), incomplete)).not.toBeNull();
  });

  /**
   * The grouping law again, at the LAST boundary rather than the first. A
   * stored document predating the refine, or one written by a widened indexer,
   * reaches this builder — and a line over programs must degrade to a table
   * rather than draw a slope nobody can defend.
   */
  it.each([
    ["a line over an unordered grouping", "line", "program"],
    ["a bar over a timeline", "bar", "date"],
    ["an ungrouped donut", "donut", "none"],
  ] as const)("should_decline_%s", (_label, mark, groupBy) => {
    const source = result({ query: { ...result().query, groupBy } });

    expect(buildNotebookChartVegaLiteSpec(chart({ mark }), source)).toBeNull();
  });
});

/**
 * COLOUR COMES FROM THE THEME OR IT DOES NOT COME.
 *
 * `--chart-N` is a BARE HSL TRIPLE, so `var(--chart-1)` alone is not a valid
 * paint and paints black. The `hsl()` wrapper is what makes the token usable,
 * and it is the same shape `components/ui/sidebar.tsx` uses for its own tokens.
 */
describe("the palette and the vega config", () => {
  it("should_wrap_every_palette_token_in_hsl", () => {
    expect([...NOTEBOOK_CHART_PALETTE]).toEqual([
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))",
    ]);
  });

  /**
   * Vega emits its own defaults — raw hex — for every channel the config does
   * not cover, so "exhaustive" is the requirement and this is the cheap half
   * of checking it. The expensive half is the compiled-output test beside the
   * renderer, which is the only thing that can see a channel we forgot.
   */
  it("should_carry_no_raw_colour_literal_anywhere_in_the_config", () => {
    const serialised = JSON.stringify(NOTEBOOK_CHART_VEGA_CONFIG);

    expect(serialised.match(/#[0-9a-fA-F]{3,8}/g)).toBeNull();
    expect(serialised.match(/rgba?\(\s*\d/g)).toBeNull();
    expect(serialised.match(/hsla?\(\s*\d/g)).toBeNull();
  });

  it("should_offer_the_palette_as_the_categorical_range_a_donut_reads", () => {
    expect(NOTEBOOK_CHART_VEGA_CONFIG.range.category).toEqual(NOTEBOOK_CHART_PALETTE);
  });

  it("should_attach_the_same_config_to_every_spec_it_builds", () => {
    const spec = buildNotebookChartVegaLiteSpec(chart(), result());

    expect(spec?.config).toBe(NOTEBOOK_CHART_VEGA_CONFIG);
  });
});

describe("size", () => {
  it("should_widen_the_canvas_as_the_stored_size_grows", () => {
    const small = buildNotebookChartVegaLiteSpec(chart({ size: "sm" }), result());
    const large = buildNotebookChartVegaLiteSpec(chart({ size: "lg" }), result());

    expect(small?.width).toBeLessThan(large?.width ?? 0);
  });

  it("should_give_a_horizontal_bar_a_height_that_grows_with_its_rows", () => {
    const two = buildNotebookChartVegaLiteSpec(
      chart({ mark: "hbar" }),
      result({
        rows: [
          { key: "a", label: "Alpha", dimensions: {}, value: 4, displayValue: "$4" },
          { key: "b", label: "Beta", dimensions: {}, value: 9, displayValue: "$9" },
        ],
      })
    );
    const one = buildNotebookChartVegaLiteSpec(chart({ mark: "hbar" }), result());

    expect(two?.height).toBeGreaterThan(one?.height ?? 0);
  });

  /**
   * `NotebookQueryChart.tsx` caps the rendered SVG's width by reading this
   * map — imported straight from this pure module rather than a second
   * literal on the client. A size missing here is a chart the wrapper cannot
   * cap, which is exactly the bug this map exists to prevent.
   */
  it("should_export_a_client_side_width_for_every_chart_size", () => {
    expect(Object.keys(NOTEBOOK_CHART_SIZE_WIDTH).sort()).toEqual(
      [...NOTEBOOK_QUERY_CHART_SIZES].sort()
    );
    for (const size of NOTEBOOK_QUERY_CHART_SIZES) {
      expect(NOTEBOOK_CHART_SIZE_WIDTH[size]).toBeGreaterThan(0);
    }
  });

  it("should_match_the_compiled_spec_width_for_every_size", () => {
    for (const size of NOTEBOOK_QUERY_CHART_SIZES) {
      const spec = buildNotebookChartVegaLiteSpec(chart({ size }), result());
      expect(spec?.width).toBe(NOTEBOOK_CHART_SIZE_WIDTH[size]);
    }
  });

  it("should_keep_sm_clearly_smaller_and_lg_clearly_larger_than_md", () => {
    expect(NOTEBOOK_CHART_SIZE_WIDTH.sm).toBeLessThan(NOTEBOOK_CHART_SIZE_WIDTH.md);
    expect(NOTEBOOK_CHART_SIZE_WIDTH.lg).toBeGreaterThan(NOTEBOOK_CHART_SIZE_WIDTH.md);
  });
});

/**
 * VEGA'S OWN DEFAULT FONT SIZE IS SMALL, AND IT IS WHAT GETS MAGNIFIED.
 *
 * The wrapper caps the rendered width at the chart's intrinsic width, which
 * keeps the `viewBox` scale factor near 1x — but a 1x scale of an UNSET font
 * size still renders at whatever tiny default vega picked. Every text channel
 * a spec can carry needs an explicit size for that reason, not just a capped
 * container.
 */
describe("explicit font sizes", () => {
  it("should_declare_an_explicit_axis_label_and_title_font_size", () => {
    expect(NOTEBOOK_CHART_VEGA_CONFIG.axis.labelFontSize).toBeGreaterThan(0);
    expect(NOTEBOOK_CHART_VEGA_CONFIG.axis.titleFontSize).toBeGreaterThan(0);
  });

  it("should_declare_an_explicit_legend_label_and_title_font_size", () => {
    expect(NOTEBOOK_CHART_VEGA_CONFIG.legend.labelFontSize).toBeGreaterThan(0);
    expect(NOTEBOOK_CHART_VEGA_CONFIG.legend.titleFontSize).toBeGreaterThan(0);
  });

  it("should_declare_an_explicit_value_text_font_size", () => {
    expect(NOTEBOOK_CHART_VEGA_CONFIG.text.fontSize).toBeGreaterThan(0);
  });

  // The point of this whole fix: chart text reads smaller than the app's own
  // 14px body copy, not larger than it.
  it("should_keep_every_declared_font_size_smaller_than_the_app_body_text", () => {
    const APP_BODY_FONT_SIZE = 14;

    expect(NOTEBOOK_CHART_VEGA_CONFIG.axis.labelFontSize).toBeLessThan(APP_BODY_FONT_SIZE);
    expect(NOTEBOOK_CHART_VEGA_CONFIG.axis.titleFontSize).toBeLessThan(APP_BODY_FONT_SIZE);
    expect(NOTEBOOK_CHART_VEGA_CONFIG.legend.labelFontSize).toBeLessThan(APP_BODY_FONT_SIZE);
    expect(NOTEBOOK_CHART_VEGA_CONFIG.legend.titleFontSize).toBeLessThan(APP_BODY_FONT_SIZE);
    expect(NOTEBOOK_CHART_VEGA_CONFIG.text.fontSize).toBeLessThan(APP_BODY_FONT_SIZE);
  });
});

/**
 * `bar` PUTS ITS CATEGORY ON `x`, WHERE A LONG NAME HAS NO ROOM.
 *
 * Left at Vega-Lite's own default, a category too wide to fit horizontally
 * rotates to 90° and a programme name then costs the chart's entire height.
 * `hbar` already exists for genuinely long names, so `bar` only needs to stop
 * being absurd, not to grow a second long-name strategy.
 */
describe("the vertical bar's category axis", () => {
  it("should_angle_the_bar_category_labels_rather_than_rotate_them_vertical", () => {
    const spec = buildNotebookChartVegaLiteSpec(chart({ mark: "bar" }), twoPrograms());

    const angle = spec?.encoding.x?.axis?.labelAngle;
    expect(angle).toBeDefined();
    expect(angle).not.toBe(0);
    // Neither vertical (±90°) nor upside down — a shallow diagonal a reader
    // can still read left-to-right.
    expect(Math.abs(angle ?? 0)).toBeGreaterThanOrEqual(30);
    expect(Math.abs(angle ?? 0)).toBeLessThanOrEqual(45);
  });

  it("should_cap_the_bar_category_label_length_so_long_names_truncate", () => {
    const spec = buildNotebookChartVegaLiteSpec(chart({ mark: "bar" }), twoPrograms());

    expect(spec?.encoding.x?.axis?.labelLimit).toBeGreaterThan(0);
  });

  // `hbar` already reads a long name horizontally along its own row; angling
  // it too would be the vertical-bar fix applied to a mark that never had the
  // problem.
  it("should_leave_the_horizontal_bar_category_axis_unrotated", () => {
    const spec = buildNotebookChartVegaLiteSpec(chart({ mark: "hbar" }), twoPrograms());

    expect(spec?.encoding.y?.axis?.labelAngle).toBeUndefined();
  });
});
