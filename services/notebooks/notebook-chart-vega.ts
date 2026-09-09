import type { NotebookMetricQueryResult } from "./notebook-metric-registry.types";
import {
  isNotebookChartMarkValidForGrouping,
  type NotebookQueryChart,
  type NotebookQueryChartMark,
  type NotebookQueryChartSize,
  type NotebookQueryChartSort,
  resolveNotebookChartSize,
  resolveNotebookChartSort,
} from "./notebook-spec";

/**
 * A query result, as a Vega-Lite specification.
 *
 * PURE, AND DELIBERATELY SO. This module imports no part of vega and no part
 * of Next: it turns two plain objects into a third plain object, which is what
 * lets the whole of the drawing decision be tested without compiling anything,
 * and what keeps a 500 kB renderer out of every bundle that merely wants to
 * know whether a chart is possible.
 *
 * THE AUTHOR'S CHART OBJECT IS NEVER SPREAD. `mark`, `sort` and `size` are
 * read field by field and a fresh object literal is constructed from them, so
 * nothing else an author stored — or that a widened indexer might one day
 * store — can reach the specification. `data` is ALWAYS `{ values: … }` built
 * here from the result's rows, which is the reason a spec produced by this
 * module can never carry a `data.url` for vega's loader to fetch. That is the
 * primary SSRF boundary; the blocked loader in the renderer is the second one.
 *
 * WHAT IT CHARTS. `row.label` and `row.value`, directly. A grouped result
 * carries two or three columns — the row's identity, the grouping dimension,
 * and the measure — and only the first and the last are the picture. The
 * dimension column holds an id, and `displayValue` is a formatted string; a
 * chart derived from either would be a second opinion about the figures, free
 * to disagree with the table printed beneath it. Column LABELS are read, and
 * only to title the axes.
 *
 * RETURNING `null` IS PRODUCT BEHAVIOUR. It means "render the table instead",
 * and every case that produces it — no rows, no figures, too many rows, two
 * rows sharing a display name, a donut over percentages, over a negative
 * value, over a single part or over a whole with a part missing, a mark that
 * cannot draw the grouping — is a picture that would mislead. The table is
 * never misleading.
 */

/**
 * The categorical palette.
 *
 * THE `hsl()` WRAPPER IS LOAD-BEARING. `--chart-1` is defined in
 * `styles/globals.css` as a BARE HSL TRIPLE (`12 76% 61%`), not as a colour, so
 * `fill="var(--chart-1)"` is not a valid paint and renders black. Every
 * consumer of these tokens wraps them the same way — see the sidebar
 * primitive's `shadow-[0_0_0_1px_hsl(var(--sidebar-border))]`.
 *
 * Tokens rather than literals is also what makes a chart theme-aware for free:
 * the SVG is compiled once, cached, and resolves against whichever theme the
 * reader's document is in.
 */
export const NOTEBOOK_CHART_PALETTE: readonly string[] = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const INK = "hsl(var(--foreground))";
const MUTED = "hsl(var(--muted-foreground))";
const RULE = "hsl(var(--border))";
const SURFACE = "hsl(var(--background))";

/**
 * The page's font, not one of vega's.
 *
 * `inherit` is a legal SVG `font-family`, and it is the only value that keeps a
 * chart in the same typeface as the prose beside it without this module
 * knowing what that typeface is.
 */
const FONT = "inherit";

/** How many rows a picture can carry before it stops being readable. */
export const NOTEBOOK_CHART_MAX_ROWS = 24;

/**
 * Explicit sizes, because vega's own defaults are not.
 *
 * Vega falls back to a small internal default whenever a config does not name
 * a size, and that default is what the reader's browser then multiplies by
 * the SVG's `viewBox` → rendered-width scale factor. Naming the sizes here
 * means the scale factor is the only thing left to control, rather than an
 * unstated default riding along with it. Picked to read smaller than this
 * app's 14px body text and 16px section titles — a chart is a supporting
 * picture, not a headline.
 */
