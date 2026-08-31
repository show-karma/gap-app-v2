import type { NotebookKpiMetric } from "./notebook-spec";

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
  value: number;
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
