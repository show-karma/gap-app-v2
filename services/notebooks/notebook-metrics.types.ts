import type { NotebookKpiMetric } from "./notebook-spec";

/**
 * How an ABSENT measurement renders. Never "0".
 *
 * PROJECT-WIDE RULE: a figure that has not been measured is not a figure of
 * zero. "SLA met: 0%" and "SLA not measured yet" are materially different
 * claims about a community's programme, and rendering the second as the first
 * fabricates a number nobody produced. Every surface that can show an absent
 * value — KPI tiles, tables, future sections — shows this instead.
 */
export const NOTEBOOK_ABSENT_VALUE = "—";

export interface NotebookStat {
  /**
   * Which figure this is, in the spec vocabulary's terms.
   *
   * The page spec selects KPI tiles by id, so the renderer must be able to
   * match a spec entry to a computed stat without pattern-matching `label` —
   * a label is display text and may be reworded, at which point a
   * label-matching renderer would silently drop the tile.
   */
  id: NotebookKpiMetric;
  label: string;
  /**
   * `null` means NOT MEASURED, and renders as {@link NOTEBOOK_ABSENT_VALUE}.
   * Kernel figures in particular are legitimately unmeasured — a function with
   * no readings has no SLA percentage, and inventing 0 for it would claim the
   * programme failed rather than that it has not reported.
   */
  value: number | null;
  /** How to render it — the component owns formatting, not the query. */
  format: "currency" | "count" | "percent";
  hint?: string;
}

export interface NotebookBar {
  label: string;
  /** Filled portion. */
  value: number;
  /** Bar total; `value / total` is the filled fraction. */
  total: number;
  /** Right-aligned caption, e.g. "$563K of $614K". */
  caption: string;
  /** Secondary line under the label. */
  meta?: string;
}

export interface NotebookMetrics {
  currency: string;
  stats: NotebookStat[];
  funding: NotebookBar[];
  completion: NotebookBar[];
  applications: { label: string; value: number }[];
}
