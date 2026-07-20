import type { CompositeWeights, ResearchReportCandidate } from "@/types/donor-research";
import { cn } from "@/utilities/tailwind";
import { componentRows } from "./scoring";
import { TABLE_CAPTION, TABLE_CELL_EMPHASIS, TABLE_CELL_MONO, TABLE_WRAP } from "./table-classes";

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
    <div className="mt-6">
      <p className={TABLE_CAPTION}>How the score adds up</p>
      <dl
        className={cn(TABLE_WRAP, "flex flex-col divide-y divide-sf-line border-y border-sf-line")}
      >
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 py-2 text-[13px]"
          >
            <dt className="text-sf-ink">{row.label}</dt>
            <dd className={cn(TABLE_CELL_MONO, "text-sf-muted")} title="Score (0–100) × weight">
              {row.scoreOutOf100}
              <span className="text-sf-muted/70"> × </span>
              {Math.round(row.weight * 100)}%
            </dd>
            <dd className={cn(TABLE_CELL_EMPHASIS, "w-10 text-right")}>
              {row.contributionOutOf100}
            </dd>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 py-2.5 text-[13px]">
          <dt className="text-[10px] font-[650] uppercase tracking-[0.12em] text-sf-muted">
            Composite
          </dt>
          <dd aria-hidden />
          <dd className="w-10 text-right font-mono text-base font-[650] tabular-nums text-brand-emphasis dark:text-brand-subtle">
            {composite100}
          </dd>
        </div>
      </dl>
    </div>
  );
}
