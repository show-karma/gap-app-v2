import "server-only";

import * as Sentry from "@sentry/nextjs";
import { getNotebookOverview } from "@/services/notebook-overview.service";
import { getNotebookIndicatorSeries } from "./notebook-indicators.query";
import { getNotebookKernelData, getNotebookKernelTierRollup } from "./notebook-kernel.query";
import type { NotebookKernelData, NotebookKernelTierRollup } from "./notebook-kernel.types";
import { queryNotebookMetric } from "./notebook-metric-registry.query";
import type { NotebookMetricQueryResult } from "./notebook-metric-registry.types";
import type { NotebookPageData } from "./notebook-page-data.types";
import { seriesKey as buildSeriesKey, querySectionKey } from "./notebook-page-data.types";
import {
  isKernelKpiMetric,
  type NotebookComposedSpec,
  type NotebookKernelRange,
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

/** The distinct datasets a spec needs, so nothing is fetched twice. */
function planRequests(spec: NotebookComposedSpec): {
  kernelRanges: Set<NotebookKernelRange>;
  needsTierRollup: boolean;
  series: Map<string, { indicatorId: string; preset: string }>;
  queries: Map<string, NotebookQuerySection>;
} {
  const kernelRanges = new Set<NotebookKernelRange>();
  // The rollup is one fixed 90-day object, so this is a flag rather than a
  // set: two tier sections on a page are still one fetch.
  let needsTierRollup = false;
  const series = new Map<string, { indicatorId: string; preset: string }>();
  // Keyed canonically, so two sections asking the same question are one fetch.
  const queries = new Map<string, NotebookQuerySection>();

  for (const section of spec.sections) {
    if (section.type === "kpis" && section.metrics.some(isKernelKpiMetric)) {
      kernelRanges.add(resolveNotebookKernelRange(section.kernelRange));
    }
    if (section.type === "query") {
      queries.set(querySectionKey(section), section);
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

  return { kernelRanges, needsTierRollup, series, queries };
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
  const { kernelRanges, needsTierRollup, series, queries } = planRequests(spec);

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

  return {
    overview,
    // Absent rather than null: the shape says "no rollup on this page", and a
    // failed fetch is the same story for the renderer as a page that never
    // asked — the section says so and the rest of the page still renders.
    ...(tierRollup ? { tierRollup } : {}),
    kernel,
    series: Object.fromEntries(seriesEntries),
    queries: Object.fromEntries(queryEntries),
  };
}
