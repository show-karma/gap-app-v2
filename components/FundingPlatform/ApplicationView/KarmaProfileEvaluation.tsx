"use client";

import {
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import type { FC } from "react";
import { KarmaProfileContextSection } from "./KarmaProfileContextSection";

type KarmaProfileStatus = "pending" | "in_progress" | "completed" | "failed" | "skipped";

type KarmaProfileSkipReason =
  | "no_field_configured"
  | "uid_empty"
  | "uid_invalid"
  | "project_not_found"
  | "aggregator_failed";

type Verdict = "strong" | "mixed" | "limited" | "no_history";
type HistoryDepth = "first_time" | "emerging" | "established";

interface ParsedEvaluation {
  verdict?: Verdict;
  history_depth?: HistoryDepth;
  narrative?: string;
  strengths?: string[];
  red_flags?: string[];
  stats?: {
    total_grants?: number;
    completed_grants?: number;
    total_milestones?: number;
    completed_milestones?: number;
    past_due_milestones?: number;
  };
}

interface KarmaProfileEvaluationDisplayProps {
  evaluation: string | null;
  context: string | null;
  status: KarmaProfileStatus | undefined;
  evaluatedAt: string | Date | undefined;
  skipReason?: KarmaProfileSkipReason;
  programName?: string;
}

const SKIP_COPY: Record<KarmaProfileSkipReason, string> = {
  no_field_configured:
    "This program doesn't ask for a Karma project link, or the Insights prompt isn't configured for this environment.",
  uid_empty:
    "The applicant didn't link a Karma project on their application, so there's no track record to evaluate.",
  uid_invalid:
    "The applicant provided a value in the Karma project field, but it isn't a valid project UID.",
  project_not_found:
    "The linked Karma project couldn't be loaded (deleted, not yet indexed, or no public data).",
  aggregator_failed:
    "The track-record aggregator failed to build the context. Try Re-evaluate, or check Sentry for the underlying error.",
};

// Verdict styling — color-coded so reviewers can scan from a distance.
const VERDICT_STYLE: Record<
  Verdict,
  { label: string; chip: string; ring: string }
> = {
  strong: {
    label: "Strong track record",
    chip: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    ring: "ring-green-200 dark:ring-green-800",
  },
  mixed: {
    label: "Mixed track record",
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    ring: "ring-amber-200 dark:ring-amber-800",
  },
  limited: {
    label: "Limited track record",
    chip: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    ring: "ring-orange-200 dark:ring-orange-800",
  },
  no_history: {
    label: "No prior history",
    chip: "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300",
    ring: "ring-gray-200 dark:ring-zinc-700",
  },
};

const HISTORY_DEPTH_LABEL: Record<HistoryDepth, string> = {
  first_time: "First-time applicant",
  emerging: "Emerging history",
  established: "Established history",
};

function formatEvaluatedAt(value: string | Date | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function safeParse(json: string): ParsedEvaluation | null {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed === "object" && parsed !== null) return parsed as ParsedEvaluation;
    return null;
  } catch {
    return null;
  }
}

/**
 * Renders the Karma Profile (track-record) AI evaluation for an application.
 * Purpose-built layout for the verdict/narrative/strengths/red_flags/stats
 * schema produced by the hardcoded Insights prompt — color-coded verdict
 * chip, two-column strengths/red-flags grid, stats as compact tiles, raw
 * aggregator markdown collapsible as the audit trail.
 */
export const KarmaProfileEvaluationDisplay: FC<KarmaProfileEvaluationDisplayProps> = ({
  evaluation,
  context,
  status,
  evaluatedAt,
  skipReason,
}) => {
  const evaluatedAtLabel = formatEvaluatedAt(evaluatedAt);

  return (
    <div>
      <div className="flex flex-col gap-1 pb-4 items-start">
        <div className="flex items-start justify-start gap-2">
          <ChartBarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold">Applications Insights</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          AI verdict on the applicant's delivery history across past Karma grants, milestones, and
          impact indicators. Independent of the application proposal: use this to weigh track record
          alongside the Internal evaluation.
        </p>
        {evaluatedAtLabel ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Evaluated {evaluatedAtLabel}
          </p>
        ) : null}
      </div>

      {status === "skipped" ? (
        <SkippedState reason={skipReason} />
      ) : status === "failed" ? (
        <FailedState />
      ) : status === "pending" || status === "in_progress" ? (
        <PendingState />
      ) : evaluation ? (
        <CompletedState evaluation={evaluation} context={context} />
      ) : (
        <PendingState />
      )}
    </div>
  );
};

function SkippedState({ reason }: { reason?: KarmaProfileSkipReason }) {
  const fallback = "Track-record evaluation didn't run for this application.";
  const copy = reason ? (SKIP_COPY[reason] ?? fallback) : fallback;
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Not evaluated</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{copy}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        If the underlying issue is fixed (applicant linked a project, program added the field), use
        Re-evaluate above to retry.
      </p>
    </div>
  );
}

