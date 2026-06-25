import type { CompositeWeights, ResearchReportCandidate } from "@/types/donor-research";
import { briefDisplay } from "./fonts";
import { componentRows } from "./scoring";

interface ScoreBreakdownTableProps {
  candidate: ResearchReportCandidate;
  /** Persisted report weights; `null` renders the legacy four-row breakdown. */
  weights: CompositeWeights | null;
}

/**
 * "How the score adds up" — the per-component weighted breakdown shown on
 * EVERY candidate in the brief (lead and runner-ups alike), so each score
 * is explained in place rather than only in the comparison table. Each row
 * is score (0–100) × weight = contribution, summing to the composite.
 */
export function ScoreBreakdownTable({ candidate, weights }: ScoreBreakdownTableProps) {
  const rows = componentRows(candidate, weights);
  const composite100 = Math.round(candidate.composite * 100);

  return (
    <div className="mt-8">
      <p
        className={`${briefDisplay.className} text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground`}
      >
        How the score adds up
      </p>
      <dl
        className={`${briefDisplay.className} mt-3 flex flex-col divide-y divide-border/50 border-y border-border/50`}
      >
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 py-2 text-sm"
          >
            <dt className="text-foreground/80">{row.label}</dt>
            <dd className="tabular-nums text-foreground/70" title="Score (0–100) × weight">
              {row.scoreOutOf100}
              <span className="text-muted-foreground/70"> × </span>
              {Math.round(row.weight * 100)}%
            </dd>
            <dd className="w-10 text-right font-medium tabular-nums text-foreground">
              {row.contributionOutOf100}
            </dd>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 py-2.5 text-sm">
          <dt className="font-medium uppercase tracking-[0.18em] text-[10px] text-muted-foreground">
            Composite
          </dt>
          <dd aria-hidden />
          <dd className="w-10 text-right text-base font-medium tabular-nums text-brand-emphasis dark:text-brand-subtle">
            {composite100}
          </dd>
        </div>
      </dl>
    </div>
  );
}
