"use client";

import { Check } from "lucide-react";
import pluralize from "pluralize";
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
    caption: "Finding organizations matching your criteria.",
  },
  {
    name: "compliance_complete",
    label: "Compliance verdict",
    caption: "Running Pub 78, recent 990, and CA AG checks.",
  },
  {
    name: "contact_discovery_complete",
    label: "Contact discovery",
    caption:
      "Searching the web for each candidate's official website and social handles (~30 seconds per organization).",
  },
  {
    name: "activity_complete",
    label: "Activity signal",
    caption: "Sampling website and social channels for freshness.",
  },
  {
    name: "ranking_complete",
    label: "Composite ranking",
    caption: "Combining the weighted scores into a single composite.",
  },
  {
    name: "report_finalized",
    label: "Report finalized",
    caption: "Synthesizing one-pager prose and assembling the featured set.",
  },
];

/**
 * Persistent result-count line for a completed stage, derived from that
 * stage's own terminal event payload (`data` is `Record<string, unknown>`
 * over the wire, so every field read is defensively narrowed). Returns
 * null when the expected numeric fields are missing or malformed so the
 * caller falls back to the plain label instead of rendering "undefined"
 * or "NaN".
 */
function formatPoolLoadedDetail(data: Record<string, unknown>): string | null {
  const count = data.count;
  if (typeof count !== "number") return null;
  return `${count} ${pluralize("candidate", count)} identified`;
}

function formatComplianceCompleteDetail(data: Record<string, unknown>): string | null {
  const scoredCount = data.scoredCount;
  const disqualifiedCount = data.disqualifiedCount;
  if (typeof scoredCount !== "number" || typeof disqualifiedCount !== "number") return null;
  return disqualifiedCount > 0
    ? `${scoredCount} passed · ${disqualifiedCount} disqualified`
    : `${scoredCount} passed`;
}

function formatContactDiscoveryCompleteDetail(data: Record<string, unknown>): string | null {
  const discovered = data.discovered;
  const cached = data.cached;
  const failed = data.failed;
  if (typeof discovered !== "number" || typeof cached !== "number") return null;
  const base = `${discovered} researched · ${cached} already known`;
  return typeof failed === "number" && failed > 0 ? `${base} · ${failed} failed` : base;
}

function formatRankingCompleteDetail(data: Record<string, unknown>): string | null {
  const rankedCount = data.rankedCount;
  if (typeof rankedCount !== "number") return null;
  return `${rankedCount} ${pluralize("candidate", rankedCount)} ranked`;
}

function formatActivityCompleteDetail(data: Record<string, unknown>): string | null {
  const { okCount, partialCount, failedCount, noSignalCount } = data;
  if (
    typeof okCount !== "number" ||
    typeof partialCount !== "number" ||
    typeof failedCount !== "number" ||
    typeof noSignalCount !== "number"
  ) {
    return null;
  }
  const total = okCount + partialCount + failedCount + noSignalCount;
  return `${total} ${pluralize("signal", total)} sampled`;
}

type StageDetailFormatter = (data: Record<string, unknown>) => string | null;

/** Resolves a completed stage's detail line, or null if it isn't seen yet, has no matching event, or has no formatter registered. */
function getStageDetailText(
  seen: boolean,
  stageEvent: FastReportEvent | undefined,
  formatter: StageDetailFormatter | undefined
): string | null {
  if (!seen || !stageEvent || !formatter) return null;
  return formatter(stageEvent.data);
}

/**
 * Caption shown while `stage` is the active step. Only the contact-discovery
 * stage swaps in a live counter (from the latest `contact_discovery_progress`
 * event); every other stage keeps its static caption unconditionally.
 */
function getActiveStageCaption(
  stage: { name: FastReportEvent["name"]; caption: string },
  progressEvent: FastReportEvent | undefined
): string {
  if (stage.name !== "contact_discovery_complete") return stage.caption;
  return formatContactDiscoveryProgressCaption(progressEvent?.data) ?? stage.caption;
}

const STAGE_DETAIL_FORMATTERS: Partial<Record<FastReportEvent["name"], StageDetailFormatter>> = {
  pool_loaded: formatPoolLoadedDetail,
  compliance_complete: formatComplianceCompleteDetail,
  contact_discovery_complete: formatContactDiscoveryCompleteDetail,
  ranking_complete: formatRankingCompleteDetail,
  activity_complete: formatActivityCompleteDetail,
};

/**
 * Live "Researching Y of X" caption for the active contact-discovery
 * stage, derived from the latest `contact_discovery_progress` event.
 * `done + 1` (clamped to `total`) surfaces the candidate currently being
 * worked rather than the count already finished. Returns null on
 * missing/malformed data so the caller falls back to the static caption
 * (covers the all-cached case, where no progress event is ever emitted).
 */
function formatContactDiscoveryProgressCaption(
  data: Record<string, unknown> | undefined
): string | null {
  if (!data) return null;
  const done = data.done;
  const total = data.total;
  if (typeof done !== "number" || typeof total !== "number" || total <= 0) return null;
  const current = Math.min(done + 1, total);
  return `Researching ${current} of ${total} ${pluralize("candidate", total)}…`;
}

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
  const eventByName = new Map(events.map((e) => [e.name, e] as const));
  const failed = events.some((e) => e.name === "report_failed");
  const progressEvent = eventByName.get("contact_discovery_progress");

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
            const stageEvent = eventByName.get(stage.name);
            const detail = getStageDetailText(
              seen,
              stageEvent,
              STAGE_DETAIL_FORMATTERS[stage.name]
            );
            const captionText = isActive ? getActiveStageCaption(stage, progressEvent) : detail;
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
                  {captionText ? (
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                      {captionText}
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