function FailedState() {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
      <p className="text-sm text-red-600 dark:text-red-400">
        Track-record evaluation failed. Try Re-evaluate above, or check server logs.
      </p>
    </div>
  );
}

function PendingState() {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
      <ClockIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
      <p className="text-gray-500 dark:text-gray-400 text-sm">Track-record evaluation pending</p>
      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
        Fires automatically after submission. Check back in a few moments.
      </p>
    </div>
  );
}

function CompletedState({
  evaluation,
  context,
}: {
  evaluation: string;
  context: string | null;
}) {
  const parsed = safeParse(evaluation);
  if (!parsed) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to parse evaluation data. Re-run the evaluation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HeadlineRow verdict={parsed.verdict} historyDepth={parsed.history_depth} />

      {parsed.narrative ? <Narrative text={parsed.narrative} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <BulletList
          title="Strengths"
          items={parsed.strengths ?? []}
          accent="positive"
        />
        <BulletList
          title="Red flags"
          items={parsed.red_flags ?? []}
          accent="negative"
        />
      </div>

      <StatsRow stats={parsed.stats ?? {}} />

      <p className="text-xs text-gray-400 dark:text-gray-500">
        AI-generated. Verify counts and dates against the source data below before quoting them.
      </p>

      {context ? (
        <KarmaProfileContextSection
          context={context}
          title="Source data used"
          hint="Raw Karma project markdown the AI evaluated. Use this to audit any claim above."
        />
      ) : null}
    </div>
  );
}

function HeadlineRow({
  verdict,
  historyDepth,
}: {
  verdict?: Verdict;
  historyDepth?: HistoryDepth;
}) {
  const verdictStyle = verdict ? VERDICT_STYLE[verdict] : VERDICT_STYLE.no_history;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${verdictStyle.chip} ${verdictStyle.ring}`}
      >
        <SparklesIcon className="w-4 h-4" />
        {verdictStyle.label}
      </span>
      {historyDepth ? (
        <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-200 dark:ring-blue-800">
          {HISTORY_DEPTH_LABEL[historyDepth]}
        </span>
      ) : null}
    </div>
  );
}

function Narrative({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200">{text}</p>
    </div>
  );
}

function BulletList({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: "positive" | "negative";
}) {
  const Icon = accent === "positive" ? CheckCircleIcon : ExclamationTriangleIcon;
  const headerColor =
    accent === "positive"
      ? "text-green-700 dark:text-green-300"
      : "text-red-700 dark:text-red-300";
  const iconColor =
    accent === "positive"
      ? "text-green-500 dark:text-green-400"
      : "text-red-500 dark:text-red-400";
  const borderColor =
    accent === "positive"
      ? "border-green-100 dark:border-green-900/40"
      : "border-red-100 dark:border-red-900/40";

  return (
    <div className={`rounded-lg border ${borderColor} bg-white dark:bg-zinc-900/40 p-4`}>
      <div className={`flex items-center gap-2 mb-3 ${headerColor}`}>
        <Icon className="w-4 h-4" />
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
          {accent === "positive" ? "No notable strengths identified." : "No red flags identified."}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={`${accent}-${idx}`} className="flex items-start gap-2">
              <span className={`mt-1.5 w-1 h-1 flex-shrink-0 rounded-full ${iconColor.replace("text-", "bg-")}`} />
              <span className="text-sm text-gray-700 dark:text-gray-200">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatsRow({
  stats,
}: {
  stats: NonNullable<ParsedEvaluation["stats"]>;
}) {
  const tiles: { label: string; value: number; tone: "neutral" | "positive" | "warning" }[] = [
    { label: "Total grants", value: stats.total_grants ?? 0, tone: "neutral" },
    {
      label: "Completed grants",
      value: stats.completed_grants ?? 0,
      tone: (stats.completed_grants ?? 0) > 0 ? "positive" : "neutral",
    },
    { label: "Total milestones", value: stats.total_milestones ?? 0, tone: "neutral" },
    {
      label: "Completed milestones",
      value: stats.completed_milestones ?? 0,
      tone: (stats.completed_milestones ?? 0) > 0 ? "positive" : "neutral",
    },
    {
      label: "Past due",
      value: stats.past_due_milestones ?? 0,
      tone: (stats.past_due_milestones ?? 0) > 0 ? "warning" : "neutral",
    },
  ];

  const toneClass = {
    neutral: "text-gray-900 dark:text-gray-100",
    positive: "text-green-600 dark:text-green-400",
    warning: "text-red-600 dark:text-red-400",
  } as const;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/40 px-3 py-2"
        >
          <div className={`text-2xl font-semibold ${toneClass[tile.tone]}`}>{tile.value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tile.label}</div>
        </div>
      ))}
    </div>
  );
}
