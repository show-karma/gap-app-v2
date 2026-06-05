import type { ActivitySignalStatus } from "@/types/donor-research";

interface ScoreBreakdownProps {
  components: {
    freshness: number;
    impactRecency: number;
    donorMatch: number;
    compliance: number;
  };
  activityStatus: ActivitySignalStatus;
}

/**
 * Score breakdown as a horizontal stacked bar (U13c, post-impeccable
 * redesign).
 *
 * Plan guidance: "Do not default to four circular progress dials in
 * colored circles." We previously had four bars colored in the
 * emerald/blue/purple/amber rainbow — the canonical AI dashboard
 * palette. This version uses a monochromatic brand-teal ramp so the
 * chart reads as one family of measurements, not four unrelated metrics.
 * Categories are distinguished by position + label, not hue.
 *
 * Unavailable components (e.g., activity scrape failed) render as a
 * diagonal hatch labeled "unavailable" — never a zero-fill, which
 * misleads as "scored zero."
 */
export function ScoreBreakdown({ components, activityStatus }: ScoreBreakdownProps) {
  const weights = {
    freshness: 0.35,
    impactRecency: 0.25,
    donorMatch: 0.25,
    compliance: 0.15,
  };
  const unavailable = activityStatus === "scrape_failed";

  const rows = [
    {
      key: "freshness" as const,
      label: "Freshness",
      score: components.freshness,
      weight: weights.freshness,
      unavailable,
      // Brand teal at full intensity — anchors the chart visually.
      fill: "bg-brand-emphasis",
      swatch: "bg-brand-emphasis",
    },
    {
      key: "impactRecency" as const,
      label: "Impact recency",
      score: components.impactRecency,
      weight: weights.impactRecency,
      unavailable: false,
      fill: "bg-brand",
      swatch: "bg-brand",
    },
    {
      key: "donorMatch" as const,
      label: "Donor match",
      score: components.donorMatch,
      weight: weights.donorMatch,
      unavailable: false,
      fill: "bg-brand-subtle",
      swatch: "bg-brand-subtle",
    },
    {
      key: "compliance" as const,
      label: "Compliance",
      score: components.compliance,
      weight: weights.compliance,
      unavailable: false,
      fill: "bg-brand-muted",
      swatch: "bg-brand-muted",
    },
  ];

  return (
    <div>
      {/* Horizontal stacked bar. Width = weight share; fill = score. */}
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label="Composite score breakdown"
      >
        {rows.map((row) => {
          const widthPct = row.weight * 100;
          return (
            <div
              key={row.key}
              style={{ width: `${widthPct}%` }}
              className={`relative h-full ${
                row.unavailable
                  ? "bg-[repeating-linear-gradient(45deg,transparent_0,transparent_3px,rgba(127,127,127,0.18)_3px,rgba(127,127,127,0.18)_6px)]"
                  : "bg-muted"
              }`}
            >
              {!row.unavailable ? (
                <div className={`${row.fill} h-full`} style={{ width: `${row.score * 100}%` }} />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Legend: a quiet grid that lets the eye scan score values fast. */}
      <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        {rows.map((row) => (
          <div key={row.key} className="flex items-baseline gap-1.5">
            <span aria-hidden className={`h-2 w-2 shrink-0 rounded-sm ${row.swatch}`} />
            <dt className="truncate text-muted-foreground">{row.label}</dt>
            <dd className="ml-auto font-mono text-foreground tabular-nums">
              {row.unavailable ? "—" : row.score.toFixed(2)}
            </dd>
          </div>
        ))}
      </dl>

      <table className="sr-only">
        <caption>Score component breakdown</caption>
        <thead>
          <tr>
            <th scope="col">Component</th>
            <th scope="col">Score</th>
            <th scope="col">Weight</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              <td>{row.unavailable ? "unavailable" : row.score.toFixed(2)}</td>
              <td>{row.weight.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
