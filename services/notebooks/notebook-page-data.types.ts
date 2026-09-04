import type { NotebookIndicatorSeries } from "./notebook-indicators.types";
import type { NotebookKernelData, NotebookKernelTierRollup } from "./notebook-kernel.types";
import type { NotebookMetricQueryResult } from "./notebook-metric-registry.types";
import type { NotebookKernelRange } from "./notebook-spec";

/**
 * The page-data SHAPE and its pure helpers, split from the loader that fills it.
 *
 * The loader is `server-only` — it fetches. The renderer needs the shape and
 * the key function, and the renderer is also reachable from the BUILDER, which
 * is a client component. Importing a value out of the server-only module from
 * there drags it into the client bundle and Next refuses the build with
 * "'server-only' cannot be imported from a Client Component module".
 *
 * A type-only import would have been erased and stayed fine; `seriesKey` is a
 * value, so it lives here instead. The split is the fix and also the honest
 * boundary: this file describes the data, `notebook-page-data.ts` goes and
 * gets it.
 */

export interface NotebookPageData {
  /** Funding figures. Always loaded: cheap, cached, and most pages use it. */
  overview: import("@/services/notebook-overview.service").NotebookOverview;
  /** Kernel data by window preset, for the windows this spec actually names. */
  kernel: Partial<Record<NotebookKernelRange, NotebookKernelData>>;
  /**
   * The four-row tier rollup, present only when a section asks for it.
   *
   * Fixed at 90 days by the contract, so unlike `kernel` it is not keyed by
   * window — there is one rollup or there is none.
   */
  tierRollup?: NotebookKernelTierRollup;
  /**
   * Indicator series by `indicatorId:preset`.
   *
   * A key present with `null` means the fetch FAILED — different from absent,
   * and the renderer needs the difference: absent means no section asked for
   * it, null means a section asked and we could not answer.
   */
  series: Record<string, NotebookIndicatorSeries | null>;
  /**
   * Catalogue query results by canonical key.
   *
   * Present-with-null carries the same meaning it does for `series`: the
   * section asked and we could not answer, which is a different thing from no
   * section having asked.
   */
  queries?: Record<string, NotebookMetricQueryResult | null>;
}

/**
 * Lookup key for one composed query.
 *
 * CANONICAL, so two sections asking the same question share one fetch and one
 * cache entry: filter arrays are de-duplicated and sorted, and absent filters
 * are omitted rather than serialised as undefined. Without that, `[a,b]` and
 * `[b,a]` would be two keys for one question.
 */
export function querySectionKey(section: {
  metricId: string;
  groupBy: string;
  window: string;
  filters?: Record<string, unknown>;
}): string {
  const filters = section.filters ?? {};
  const canonical = Object.keys(filters)
    .sort()
    .reduce<Record<string, unknown>>((accumulator, key) => {
      const value = filters[key];
      if (value === undefined) return accumulator;
      accumulator[key] = Array.isArray(value) ? [...new Set(value)].sort() : value;
      return accumulator;
    }, {});
  return `${section.metricId}|${section.groupBy}|${section.window}|${JSON.stringify(canonical)}`;
}

/** Lookup key for one indicator at one window. */
export function seriesKey(indicatorId: string, preset: string): string {
  return `${indicatorId}:${preset}`;
}