const AXIS_LABEL_FONT_SIZE = 11;
const AXIS_TITLE_FONT_SIZE = 12;
const LEGEND_LABEL_FONT_SIZE = 11;
const LEGEND_TITLE_FONT_SIZE = 12;
const VALUE_TEXT_FONT_SIZE = 12;

export interface NotebookChartVegaConfig {
  autosize: { type: "fit"; contains: "padding" };
  background: null;
  padding: number;
  font: string;
  range: { category: readonly string[] };
  axis: {
    domainColor: string;
    tickColor: string;
    gridColor: string;
    labelColor: string;
    titleColor: string;
    labelFont: string;
    titleFont: string;
    labelFontSize: number;
    titleFontSize: number;
  };
  legend: {
    labelColor: string;
    titleColor: string;
    symbolStrokeColor: string;
    labelFont: string;
    titleFont: string;
    labelFontSize: number;
    titleFontSize: number;
  };
  view: { stroke: null };
  bar: { fill: string };
  line: { stroke: string; strokeWidth: number };
  point: { fill: string; stroke: string };
  symbol: { fill: string; stroke: string };
  rule: { stroke: string };
  arc: { stroke: string; strokeWidth: number };
  text: { fill: string; font: string; fontSize: number };
  title: { color: string; subtitleColor: string; font: string; subtitleFont: string };
}

/**
 * EXHAUSTIVE ON PURPOSE.
 *
 * Vega emits its OWN defaults — raw hex, `#4c78a8` and friends — for every
 * channel a config does not cover, and it does it silently in compiled output
 * that no source-scanning lint can see. So this is not a list of the colours we
 * happen to care about; it is a list of every channel that can be painted, and
 * the compiled-output tests beside the renderer are what prove nothing was
 * missed. A mark type added to `NOTEBOOK_CHART_MARK_TEMPLATES` needs its entry
 * here in the same change.
 */
export const NOTEBOOK_CHART_VEGA_CONFIG: NotebookChartVegaConfig = {
  autosize: { type: "fit", contains: "padding" },
  background: null,
  padding: 0,
  font: FONT,
  range: { category: NOTEBOOK_CHART_PALETTE },
  axis: {
    domainColor: RULE,
    tickColor: RULE,
    gridColor: RULE,
    labelColor: MUTED,
    titleColor: INK,
    labelFont: FONT,
    titleFont: FONT,
    labelFontSize: AXIS_LABEL_FONT_SIZE,
    titleFontSize: AXIS_TITLE_FONT_SIZE,
  },
  legend: {
    labelColor: MUTED,
    titleColor: INK,
    symbolStrokeColor: RULE,
    labelFont: FONT,
    titleFont: FONT,
    labelFontSize: LEGEND_LABEL_FONT_SIZE,
    titleFontSize: LEGEND_TITLE_FONT_SIZE,
  },
  view: { stroke: null },
  bar: { fill: NOTEBOOK_CHART_PALETTE[0] },
  line: { stroke: NOTEBOOK_CHART_PALETTE[0], strokeWidth: 2 },
  point: { fill: NOTEBOOK_CHART_PALETTE[0], stroke: NOTEBOOK_CHART_PALETTE[0] },
  symbol: { fill: NOTEBOOK_CHART_PALETTE[0], stroke: RULE },
  rule: { stroke: RULE },
  // The slice separator is the page's own surface, so arcs read as separated
  // rather than as outlined.
  arc: { stroke: SURFACE, strokeWidth: 1 },
  text: { fill: INK, font: FONT, fontSize: VALUE_TEXT_FONT_SIZE },
  title: { color: INK, subtitleColor: MUTED, font: FONT, subtitleFont: FONT },
};

/**
 * How one mark draws, as DATA.
 *
 * Adding a mark is adding a row here and a row in the two grouping tables in
 * `notebook-spec.ts` — never a new branch in the builder. `category` and
 * `quantity` name the Vega-Lite channels the label and the figure occupy, and
 * swapping them is the whole of the difference between `bar` and `hbar`.
 */
