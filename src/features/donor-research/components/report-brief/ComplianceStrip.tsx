import type { ResearchReportCandidate } from "@/types/donor-research";
import { briefDisplay } from "./fonts";

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
    <div className="mt-7">
      <p
        className={`${briefDisplay.className} text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground`}
      >
        Compliance
      </p>
      <ul className={`${briefDisplay.className} mt-3 flex flex-col gap-1.5 text-sm`}>
        {checks.map((check) => (
          <li
            key={check.name}
            className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3"
            title={check.detail}
          >
            <StatusDot status={check.status} />
            <span className="truncate text-foreground/80">{check.label}</span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
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
          ? "bg-muted-foreground/30"
          : "bg-muted-foreground/50";
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
