import "server-only";

import { createHash } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { unstable_cache } from "next/cache";
import { getNotebookOverview } from "@/services/notebook-overview.service";
import { renderNotebookChartSvg } from "./notebook-chart.render";
import { getNotebookIndicatorSeries } from "./notebook-indicators.query";
import { getNotebookKernelData, getNotebookKernelTierRollup } from "./notebook-kernel.query";
import type { NotebookKernelData, NotebookKernelTierRollup } from "./notebook-kernel.types";
import {
  METRIC_REVALIDATE_SECONDS,
  notebookMetricTag,
  queryNotebookMetric,
} from "./notebook-metric-registry.query";
import type { NotebookMetricQueryResult } from "./notebook-metric-registry.types";
import type { NotebookPageData } from "./notebook-page-data.types";
import {
  seriesKey as buildSeriesKey,
  queryChartKey,
  querySectionKey,
} from "./notebook-page-data.types";
import {
  isKernelKpiMetric,
  type NotebookComposedSpec,
  type NotebookKernelRange,
  type NotebookQueryChart,
  type NotebookQuerySection,
  resolveNotebookDateRange,
  resolveNotebookKernelRange,
} from "./notebook-spec";

/**
 * Everything one page's spec asks for, fetched once per render.
 *
 * WHY A LOADER RATHER THAN PER-SECTION FETCHES. Two sections can name the same
 * dataset — two kernel blocks on a 90-day window, two charts of the same
 * indicator — and a component that fetched for itself would ask twice. Reading
 * the spec first turns "what does this page need" into a set, so each distinct
 * (dataset, window) pair is requested exactly once and the render stays a pure
 * function of data already in hand.
 *
 * FILTERS ARE SERVER-BACKED AND CACHED PER PRESET. Each query below caches on
 * its own preset key inside the query layer, so changing a section's window is
 * a cache read rather than a cold upstream fetch. That is only affordable
 * because the preset vocabulary is closed and small — an open date range would
 * make the key space unbounded and every filter change a miss.
 *
 * NOTHING HERE AGGREGATES. It fetches, keys and collects. Every figure is
 * computed in the query layer, which stays the single auditable seam.
 */

export type { NotebookPageData } from "./notebook-page-data.types";
export { seriesKey } from "./notebook-page-data.types";

/**
 * BUMP WHEN A CHART RENDERS DIFFERENTLY FOR THE SAME `(chart, result)` PAIR.
 *
 * The cache key below is a pure function of `chartKey` and a digest of the
 * result's own figures — neither changes when `notebook-chart-vega.ts` or its
 * config does. Left unbumped, a change to the geometry, the vega config (font
 * sizes, label angles, palette) or anything else `buildNotebookChartVegaLiteSpec`
 * / `renderNotebookChartSvg` produces would sit behind the OLD compiled SVG for
 * up to `METRIC_REVALIDATE_SECONDS`, on every page that already rendered it —
 * exactly the enormous-chart regression this constant exists to let a fix
 * actually reach a reader immediately rather than an hour later.
 */
const NOTEBOOK_CHART_SHAPE_VERSION = "v2";

/**
 * How many pictures one page may compile.
 *
 * Compiling is SYNCHRONOUS CPU on the request thread — vega-lite compiles,
 * vega parses, the view serialises — so an uncapped page is an uncapped
 * response time, and the reader of a fifty-chart page waits for all fifty
 * before the first byte. Sections past the cap render their figures as tables,
 * which is the same fallback every other undrawable chart takes.
 */
const NOTEBOOK_CHART_MAX_PER_PAGE = 12;

/** The distinct datasets a spec needs, so nothing is fetched twice. */
function planRequests(spec: NotebookComposedSpec): {
  kernelRanges: Set<NotebookKernelRange>;
  needsTierRollup: boolean;
  series: Map<string, { indicatorId: string; preset: string }>;
  queries: Map<string, NotebookQuerySection>;
  charts: Map<string, NotebookQuerySection>;
} {
  const kernelRanges = new Set<NotebookKernelRange>();
  // The rollup is one fixed 90-day object, so this is a flag rather than a
  // set: two tier sections on a page are still one fetch.
  let needsTierRollup = false;
  const series = new Map<string, { indicatorId: string; preset: string }>();
  // Keyed canonically, so two sections asking the same question are one fetch.
  const queries = new Map<string, NotebookQuerySection>();
  // Keyed by question AND presentation: one fetch can feed two pictures.
  const charts = new Map<string, NotebookQuerySection>();

  for (const section of spec.sections) {
    if (section.type === "kpis" && section.metrics.some(isKernelKpiMetric)) {
      kernelRanges.add(resolveNotebookKernelRange(section.kernelRange));
    }
    if (section.type === "query") {
      queries.set(querySectionKey(section), section);
      if (section.chart && charts.size < NOTEBOOK_CHART_MAX_PER_PAGE) {
        charts.set(queryChartKey(section), section);
      }
    }
    if (section.type === "tiers") {
      needsTierRollup = true;
    }
    if (section.type === "table") {
      kernelRanges.add(resolveNotebookKernelRange(section.range));
    }
    if (section.type === "timeseries") {
      const preset = resolveNotebookDateRange(section.range);
      series.set(buildSeriesKey(section.indicatorId, preset), {
        indicatorId: section.indicatorId,
        preset,
      });
    }
  }

  return { kernelRanges, needsTierRollup, series, queries, charts };
}

