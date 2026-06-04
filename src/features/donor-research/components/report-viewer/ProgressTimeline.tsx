"use client";

import type { FastReportEvent } from "@/types/donor-research";

interface ProgressTimelineProps {
  events: FastReportEvent[];
  latest: FastReportEvent | null;
  errorCount: number;
}

const STAGE_ORDER: Array<{
  name: FastReportEvent["name"];
  label: string;
}> = [
  { name: "snapshot", label: "Connected" },
  { name: "pool_loaded", label: "Candidate pool loaded" },
  { name: "compliance_complete", label: "Compliance check complete" },
  { name: "activity_complete", label: "Activity scraping complete" },
  { name: "ranking_complete", label: "Composite ranking complete" },
  { name: "report_finalized", label: "Report finalized" },
];

/**
 * Live SSE timeline (U13c). Each stage either shows the event detail
 * inline, or remains pending. The `aria-live` region announces the
 * latest event so screen-reader users hear the pipeline progress.
 */
export function ProgressTimeline({ events, latest, errorCount }: ProgressTimelineProps) {
  const seenNames = new Set(events.map((e) => e.name));
  const failed = events.some((e) => e.name === "report_failed");

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Pipeline progress</h3>
        {errorCount > 0 ? (
          <span className="text-xs text-amber-700">Stream reconnecting…</span>
        ) : null}
      </header>

      <ol className="flex flex-col gap-2">
        {STAGE_ORDER.map((stage) => {
          const seen = seenNames.has(stage.name);
          return (
            <li
              key={stage.name}
              className={`flex items-start gap-2 text-sm ${
                seen ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span
                aria-hidden
                className={`mt-1 h-2 w-2 rounded-full ${
                  seen ? "bg-emerald-500" : "bg-muted-foreground/50"
                }`}
              />
              <span>{stage.label}</span>
            </li>
          );
        })}
      </ol>

      {failed ? (
        <p className="mt-3 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          Pipeline reported a failure. Refresh once the report status settles to see error details.
        </p>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {latest
          ? `Latest stage: ${STAGE_ORDER.find((s) => s.name === latest.name)?.label ?? latest.name}`
          : "Awaiting pipeline events."}
      </p>
    </div>
  );
}