export interface NotebookChartMarkTemplate {
  /** The Vega-Lite mark. Several of our marks share one. */
  mark: "bar" | "arc" | "line";
  category: "x" | "y" | "theta" | "color";
  quantity: "x" | "y" | "theta";
  categoryType: "nominal" | "temporal";
  /** False for the marks drawn without a scale a reader can read off. */
  axes: boolean;
  /** Whether the mark asserts that the figures sum to a meaningful whole. */
  requiresAdditive: boolean;
  /** Whether the result's own ordering carries meaning and must not be re-sorted. */
  preserveSourceOrder: boolean;
}

export const NOTEBOOK_CHART_MARK_TEMPLATES: Readonly<
  Record<NotebookQueryChartMark, NotebookChartMarkTemplate>
> = {
  bar: {
    mark: "bar",
    category: "x",
    quantity: "y",
    categoryType: "nominal",
    axes: true,
    requiresAdditive: false,
    preserveSourceOrder: false,
  },
  hbar: {
    mark: "bar",
    category: "y",
    quantity: "x",
    categoryType: "nominal",
    axes: true,
    requiresAdditive: false,
    preserveSourceOrder: false,
  },
  donut: {
    mark: "arc",
    category: "color",
    quantity: "theta",
    categoryType: "nominal",
    axes: false,
    requiresAdditive: true,
    preserveSourceOrder: false,
  },
  line: {
    mark: "line",
    category: "x",
    quantity: "y",
    categoryType: "temporal",
    axes: true,
    requiresAdditive: false,
    preserveSourceOrder: true,
  },
};

/**
 * Intrinsic width, height and per-row band for each size.
 *
 * These are the numbers a chart is COMPILED at, on the server. They are also,
 * separately, the cap the client applies to the rendered width (see
 * `NOTEBOOK_CHART_SIZE_WIDTH` below) — without that cap a wide section card
 * stretches the SVG's `viewBox` far past this geometry, and because a
 * `viewBox` scales uniformly, every stroke and font size compiled here is
 * magnified by exactly that stretch factor. `md` is sized for a full-width
 * section card rather than a sidebar widget; `sm` and `lg` stay clearly
 * smaller and larger so the size choice remains meaningful.
 */
const NOTEBOOK_CHART_SIZE_GEOMETRY: Readonly<
  Record<NotebookQueryChartSize, { width: number; height: number; band: number }>
> = {
  sm: { width: 420, height: 240, band: 24 },
  md: { width: 760, height: 340, band: 28 },
  lg: { width: 1040, height: 440, band: 32 },
};

/**
 * The same widths, exported for the CLIENT to cap the rendered SVG at.
 *
 * `notebook-chart.render.ts` is server-only and imports vega; a component
 * cannot reach it. This module is pure and reaches neither, so it is the one
 * place both the server compiler and `NotebookQueryChart.tsx` can read the
 * same numbers from — never duplicated as a second literal on the client
 * side, which is exactly the kind of drift that produced the bug this map
 * fixes.
 */
export const NOTEBOOK_CHART_SIZE_WIDTH: Readonly<Record<NotebookQueryChartSize, number>> = {
  sm: NOTEBOOK_CHART_SIZE_GEOMETRY.sm.width,
  md: NOTEBOOK_CHART_SIZE_GEOMETRY.md.width,
  lg: NOTEBOOK_CHART_SIZE_GEOMETRY.lg.width,
};

export interface NotebookChartDatum {
  label: string;
  value: number;
}

export interface NotebookChartChannel {
  field: "label" | "value";
  type: "nominal" | "quantitative" | "temporal";
  /** `null` tells Vega-Lite not to reorder a scale this module already ordered. */
  sort?: null;
  scale?: { type: "utc" };
  axis?: { title: string; labelAngle?: number; labelLimit?: number };
  legend?: { title: string };
}

export interface NotebookChartVegaLiteSpec {
  data: { values: NotebookChartDatum[] };
  mark: { type: "bar" | "arc" | "line"; innerRadius?: number; point?: boolean };
  width: number;
  height: number;
  encoding: Partial<Record<"x" | "y" | "theta" | "color", NotebookChartChannel>>;
  config: NotebookChartVegaConfig;
}

/** A column's heading, unit included, exactly as the table prints it. */
function columnTitle(column: NotebookMetricQueryResult["columns"][number] | undefined): string {
  if (!column) return "";
  return column.unit ? `${column.label} (${column.unit})` : column.label;
}

