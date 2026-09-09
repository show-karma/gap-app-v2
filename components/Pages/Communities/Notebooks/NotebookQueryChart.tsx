import { isSafeChartSvg, normalizeChartSvgRoot } from "@/services/notebooks/notebook-chart-svg";
import { NOTEBOOK_CHART_SIZE_WIDTH } from "@/services/notebooks/notebook-chart-vega";
import type { NotebookMetricQueryResult } from "@/services/notebooks/notebook-metric-registry.types";
import {
  type NotebookQueryChartMark,
  type NotebookQuerySection,
  resolveNotebookChartSize,
} from "@/services/notebooks/notebook-spec";
import { NotebookQueryTable } from "./NotebookQueryTable";

/**
 * A compiled chart, and the figures it draws.
 *
 * THE ONLY PLACE A CHART SVG IS INJECTED. `NotebookOverview.tsx` forbids a
 * `dangerouslySetInnerHTML` in itself, because author free text is defended by
 * being a text node there and one exception would end that guarantee. So the
 * injection lives here, in a file whose whole subject is markup this build
 * produced: the SVG never contains author text as markup, only as escaped
 * character data written by vega's string renderer.
 *
 * THE GUARD RUNS AGAIN HERE. The server already applied it before caching the
 * string, and applying it a second time at the point of injection costs a
 * regex sweep and covers the case the server pass cannot: a cache entry
 * written by an older build. A refusal is not an error — it renders the table,
 * which is the same fallback every undrawable chart takes.
 *
 * THE FIGURES ARE ALWAYS PRESENT. The `<details>` beneath the picture holds
 * the real table, so every number in the chart is also text a reader can
 * select, a screen reader can walk and a search can find. It cannot disagree
 * with the picture: both are rendered from ONE result object, and the SVG was
 * cached under a digest of exactly these rows.
 */

const MARK_DESCRIPTIONS: Readonly<Record<NotebookQueryChartMark, string>> = {
  bar: "a bar chart",
  hbar: "a horizontal bar chart",
  donut: "a donut chart",
  line: "a line chart",
};

/**
 * The accessible name, built from what the picture actually shows.
 *
 * Column labels rather than invented prose: they are the same headings the
 * table prints, so a reader who hears the name and then reads the table hears
 * the same words twice rather than two descriptions of one thing.
 */
function chartLabel(section: NotebookQuerySection, result: NotebookMetricQueryResult): string {
  const measure = result.columns.find((column) => column.id === "value")?.label ?? section.title;
  const category = result.columns.find((column) => column.id === "label")?.label ?? "category";
  const shape = section.chart ? (MARK_DESCRIPTIONS[section.chart.mark] ?? "a chart") : "a chart";
  return `${section.title}: ${measure} by ${category}, as ${shape}. The figures follow in a table.`;
}

export function NotebookQueryChart({
  svg,
  section,
  result,
}: {
  svg: string;
  section: NotebookQuerySection;
  result: NotebookMetricQueryResult;
}) {
  // Fail closed, and fail to the figures. Anything this build did not expect
  // to be in the document means the document is not shown at all.
  if (!isSafeChartSvg(svg)) return <NotebookQueryTable result={result} />;

  // Idempotent, so normalising an already-normalised string is a no-op. It is
  // done here as well as on the server because this is the last point at which
  // the accessibility contract can be kept rather than assumed.
  const document = normalizeChartSvgRoot(svg);

  // The SVG carries no intrinsic width of its own (normalised away above), so
  // `[&_svg]:w-full` stretches it to fill whatever column it lands in. A
  // `viewBox` scales EVERYTHING it contains uniformly, so on a wide section
  // card that stretch would magnify every stroke and font size compiled into
  // it by the same factor. Capping at the size it was actually compiled at —
  // read from the same map the server compiles against, never a second
  // literal — keeps the scale factor at ~1x on a wide screen while still
  // letting the chart shrink on a narrow one.
  const maxWidth = section.chart
    ? NOTEBOOK_CHART_SIZE_WIDTH[resolveNotebookChartSize(section.chart)]
    : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={chartLabel(section, result)}
        className="w-full overflow-x-auto [&_svg]:h-auto [&_svg]:w-full"
        style={maxWidth ? { maxWidth } : undefined}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: the markup is an SVG this build compiled from a closed template, re-checked against the structural allowlist on the line above; the only third-party strings in it are row labels, which vega escapes as character data
        dangerouslySetInnerHTML={{ __html: document }}
      />
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Show the figures</summary>
        <div className="pt-3">
          <NotebookQueryTable result={result} />
        </div>
      </details>
    </div>
  );
}
