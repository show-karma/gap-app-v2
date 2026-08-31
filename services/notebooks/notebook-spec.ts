import { z } from "zod";

/**
 * The notebook page spec — the closed vocabulary a page is composed from.
 *
 * MIRROR of `gap-indexer/app/modules/v2/domain/models/notebook-spec.ts`. The
 * indexer's copy is authoritative: it is what rejects a bad write, and it is
 * the only one an attacker cannot skip. This copy exists for two other jobs —
 * the builder composes against it, and the read path re-validates with it, so
 * a config that somehow arrives malformed fails at this boundary instead of
 * reaching a renderer that would have to guess.
 *
 * Deliberately duplicated rather than shared through a package: the two repos
 * deploy independently, and a shared type would let a frontend deploy silently
 * widen what the backend believes it is storing. The pairing is held by tests
 * on both sides, not by a build-time link.
 *
 * WHAT A SPEC MAY NOT DO. It carries no numbers, formulas, filters or
 * thresholds — every figure comes from the metrics query layer, the single
 * auditable seam for anything this product publishes. A spec SELECTS and
 * LABELS; it cannot compute. And `title` / `description` are the only free
 * text in it: both render as text nodes, never as markup.
 */

/**
 * Schema version of a spec document.
 *
 * MIGRATION RULE — the whole of it, in one line:
 *
 *   BUMP WHEN A READER OF THE PREVIOUS VERSION WOULD *MISREAD* A DOCUMENT.
 *   NEVER BUMP WHEN IT WOULD MERELY *REJECT* ONE.
 *
 * Rejection is already safe and automatic: the section union is closed and
 * every section is `.strict()`, so a build predating a new section type
 * rejects the document rather than half-drawing it. A version must catch the
 * case the union cannot — an existing field changing meaning or type, where an
 * old reader parses successfully and draws the WRONG page.
 *
 * The v2 builder (kernel/indicator sources, time-series, text) is therefore an
 * ADDITIVE widening and stays at version 1. Every v1 document renders
 * unchanged, which is what lets the golden test hold BY CONSTRUCTION.
 *
 * Kept verbatim in step with the indexer's copy — see that file's header for
 * why the two are duplicated rather than shared.
 */
export const NOTEBOOK_SPEC_VERSION = 1;

/** Where a section's numbers come from. */
export const NOTEBOOK_DATA_SOURCES = ["funding", "kernel", "indicators"] as const;

export type NotebookDataSource = (typeof NOTEBOOK_DATA_SOURCES)[number];

/**
 * Date windows a section may ask for.
 *
 * Closed and small on purpose: each preset is a distinct cache entry, so an
 * open-ended range would make cache cardinality unbounded and turn "a filter
 * change is a fast cached refetch" into a cold fetch every time.
 *
 * `all` is the default, and that is a correctness decision: indicator series
 * are short and sparse, so a windowed default would render an empty chart for
 * a healthy metric — which a reader takes to mean the metric is broken.
 */
export const NOTEBOOK_DATE_RANGES = ["all", "30d", "90d", "12m"] as const;

export type NotebookDateRange = (typeof NOTEBOOK_DATE_RANGES)[number];

export const NOTEBOOK_DEFAULT_DATE_RANGE: NotebookDateRange = "all";

/**
 * The windows each SOURCE can actually express.
 *
 * Not one shared list, because the two sources mean different things by a
 * window. An indicator series is a set of dated points, so "all time" is a
 * real and useful answer. The kernel API takes a `windowDays` and computes
 * over it, so there is no such thing as an unwindowed kernel reading — "all"
 * would be a token the server cannot honour.
 *
 * Offering a source a window it cannot express would produce a section that
 * renders empty or, worse, silently falls back to a different window than the
 * one the author picked. Correctness beats a uniform picker.
 */
export const NOTEBOOK_DATE_RANGES_BY_SOURCE: Readonly<
  Record<"indicators" | "kernel", readonly NotebookDateRange[]>
> = {
  indicators: ["all", "30d", "90d", "12m"],
  kernel: ["30d", "90d", "12m"],
};

/** Whether a source can express a window. */
export function isValidRangeForSource(
  source: "indicators" | "kernel",
  range: NotebookDateRange
): boolean {
  return NOTEBOOK_DATE_RANGES_BY_SOURCE[source].includes(range);
}