interface NotebookChartPlottableRows {
  values: NotebookChartDatum[];
  /**
   * Whether any row of the result carried no usable figure and was left out.
   *
   * Which rows were dropped never matters; that ANY were does, and only to the
   * marks that claim their figures add up to a whole.
   */
  droppedForAbsence: boolean;
}

/**
 * The plottable rows.
 *
 * An absent figure is not a zero — the query layer already rendered it as the
 * em dash, and plotting it as a zero would invent a reading. It is dropped,
 * and a result with nothing left is declined entirely.
 */
function rowsFromResult(result: NotebookMetricQueryResult): NotebookChartPlottableRows {
  const values: NotebookChartDatum[] = [];
  let droppedForAbsence = false;
  for (const row of result.rows) {
    if (typeof row.value !== "number" || !Number.isFinite(row.value)) {
      droppedForAbsence = true;
      continue;
    }
    values.push({ label: row.label, value: row.value });
  }
  return { values, droppedForAbsence };
}

/**
 * Whether every row can occupy a coordinate of its own.
 *
 * `row.key` IS THE IDENTITY; `row.label` IS ONLY THE DISPLAY NAME, and the
 * query contract guarantees uniqueness of the first alone. Two programs, or
 * two projects, may honestly share a name — and a nominal scale keyed on that
 * name then places both at ONE coordinate: one bar is hidden behind the other,
 * and two arcs merge into a single slice in a single colour.
 *
 * The chart is declined rather than repaired because every repair invents
 * something the data does not contain. A suffix would print a name nobody gave
 * the row, and moving the scale onto `row.key` would label the axis and the
 * legend with ids. The table prints both rows under their real names.
 */
function hasDistinctLabels(values: NotebookChartDatum[]): boolean {
  return new Set(values.map((datum) => datum.label)).size === values.length;
}

/**
 * Ordering, done here rather than by the scale.
 *
 * `Array.prototype.sort` is stable, so ties keep the result's own order and two
 * compilations of one result produce byte-identical SVG — which is what lets
 * the output be cached content-addressably.
 */
function sortData(values: NotebookChartDatum[], sort: NotebookQueryChartSort) {
  switch (sort) {
    case "value-desc":
      return [...values].sort((left, right) => right.value - left.value);
    case "value-asc":
      return [...values].sort((left, right) => left.value - right.value);
    case "label-asc":
      return [...values].sort((left, right) => left.label.localeCompare(right.label));
    case "source":
      return values;
  }
}

/**
 * How far a vertical bar's category label rotates, and how many characters it
 * may print before it truncates with an ellipsis.
 *
 * A NOMINAL label on the `x` axis is exactly the `bar` mark's category — `hbar`
 * puts its category on `y`, where a rotated label would run vertically off the
 * card, and where the row itself already carries the full width for a long
 * name. Left to Vega-Lite's own default, a category that will not fit
 * horizontally rotates to 90° and a programme name then costs the chart's
 * entire height. -40° reads at a glance and costs one line of height instead.
 */
const BAR_CATEGORY_LABEL_ANGLE = -40;
const BAR_CATEGORY_LABEL_LIMIT = 96;

function categoryChannel(template: NotebookChartMarkTemplate, title: string): NotebookChartChannel {
  if (template.categoryType === "temporal") {
    // A date-only string parsed in the server's local zone slides every point
    // by the offset, so the chart and the table disagree about which day a
    // figure belongs to. The resolver's buckets are UTC days; read them as such.
    return { field: "label", type: "temporal", scale: { type: "utc" }, axis: { title } };
  }
  if (template.axes) {
    // Only `bar` puts a nominal category on `x`; `hbar` puts it on `y`, where
    // it reads horizontally already and needs neither treatment.
    if (template.category === "x") {
      return {
        field: "label",
        type: "nominal",
        sort: null,
        axis: { title, labelAngle: BAR_CATEGORY_LABEL_ANGLE, labelLimit: BAR_CATEGORY_LABEL_LIMIT },
      };
    }
    return { field: "label", type: "nominal", sort: null, axis: { title } };
  }
  return { field: "label", type: "nominal", sort: null, legend: { title } };
}

