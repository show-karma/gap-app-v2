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
 * Score breakdown as a horizontal stacked bar (U13c).
 *
 * Plan guidance: "Do not default to four circular progress dials in
 * colored circles — that is the canonical AI-slop pattern." This
 * component renders a single horizontal bar split into the four weighted
 * components, with an inline label table that's screen-reader-friendly
 * via a visually-hidden alternative.
 *
 * Unavailable components (e.g., activity scrape failed) render as
 * dashed/gray segments labeled "data unavailable" rather than zero-bar.
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
      color: "bg-emerald-500/80",
      placeholder: "bg-muted",
    },
    {
      key: "impactRecency" as const,
      label: "Impact recency",
      score: components.impactRecency,
      weight: weights.impactRecency,
      unavailable: false,
      color: "bg-blue-500/80",
      placeholder: "bg-muted",
    },
    {
      key: "donorMatch" as const,
      label: "Donor match",
      score: components.donorMatch,
      weight: weights.donorMatch,
      unavailable: false,
      color: "bg-purple-500/80",
      placeholder: "bg-muted",
    },
    {
      key: "compliance" as const,
      label: "Compliance",
      score: components.compliance,
      weight: weights.compliance,
      unavailable: false,
      color: "bg-amber-500/80",
      placeholder: "bg-muted",
    },
  ];

  return (
    <div className="mt-3">
      <div
        className="flex h-4 w-full overflow-hidden rounded-md border border-border"
        role="img"
        aria-label="Composite score breakdown"
      >
        {rows.map((row) => {
          const widthPct = row.weight * 100;
          const segmentFill = row.unavailable ? 0 : row.score;
          return (
            <div
              key={row.key}
              style={{ width: `${widthPct}%` }}
              className={`relative h-full ${
                row.unavailable
                  ? "bg-muted [background-image:repeating-linear-gradient(45deg,transparent_0,transparent_4px,rgba(0,0,0,0.05)_4px,rgba(0,0,0,0.05)_8px)]"
                  : row.placeholder
              }`}
            >
              {!row.unavailable ? (
                <div className={`${row.color} h-full`} style={{ width: `${segmentFill * 100}%` }} />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Visible label legend */}
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded ${row.unavailable ? "bg-muted-foreground" : row.color}`}
              aria-hidden
            />
            <span className="text-muted-foreground">
              {row.label}:{" "}
              <span className="tabular-nums text-foreground">
                {row.unavailable ? "—" : row.score.toFixed(2)}
              </span>
              <span className="ml-1 text-[10px]">×{row.weight.toFixed(2)}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* Screen-reader-friendly table mirror */}
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
