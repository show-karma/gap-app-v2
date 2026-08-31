import type { NotebookIndicatorSeries } from "@/services/notebooks/notebook-indicators.types";
import type { NotebookChartStyle } from "@/services/notebooks/notebook-spec";

/**
 * One indicator over time, as inline SVG.
 *
 * ZERO CLIENT JAVASCRIPT, like everything else on this page. That rules out a
 * scripted crosshair, so the readability it would have provided is bought
 * three other ways: the x and y extents are labelled so the scale is explicit,
 * the latest value is direct-labelled, and every point carries an SVG `<title>`
 * — which browsers surface as a native tooltip on hover with no script at all.
 *
 * ONE SERIES, so no legend: the section heading names what is plotted, and a
 * legend box for a single line is noise. Identity is never carried by colour
 * alone here because there is nothing to distinguish it from.
 *
 * TIME IS SCALED, NOT INDEXED. Indicator readings are irregular — a series can
 * have three points in one week and nothing for a month. Spacing them evenly
 * would draw a smooth cadence that does not exist, which is a lie about the
 * data rather than a simplification of it. The x position is the actual date.
 *
 * Colours are the page's existing theme tokens (`--primary` for the mark, muted
 * ink for grid and labels), so the chart inherits both themes rather than
 * declaring its own. There is no categorical palette to validate: a single
 * series has no adjacent pair to confuse.
 */

interface Props {
  series: NotebookIndicatorSeries;
  chartStyle: NotebookChartStyle;
}

const VIEW_WIDTH = 720;
const VIEW_HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };

const PLOT_W = VIEW_WIDTH - PAD.left - PAD.right;
const PLOT_H = VIEW_HEIGHT - PAD.top - PAD.bottom;

function formatValue(value: number, unit: string): string {
  const magnitude = Math.abs(value);
  const compact =
    magnitude >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)}M`
      : magnitude >= 1_000
        ? `${(value / 1_000).toFixed(1)}K`
        : Number.isInteger(value)
          ? String(value)
          : value.toFixed(2);
  // The unit is the indicator's own ("seconds", "USD", "rounds"); appending it
  // is what makes the number a measurement rather than a bare figure.
  return unit ? `${compact} ${unit}` : compact;
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export function NotebookTimeSeries({ series, chartStyle }: Props) {
  const { points, latestPoint, indicator, discardedPointCount } = series;

  // An empty WINDOW is not an empty indicator, and the difference is the whole
  // reason the query layer reports `latestPoint` separately. Saying "no
  // readings in this window, here is the most recent one" is true; drawing an
  // empty chart would read as "this metric is broken".
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No readings in this window.{" "}
        {latestPoint
          ? `Most recent reading: ${formatValue(latestPoint.value, indicator.unit)} on ${formatDate(latestPoint.date)}.`
          : "This indicator has no readings yet."}
      </p>
    );
  }

  const times = points.map((p) => Date.parse(p.date));
  const values = points.map((p) => p.value);

  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const tSpan = tMax - tMin || 1;

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);

  // An AREA fills the space between the line and the baseline, so the filled
  // height reads as magnitude. That is only honest from zero — filling down to
  // an arbitrary minimum would make a 2% wobble look like the whole quantity.
  // A LINE encodes only position, so it may use a tight data-driven domain,
  // and the labelled axis says what that domain is.
  const yMin = chartStyle === "area" ? Math.min(0, dataMin) : dataMin;
  const yMax = dataMax;
  const ySpan = yMax - yMin || Math.abs(yMax) || 1;

  const x = (t: number) => PAD.left + ((t - tMin) / tSpan) * PLOT_W;
  const y = (v: number) => PAD.top + PLOT_H - ((v - yMin) / ySpan) * PLOT_H;

  const coords = points.map((p, i) => ({ ...p, cx: x(times[i]), cy: y(p.value) }));
  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.cx.toFixed(2)},${c.cy.toFixed(2)}`)
    .join(" ");
  const areaPath = `${line} L${coords[coords.length - 1].cx.toFixed(2)},${(PAD.top + PLOT_H).toFixed(2)} L${coords[0].cx.toFixed(2)},${(PAD.top + PLOT_H).toFixed(2)} Z`;

  // Three recessive gridlines. More would compete with the mark for attention.
  const gridValues = [yMin, yMin + ySpan / 2, yMax];
  const last = coords[coords.length - 1];
  // Markers only when they will not collide. Past ~40 points an 8px dot every
  // few pixels becomes a smear that hides the line it is meant to annotate.
  const showMarkers = coords.length <= 40;

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${indicator.label} over time, ${points.length} readings from ${formatDate(points[0].date)} to ${formatDate(last.date)}`}
      >
        <title>{`${indicator.label} over time`}</title>

        {gridValues.map((value) => (
          <g key={value}>
            <line
              x1={PAD.left}
              x2={PAD.left + PLOT_W}
              y1={y(value)}
              y2={y(value)}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(value) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-xs tabular-nums"
            >
              {formatValue(value, "")}
            </text>
          </g>
        ))}

        {chartStyle === "area" ? <path d={areaPath} className="fill-primary/15" /> : null}

        <path
          d={line}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-primary"
        />

        {showMarkers
          ? coords.map((c) => (
              <circle
                key={c.date}
                cx={c.cx}
                cy={c.cy}
                r={4}
                className="fill-primary stroke-background"
                strokeWidth={2}
              >
                {/* Native hover, no script: the browser renders this as a
                    tooltip, which is how a zero-JS chart stays inspectable. */}
                <title>{`${formatDate(c.date)}: ${formatValue(c.value, indicator.unit)}`}</title>
              </circle>
            ))
          : null}

        {/* The x extents only. A label under every irregular point would
            overlap; the two ends plus the per-point titles carry the rest. */}
        <text
          x={PAD.left}
          y={VIEW_HEIGHT - 8}
          className="fill-muted-foreground text-xs tabular-nums"
        >
          {formatDate(points[0].date)}
        </text>
        <text
          x={PAD.left + PLOT_W}
          y={VIEW_HEIGHT - 8}
          textAnchor="end"
          className="fill-muted-foreground text-xs tabular-nums"
        >
          {formatDate(last.date)}
        </text>
      </svg>

      <figcaption className="flex flex-row flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {/* The latest value, direct-labelled — the one number a reader of a
            health chart almost always wants, without hovering for it. */}
        <span className="text-foreground">
          Latest {formatValue(last.value, indicator.unit)} on {formatDate(last.date)}
        </span>
        <span>
          {points.length} {points.length === 1 ? "reading" : "readings"}
        </span>
        {/* Membership is decided by the period's END date, so a 30-day window
            can legitimately contain a reading whose period began well before
            it. Unstated, that looks like the window is wrong. */}
        <span>windows include readings by period end date</span>
        {/* Said out loud rather than hidden: a chart that silently drops
            unusable readings overstates how complete it is. */}
        {discardedPointCount > 0 ? (
          <span>
            {discardedPointCount} unusable {discardedPointCount === 1 ? "reading" : "readings"} not
            shown
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