function quantityChannel(template: NotebookChartMarkTemplate, title: string) {
  const channel: NotebookChartChannel = { field: "value", type: "quantitative" };
  return template.axes ? { ...channel, axis: { title } } : channel;
}

/**
 * Whether the figures can honestly be shares of one whole.
 *
 * Percentages are already shares of something else, so summing them produces a
 * denominator that exists nowhere; a negative figure has no arc; and a set
 * summing to zero has no whole to be parts of.
 */
function isAdditive(result: NotebookMetricQueryResult, values: NotebookChartDatum[]): boolean {
  const valueColumn = result.columns.find((column) => column.id === "value");
  if (valueColumn?.valueKind === "percent") return false;
  if (values.some((datum) => datum.value < 0)) return false;
  return values.reduce((total, datum) => total + datum.value, 0) > 0;
}

/**
 * The specification, or `null` for "render the table instead".
 *
 * Never throws: every refusal is a `null`, because a section that cannot be
 * drawn still has figures worth reading.
 */
export function buildNotebookChartVegaLiteSpec(
  chart: NotebookQueryChart,
  result: NotebookMetricQueryResult
): NotebookChartVegaLiteSpec | null {
  const template = NOTEBOOK_CHART_MARK_TEMPLATES[chart.mark];
  // A stored document written by a widened indexer can name a mark this build
  // has never heard of. That is a table, not a crash.
  if (!template) return null;
  if (!isNotebookChartMarkValidForGrouping(chart.mark, result.query.groupBy)) return null;

  const { values: plottable, droppedForAbsence } = rowsFromResult(result);
  if (plottable.length === 0) return null;
  if (plottable.length > NOTEBOOK_CHART_MAX_ROWS) return null;
  if (!hasDistinctLabels(plottable)) return null;
  if (template.requiresAdditive) {
    // One slice is the whole circle: a lone figure drawn as a full ring
    // asserts it is 100% of something the result never measured.
    if (plottable.length < 2) return null;
    // An absent part is a missing part of the WHOLE, not merely of the
    // picture. Dropping it silently re-bases the denominator on the rows that
    // survived, so the remaining arcs are drawn as the entire whole — whereas
    // a bar only ever claims the heights it draws, which is why this is the
    // additive marks' rule and not everyone's.
    if (droppedForAbsence) return null;
    if (!isAdditive(result, plottable)) return null;
  }

  const values = template.preserveSourceOrder
    ? plottable
    : sortData(plottable, resolveNotebookChartSort(chart.mark, chart.sort));

  const geometry = NOTEBOOK_CHART_SIZE_GEOMETRY[resolveNotebookChartSize(chart)];
  const width = geometry.width;
  // A horizontal bar chart's height is its row count: a fixed height would
  // squeeze twenty-four bars into a band too thin to carry a label.
  const height = template.category === "y" ? (values.length + 1) * geometry.band : geometry.height;

  const encoding: NotebookChartVegaLiteSpec["encoding"] = {};
  const labelColumn = result.columns.find((column) => column.id === "label");
  const valueColumn = result.columns.find((column) => column.id === "value");
  encoding[template.category] = categoryChannel(template, columnTitle(labelColumn));
  encoding[template.quantity] = quantityChannel(template, columnTitle(valueColumn));

  return {
    data: { values },
    mark: markDefinition(template, width, height),
    width,
    height,
    encoding,
    config: NOTEBOOK_CHART_VEGA_CONFIG,
  };
}

function markDefinition(
  template: NotebookChartMarkTemplate,
  width: number,
  height: number
): NotebookChartVegaLiteSpec["mark"] {
  if (template.mark === "arc") {
    return { type: "arc", innerRadius: Math.round((Math.min(width, height) / 2) * 0.55) };
  }
  if (template.mark === "line") {
    // Points as well as the line: a two-bucket series is otherwise a bare
    // segment with nothing marking where the readings actually are.
    return { type: "line", point: true };
  }
  return { type: "bar" };
}
