import type { ResearchReportCandidate } from "@/types/donor-research";

interface ComplianceStripProps {
  candidate: ResearchReportCandidate;
}

/**
 * Compliance checks list shown on EVERY candidate in the brief (lead and
 * runner-ups alike), so each candidate's IRS Pub 78 / recent-990 / state
 * registry / governance verdicts are visible in place rather than only on
 * the lead. Renders nothing when the candidate carries no checks.
 */
export function ComplianceStrip({ candidate }: ComplianceStripProps) {
  const checks = candidate.complianceChecks ?? [];
  if (checks.length === 0) return null;
  return (
    <div className="mt-6">
      <p className="text-[10.5px] font-[650] uppercase tracking-[0.14em] text-sf-muted">
        Compliance
      </p>
      <ul className="mt-2.5 flex flex-col gap-1.5 text-[13px]">
        {checks.map((check) => (
          <li
            key={check.name}
            className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3"
            title={check.detail}
          >
            <StatusDot status={check.status} />
            <span className="truncate text-sf-ink">{check.label}</span>
            <span className="text-[11px] uppercase tracking-[0.1em] text-sf-muted">
              {humanizeStatus(check.status)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusDot({
  status,
}: {
  status: ResearchReportCandidate["complianceChecks"][number]["status"];
}) {
  const tone =
    status === "passed"
      ? "bg-brand"
      : status === "failed"
        ? "bg-amber-600 dark:bg-amber-400"
        : status === "not_applicable"
          ? "bg-sf-muted/30"
          : "bg-sf-muted/50";
  return (
    <span aria-hidden className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} />
  );
}

function humanizeStatus(status: string): string {
  if (status === "passed") return "Active";
  if (status === "failed") return "Flagged";
  if (status === "not_applicable") return "n/a";
  if (status === "unknown") return "Unknown";
  return status;
}