/**
 * The window a section asks for, with the default applied.
 *
 * One place, so the renderer, the composer and the cache key cannot drift.
 */
export function resolveNotebookDateRange(range?: NotebookDateRange): NotebookDateRange {
  return range ?? NOTEBOOK_DEFAULT_DATE_RANGE;
}

/** How a time series is drawn. Both are the same data, differently weighted. */
export const NOTEBOOK_CHART_STYLES = ["line", "area"] as const;

export type NotebookChartStyle = (typeof NOTEBOOK_CHART_STYLES)[number];

/** Bound on a text block's body — a paragraph of context, not a CMS. */
export const NOTEBOOK_TEXT_BODY_MAX = 2000;

/**
 * KPI tiles an author may place.
 *
 * `milestoneCompletion` is the canonical completed/total fraction the
 * community header shows, not the unweighted per-project mean the API also
 * exposes. An author cannot pick the other one — it is not in this set, which
 * is how the page is prevented from becoming a third disagreeing surface.
 */
export const NOTEBOOK_KPI_METRICS = [
  "committed",
  "disbursed",
  "fundedProjects",
  "milestoneCompletion",
] as const;

export type NotebookKpiMetric = (typeof NOTEBOOK_KPI_METRICS)[number];

/** Pre-aggregated bar series an author may place. */
export const NOTEBOOK_BAR_SOURCES = ["programs", "tracks"] as const;

export type NotebookBarSource = (typeof NOTEBOOK_BAR_SOURCES)[number];

export const NOTEBOOK_BAR_METRICS = ["disbursedVsCommitted", "milestoneCompletion"] as const;

export type NotebookBarMetric = (typeof NOTEBOOK_BAR_METRICS)[number];

/**
 * Which metric each source can actually express.
 *
 * The metrics layer computes exactly one series per source, so a `tracks`
 * section asking for `disbursedVsCommitted` names a series that does not
 * exist. The builder reads this table to populate its metric options, so an
 * author is never offered a pairing the server would reject.
 */
export const NOTEBOOK_BAR_METRICS_BY_SOURCE: Readonly<
  Record<NotebookBarSource, readonly NotebookBarMetric[]>
> = {
  programs: ["disbursedVsCommitted"],
  tracks: ["milestoneCompletion"],
};

export function isValidBarMetricForSource(
  source: NotebookBarSource,
  metric: NotebookBarMetric
): boolean {
  return NOTEBOOK_BAR_METRICS_BY_SOURCE[source].includes(metric);
}

/** Bounds on author free text. Kept in step with the indexer's copy by test. */
export const NOTEBOOK_SECTION_TITLE_MAX = 200;
export const NOTEBOOK_SECTION_DESCRIPTION_MAX = 500;

/** How many sections one page may carry. A page is a dashboard, not a feed. */
export const NOTEBOOK_SPEC_MAX_SECTIONS = 20;

const sectionTitleSchema = z.string().trim().min(1).max(NOTEBOOK_SECTION_TITLE_MAX);
const sectionDescriptionSchema = z.string().trim().max(NOTEBOOK_SECTION_DESCRIPTION_MAX);

export const NotebookKpisSectionSchema = z
  .object({
    type: z.literal("kpis"),
    metrics: z
      .array(z.enum(NOTEBOOK_KPI_METRICS))
      .min(1)
      .max(NOTEBOOK_KPI_METRICS.length)
      .refine((values) => new Set(values).size === values.length, {
        message: "kpis.metrics must not repeat a metric",
      }),
  })
  .strict();

export const NotebookBarsSectionSchema = z
  .object({
    type: z.literal("bars"),
    source: z.enum(NOTEBOOK_BAR_SOURCES),
    metric: z.enum(NOTEBOOK_BAR_METRICS),
    title: sectionTitleSchema,
    description: sectionDescriptionSchema.optional(),
  })
  .strict()
  .refine((section) => isValidBarMetricForSource(section.source, section.metric), {
    message: "bars.metric is not available for the chosen bars.source",
    path: ["metric"],
  });

export const NotebookApplicationsSectionSchema = z
  .object({ type: z.literal("applications") })
  .strict();

/**
 * A paragraph of author context.
 *
 * The only section carrying no data at all — it exists so a dashboard can say
 * what its numbers mean. `body` renders as a TEXT NODE exactly like `title`:
 * no markdown, no HTML, no links. A deliberate limitation, not an oversight.
 */
