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

/** Schema version of a spec document. Bumped only for a breaking shape change. */
export const NOTEBOOK_SPEC_VERSION = 1;

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

export const NotebookSectionSchema = z.union([
  NotebookKpisSectionSchema,
  NotebookBarsSectionSchema,
  NotebookApplicationsSectionSchema,
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

export const NOTEBOOK_BAR_METRIC_LABELS: Readonly<Record<NotebookBarMetric, string>> = {
  disbursedVsCommitted: "Disbursed against commitment",
  milestoneCompletion: "Average milestone completion",
};