/**
 * A fingerprint of the FIGURES, and of nothing else.
 *
 * `meta.generatedAt` is deliberately excluded. It moves on every upstream
 * refetch, so a digest that included it would give every render a fresh key
 * and turn the chart cache into a write-only store — the cache would look
 * present and never hit.
 *
 * What it does include is everything the picture is drawn from: the columns
 * (which title the axes), the rows (which are the picture) and the absence
 * marker (which decides what is plottable). So a cached SVG and the table
 * rendered beneath it cannot show different numbers: different numbers are a
 * different key.
 */
function resultDigest(result: NotebookMetricQueryResult): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        columns: result.columns,
        rows: result.rows,
        absenceDisplay: result.meta.absenceDisplay,
      })
    )
    .digest("hex");
}

/**
 * One chart's SVG, cached content-addressably.
 *
 * The renderer is contracted never to reject, and this catch is what happens
 * if it ever breaks that contract: the section falls back to its table and the
 * REST OF THE PAGE STILL RENDERS. Charts are compiled one after another
 * precisely so that this containment exists — a `Promise.all` would turn one
 * broken chart into a rejected page.
 */
async function compileChart(
  communityId: string,
  chartKey: string,
  chart: NotebookQueryChart,
  result: NotebookMetricQueryResult
): Promise<string | null> {
  try {
    return await unstable_cache(
      () => renderNotebookChartSvg(chart, result),
      ["notebook-chart", NOTEBOOK_CHART_SHAPE_VERSION, chartKey, resultDigest(result)],
      { revalidate: METRIC_REVALIDATE_SECONDS, tags: [notebookMetricTag(communityId)] }
    )();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "notebooks", stage: "chart-compile" },
      extra: { communityId, chartKey },
    });
    return null;
  }
}

/**
 * A failure loading ONE dataset must not blank the page.
 *
 * An indicator id can dangle — the row it points at may have been deleted
 * after the page was published — and a kernel window can fail on its own. In
 * both cases the honest outcome is that section saying so while the rest of
 * the page still renders the figures it does have. Throwing would replace a
 * mostly-correct page with an error boundary.
 *
 * The failure still has to be visible to us, so it is reported rather than
 * swallowed: a page that quietly drops a chart for a week looks healthy.
 */
async function loadOrNull<T>(
  load: () => Promise<T>,
  context: Record<string, unknown>
): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "notebooks", stage: "page-data" },
      extra: context,
    });
    return null;
  }
}

export async function getNotebookPageData(
  communityId: string,
  spec: NotebookComposedSpec
): Promise<NotebookPageData> {
  const { kernelRanges, needsTierRollup, series, queries, charts } = planRequests(spec);

  // One round of parallel work: the funding overview, each distinct kernel
  // window, and each distinct indicator/window pair.
  const [overview, tierRollup, kernelEntries, seriesEntries, queryEntries] = await Promise.all([
    getNotebookOverview(communityId),
    needsTierRollup
      ? loadOrNull<NotebookKernelTierRollup>(getNotebookKernelTierRollup, { communityId })
      : Promise.resolve(null),
    Promise.all(
      [...kernelRanges].map(async (range) => {
        const data = await loadOrNull(() => getNotebookKernelData(range), {
          communityId,
          range,
        });
        return [range, data] as const;
      })
    ),
    Promise.all(
      [...series.values()].map(async ({ indicatorId, preset }) => {
        const data = await loadOrNull(
          () =>
            getNotebookIndicatorSeries(
              indicatorId,
              preset as Parameters<typeof getNotebookIndicatorSeries>[1]
            ),
          { communityId, indicatorId, preset }
        );
        return [buildSeriesKey(indicatorId, preset), data] as const;
      })
    ),
    Promise.all(
      [...queries.entries()].map(async ([key, section]) => {
        const data = await loadOrNull<NotebookMetricQueryResult>(
          () =>
            queryNotebookMetric({
              communityId,
              metricId: section.metricId,
              groupBy: section.groupBy,
              window: section.window,
              ...(section.filters ? { filters: section.filters } : {}),
            }),
          { communityId, metricId: section.metricId }
        );
        return [key, data] as const;
      })
    ),
  ]);

  const kernel: Partial<Record<NotebookKernelRange, NotebookKernelData>> = {};
  for (const [range, data] of kernelEntries) {
    // A kernel window that failed is simply absent; the sections that wanted
    // it render their own unavailable state.
    if (data) kernel[range] = data;
  }

  const queryResults = Object.fromEntries(queryEntries);

  // SEQUENTIAL, NOT PARALLEL, and not by oversight.
  //
  // Compiling a chart is synchronous CPU on this one thread from start to
  // finish — vega-lite compiles, vega parses, the view serialises — so
  // dispatching them together costs the same total time and holds every live
  // `View` at once instead of one. Sequential also buys per-chart isolation
  // for nothing: each iteration owns its failure, and a page cannot be lost to
  // a single chart.
  const queryCharts: Record<string, string | null> = {};
  for (const [chartKey, section] of charts) {
    const result = queryResults[querySectionKey(section)];
    // No figures, no picture: the section already renders its unavailable
    // state, and there is nothing to draw a chart from.
    if (!result || !section.chart) continue;
    queryCharts[chartKey] = await compileChart(communityId, chartKey, section.chart, result);
  }

  return {
    overview,
    // Absent rather than null: the shape says "no rollup on this page", and a
    // failed fetch is the same story for the renderer as a page that never
    // asked — the section says so and the rest of the page still renders.
    ...(tierRollup ? { tierRollup } : {}),
    kernel,
    series: Object.fromEntries(seriesEntries),
    queries: queryResults,
    // Absent rather than empty, for the same reason `tierRollup` is: the shape
    // then says "no section on this page asked to be drawn", which is a
    // different statement from "every chart declined".
    ...(Object.keys(queryCharts).length > 0 ? { queryCharts } : {}),
  };
}
