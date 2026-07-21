"use client";

import pluralize from "pluralize";
import type {
  ComplianceDisqualificationReason,
  ResearchReportCandidate,
} from "@/types/donor-research";

interface DisqualificationSummaryProps {
  candidates: ResearchReportCandidate[];
}

const REASON_LABELS: Record<ComplianceDisqualificationReason, string> = {
  pub78_revoked: "Not in IRS Pub 78 (or no recent 990 filing)",
  ca_ag_suspended: "Suspended on the California AG charity registry",
  ca_ag_revoked: "Revoked on the California AG charity registry",
  no_recent_990: "No 990 filing in the last three years",
  governance_red_flag: "Governance red flag on most recent 990",
};

/**
 * Shows a per-reason breakdown when the report's candidate pool came
 * back but every candidate failed the compliance hard gate. Without
 * this the report viewer shows "0 candidates" with no explanation —
 * which usually means we couldn't find any candidates with a recent
 * IRS filing matching the criteria, not that the pipeline broke.
 *
 * Post-impeccable: dropped the bright amber alarm shell; this is data,
 * not a fire. Treated as an editorial brief instead — eyebrow + lead +
 * a quiet table — so the advisor reads it as "what happened" not "what
 * exploded."
 */
export function DisqualificationSummary({ candidates }: DisqualificationSummaryProps) {
  const disqualified = candidates.filter((c) => c.complianceVerdict === "disqualified");
  if (disqualified.length === 0) return null;

  const counts = new Map<ComplianceDisqualificationReason, number>();
  for (const candidate of disqualified) {
    for (const reason of candidate.disqualificationReasons ?? []) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }
  const ordered = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const total = disqualified.length;

  return (
    <output className="block overflow-hidden rounded-sf-card border border-sf-line bg-sf-card">
      <div className="border-b border-sf-line px-5 py-3.5">
        <p className="text-[10.5px] font-[650] uppercase tracking-[0.14em] text-sf-muted">
          Compliance verdict
        </p>
        <p className="mt-1 text-[15px] font-[600] text-sf-heading">
          All {total} {pluralize("candidate", total)} failed the hard compliance gate.
        </p>
        <p className="mt-1 max-w-2xl text-[13px] text-sf-muted">
          No qualifying candidates surfaced. Most often the criteria pulled into a stratum the IRS
          hasn't indexed recently. Try broadening geography or cause to draw from a different slice.
        </p>
      </div>

      {ordered.length > 0 ? (
        <dl className="divide-y divide-sf-line">
          {ordered.map(([reason, count]) => (
            <div className="flex items-center justify-between gap-4 px-5 py-2.5" key={reason}>
              <dt className="text-[13px] text-sf-ink">{REASON_LABELS[reason] ?? reason}</dt>
              <dd className="flex items-baseline gap-1.5">
                <span className="font-mono text-[13px] font-[600] tabular-nums text-sf-heading">
                  {count}
                </span>
                <span className="text-[11px] text-sf-muted">/ {total}</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </output>
  );
}
