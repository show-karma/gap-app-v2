import "server-only";

import * as Sentry from "@sentry/nextjs";
import { isSafeChartSvg, isThemedChartSvg, normalizeChartSvgRoot } from "./notebook-chart-svg";
import { buildNotebookChartVegaLiteSpec } from "./notebook-chart-vega";
import type { NotebookMetricQueryResult } from "./notebook-metric-registry.types";
import type { NotebookQueryChart } from "./notebook-spec";

/**
 * The ONLY module in this build that imports vega.
 *
 * `import "server-only"` on line one, and both imports are `await import()`
 * with LITERAL specifiers. Both halves matter. The marker is what turns
 * "somebody imported the chart renderer into a client component" from a
 * 700 kB bundle nobody notices into a build error. The literals are what let
 * Next's file tracer see the dependency at all — a computed specifier traces
 * to nothing, the standalone output ships without vega, and the failure is a
 * runtime module-not-found on a published page rather than a build error.
 *
 * IT NEVER REJECTS. It is awaited inside a page's data phase, one section
 * among many; a rejection there does not lose a chart, it loses the page.
 * `null` is the whole failure vocabulary and it means "render the table" —
 * which is a complete answer, not a degraded one. The figures are the same
 * figures either way, because the chart and the table beneath it are built
 * from one result object.
 *
 * AND IT ALWAYS FINALISES. A `View` holds dataflow state and timers; one
 * leaked per failed chart on a server rendering pages on demand is a slow leak
 * that surfaces days away from its cause. Hence the `finally`.
 */

type VegaModule = typeof import("vega");
type VegaView = InstanceType<VegaModule["View"]>;

/**
 * A loader that refuses to load anything.
 *
 * THE SECOND BOUNDARY, not the first. A specification produced by
 * `buildNotebookChartVegaLiteSpec` cannot carry a `data.url`: `data` is always
 * inline values this build constructed from the result's rows, and the
 * author's chart object is never spread into the spec. This exists so that a
 * future spec-building mistake is a failed chart rather than a request from
 * our servers to somebody else's host.
 */
function blockedLoader(vega: VegaModule) {
  const loader = vega.loader();
  loader.load = () => {
    throw new Error("notebook charts never load external resources");
  };
  loader.sanitize = () => {
    throw new Error("notebook charts never resolve external uris");
  };
  return loader;
}

/**
 * A chart's SVG, or `null` to render the table instead.
 *
 * The result is deterministic for a given `(chart, result)` pair, which is what
 * lets a caller cache it content-addressably alongside the figures it draws.
 */
export async function renderNotebookChartSvg(
  chart: NotebookQueryChart,
  result: NotebookMetricQueryResult
): Promise<string | null> {
  const spec = buildNotebookChartVegaLiteSpec(chart, result);
  // Nothing is loaded, parsed or constructed for a section that cannot be
  // drawn, so a page full of undrawable charts costs no more than a page of
  // tables.
  if (!spec) return null;

  let view: VegaView | undefined;

  try {
    const [vega, vegaLite] = await Promise.all([import("vega"), import("vega-lite")]);

    // The compiler's warnings would otherwise go to the process's console on
    // every server render. They are diagnostics about a spec this module
    // wrote, not about anything a reader or an author can act on.
    const compiled = vegaLite.compile(spec as unknown as Parameters<typeof vegaLite.compile>[0], {
      logger: vega.logger(vega.None),
    }).spec;

    view = new vega.View(vega.parse(compiled), {
      renderer: "none",
      logLevel: vega.None,
      loader: blockedLoader(vega),
    });

    const svg = await view.toSVG();

    if (!isSafeChartSvg(svg) || !isThemedChartSvg(svg)) {
      // Reported rather than thrown: markup outside the allowlist means the
      // library changed what it emits, which is worth a person's attention and
      // is not a fault of the page the reader happens to be on.
      Sentry.captureMessage("notebook chart svg failed its structural guard", {
        tags: { feature: "notebooks", stage: "chart-guard" },
        extra: { mark: chart.mark, metricId: result.query.metricId },
      });
      return null;
    }

    return normalizeChartSvgRoot(svg);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "notebooks", stage: "chart-render" },
      extra: { mark: chart.mark, metricId: result.query.metricId },
    });
    return null;
  } finally {
    view?.finalize();
  }
}
