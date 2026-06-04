"use client";

import { AlertTriangle } from "lucide-react";
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
  ca_ag_suspended: "Suspended on California AG charity registry",
  ca_ag_revoked: "Revoked on California AG charity registry",
  no_recent_990: "No 990 filing in the last 3 years",
  governance_red_flag: "Governance red flag on most-recent 990",
};

/**
 * Shows a per-reason breakdown when the report's candidate pool came
 * back but every candidate failed the compliance hard gate. Without
 * this the report viewer shows "0 candidates" with no explanation —
 * which usually means we couldn't find any candidates with a recent
 * IRS filing matching the criteria, not that the pipeline broke.
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

  return (
    <output className="mb-6 block rounded-md border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-700 dark:bg-amber-950/40">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1">
          <p className="font-medium text-amber-900 dark:text-amber-100">
            All {disqualified.length} {pluralize("candidate", disqualified.length)} failed
            compliance verification
          </p>
          <p className="mt-1 text-amber-800 dark:text-amber-200">
            None of the candidates the pipeline pulled cleared the hard compliance gate. Top
            recommendations are empty as a result.
          </p>

          {ordered.length > 0 ? (
            <ul className="mt-3 space-y-1 text-amber-900 dark:text-amber-100">
              {ordered.map(([reason, count]) => (
                <li key={reason} className="flex justify-between gap-3">
                  <span>{REASON_LABELS[reason] ?? reason}</span>
                  <span className="font-medium tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">
            Try broadening the criteria (different geography, wider cause) so the candidate pool
            draws from a different stratum.
          </p>
        </div>
      </div>
    </output>
  );
}
