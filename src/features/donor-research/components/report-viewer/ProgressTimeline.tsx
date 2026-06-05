"use client";

import { Check } from "lucide-react";
import type { FastReportEvent } from "@/types/donor-research";

interface ProgressTimelineProps {
  events: FastReportEvent[];
  latest: FastReportEvent | null;
  errorCount: number;
}

const STAGE_ORDER: Array<{
  name: FastReportEvent["name"];
  label: string;
  /** Caption shown under the label while this stage is the active one. */
  caption: string;
}> = [
  {
    name: "snapshot",
    label: "Connected",
    caption: "Subscribed to the live pipeline stream.",
  },
  {
    name: "pool_loaded",
    label: "Candidate pool",
    caption: "Querying the 200k-org embedding index for matches.",
  },
  {
    name: "compliance_complete",
    label: "Compliance verdict",
    caption: "Running Pub 78, recent 990, and CA AG checks.",
  },
  {
    name: "activity_complete",
    label: "Activity signal",
    caption: "Sampling website and social channels for freshness.",
  },
  {
    name: "ranking_complete",
    label: "Composite ranking",
    caption: "Combining the four weighted scores into a single composite.",
  },
  {
    name: "report_finalized",
    label: "Report finalized",
    caption: "Synthesizing one-pager prose and assembling the top three.",
  },
];

/**
 * Live SSE timeline (U13c, post-impeccable redesign).
 *
 * Vertical stepper anchored by a single connecting line on the left.
 * The line is half brand color (completed) and half hairline (pending),
 * with the active stage marked by a pulsing dot. This conveys a real
 * progression metaphor — distance traveled vs. distance remaining —
 * instead of the prior six identical dots that all flipped green.
 *
 * `aria-live="polite"` announces the latest stage to assistive tech.
 */
export function ProgressTimeline({ events, latest, errorCount }: ProgressTimelineProps) {
  const seenNames = new Set(events.map((e) => e.name));
  const failed = events.some((e) => e.name === "report_failed");

  // Find the active stage: the first one we haven't seen yet (or null
  // if everything is complete).
  const activeIndex = STAGE_ORDER.findIndex((s) => !seenNames.has(s.name));
  const progressFraction =
    activeIndex === -1 ? 1 : activeIndex / Math.max(STAGE_ORDER.length - 1, 1);

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-card"
      aria-label="Pipeline progress"
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-border/60 px-5 py-3">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Pipeline
          </h3>
          {activeIndex !== -1 ? (
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {STAGE_ORDER[activeIndex].label}
            </p>
          ) : (
            <p className="mt-0.5 text-sm font-medium text-foreground">All stages complete</p>
          )}
        </div>
        {errorCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            Stream reconnecting
          </span>
        ) : null}
      </header>

      <div className="relative px-5 py-4">
        {/* Vertical connecting line — pinned to the left of the step dots.
            Background hairline (full height), filled by a brand-color
            overlay that animates to the active step. */}
        <div className="absolute left-[1.85rem] top-7 bottom-7 w-px bg-border" aria-hidden />
        <div
          className="absolute left-[1.85rem] top-7 w-px bg-brand transition-all duration-700 ease-out"
          aria-hidden
          style={{ height: `calc((100% - 3.5rem) * ${progressFraction})` }}
        />

        <ol className="flex flex-col gap-3.5">
          {STAGE_ORDER.map((stage, index) => {
            const seen = seenNames.has(stage.name);
            const isActive = index === activeIndex;
            return (
              <li key={stage.name} className="relative flex items-start gap-3.5">
                <span
                  aria-hidden
                  className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    seen
                      ? "border-brand bg-brand text-card"
                      : isActive
                        ? "border-brand bg-card"
                        : "border-border bg-card"
                  }`}
                >
                  {seen ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : isActive ? (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
                  ) : null}
                </span>
                <div className="flex-1 pt-px">
                  <p
                    className={`text-sm leading-tight ${
                      seen
                        ? "font-medium text-foreground"
                        : isActive
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {stage.label}
                  </p>
                  {isActive ? (
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                      {stage.caption}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {failed ? (
        <p className="border-t border-border/60 bg-amber-50 px-5 py-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Pipeline reported a failure. Refresh once the report status settles to see error details.
        </p>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {latest
          ? `Latest stage: ${STAGE_ORDER.find((s) => s.name === latest.name)?.label ?? latest.name}`
          : "Awaiting pipeline events."}
      </p>
    </section>
  );
}
