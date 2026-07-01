import pluralize from "pluralize";
import type { CheckEvidence } from "../types";

const STATUS_TONE: Record<CheckEvidence["status"], string> = {
  pass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  fail: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  not_attempted: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  error: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const STATUS_LABEL: Record<CheckEvidence["status"], string> = {
  pass: "Pass",
  partial: "Partial",
  fail: "Fail",
  not_attempted: "Not attempted",
  error: "Check error",
};

interface EvidenceListProps {
  readonly evidence: readonly CheckEvidence[];
}

export function EvidenceList({ evidence }: EvidenceListProps) {
  if (evidence.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {evidence.length} {pluralize("check", evidence.length)}
      </h3>
      <ul className="flex flex-col gap-2">
        {evidence.map((check) => (
          <li
            key={check.checkId}
            className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {check.checkId}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[check.status]}`}
              >
                {STATUS_LABEL[check.status]}
              </span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{check.summary}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              {check.pointsAwarded} / {check.pointsPossible}{" "}
              {pluralize("point", check.pointsPossible)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