export const NotebookTextSectionSchema = z
  .object({
    type: z.literal("text"),
    title: sectionTitleSchema.optional(),
    body: z.string().trim().min(1).max(NOTEBOOK_TEXT_BODY_MAX),
  })
  .strict();

/**
 * A time series drawn from one indicator.
 *
 * `indicatorId` is an opaque reference into another system's table: it cannot
 * be validated for existence, only for shape, and it CAN DANGLE when an
 * indicator is deleted or renamed after the page is published. The renderer
 * treats "indicator not found" as an ordinary state to draw.
 *
 * `range` is optional rather than defaulted — the indexer's Ajv strict mode
 * refuses a `default` inside a union branch and would fail its route schema at
 * boot. Absent means "not chosen"; use resolveNotebookDateRange.
 */
export const NotebookTimeseriesSectionSchema = z
  .object({
    type: z.literal("timeseries"),
    source: z.literal("indicators"),
    indicatorId: z.string().uuid(),
    chartStyle: z.enum(NOTEBOOK_CHART_STYLES),
    range: z.enum(NOTEBOOK_DATE_RANGES).optional(),
    title: sectionTitleSchema,
    description: sectionDescriptionSchema.optional(),
  })
  .strict()
  .refine(
    (section) => isValidRangeForSource(section.source, resolveNotebookDateRange(section.range)),
    {
      message: "range is not available for the chosen source",
      path: ["range"],
    }
  );

export const NotebookSectionSchema = z.union([
  NotebookKpisSectionSchema,
  NotebookBarsSectionSchema,
  NotebookApplicationsSectionSchema,
  NotebookTextSectionSchema,
  NotebookTimeseriesSectionSchema,
]);

/**
 * One page spec.
 *
 * `version` is pinned: a document from a future schema is rejected rather than
 * half-rendered by a build that does not know what its new fields mean.
 */
export const NotebookSpecSchema = z
  .object({
    version: z.literal(NOTEBOOK_SPEC_VERSION),
    sections: z.array(NotebookSectionSchema).min(1).max(NOTEBOOK_SPEC_MAX_SECTIONS),
  })
  .strict();

export type NotebookKpisSection = z.infer<typeof NotebookKpisSectionSchema>;
export type NotebookBarsSection = z.infer<typeof NotebookBarsSectionSchema>;
export type NotebookApplicationsSection = z.infer<typeof NotebookApplicationsSectionSchema>;
export type NotebookTextSection = z.infer<typeof NotebookTextSectionSchema>;
export type NotebookTimeseriesSection = z.infer<typeof NotebookTimeseriesSectionSchema>;
export type NotebookSection = z.infer<typeof NotebookSectionSchema>;
export type NotebookSpec = z.infer<typeof NotebookSpecSchema>;

/** Whether a value is a spec this build can render. */
export function isRenderableNotebookSpec(value: unknown): value is NotebookSpec {
  return NotebookSpecSchema.safeParse(value).success;
}

/**
 * Human labels for the vocabulary, for the builder's option lists.
 *
 * Kept beside the vocabulary so adding a metric forces a decision about what
 * to call it, rather than leaving the builder to render a raw enum id. The
 * PUBLIC page does not read these — its KPI labels come from the metrics
 * layer, which owns what each figure is called wherever it appears.
 */
export const NOTEBOOK_KPI_METRIC_LABELS: Readonly<Record<NotebookKpiMetric, string>> = {
  committed: "Committed",
  disbursed: "Disbursed",
  fundedProjects: "Funded projects",
  milestoneCompletion: "Milestone completion",
};

export const NOTEBOOK_BAR_SOURCE_LABELS: Readonly<Record<NotebookBarSource, string>> = {
  programs: "Funding programs",
  tracks: "Tracks",
};

export const NOTEBOOK_DATE_RANGE_LABELS: Readonly<Record<NotebookDateRange, string>> = {
  all: "All time",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
};

export const NOTEBOOK_CHART_STYLE_LABELS: Readonly<Record<NotebookChartStyle, string>> = {
  line: "Line",
  area: "Area",
};

export const NOTEBOOK_BAR_METRIC_LABELS: Readonly<Record<NotebookBarMetric, string>> = {
  disbursedVsCommitted: "Disbursed against commitment",
  milestoneCompletion: "Average milestone completion",
};
