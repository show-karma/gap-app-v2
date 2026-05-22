"use client";

import { ChartBarIcon, ClockIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { EvaluationDisplay } from "./EvaluationComponents";
import {
  getPriorityColor,
  getScoreColor,
  getScoreIcon,
  getStatusColor,
  parseEvaluation,
} from "./evaluationUtils";
import { KarmaProfileContextSection } from "./KarmaProfileContextSection";

type KarmaProfileStatus = "pending" | "in_progress" | "completed" | "failed" | "skipped";

type KarmaProfileSkipReason =
  | "no_field_configured"
  | "uid_empty"
  | "uid_invalid"
  | "project_not_found"
  | "aggregator_failed";

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

function formatEvaluatedAt(value: string | Date | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // YYYY-MM-DD HH:mm — readable, locale-stable.
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Renders the Karma Profile (track-record) AI evaluation for an application.
 * Free-form LLM JSON → generic EvaluationDisplay walker (same renderer as
 * Internal — see PRP §"No strict output schema for Insights"). Raw aggregator
 * markdown is surfaced below as the reviewer's audit trail.
 */
export const KarmaProfileEvaluationDisplay: FC<KarmaProfileEvaluationDisplayProps> = ({
  evaluation,
  context,
  status,
  evaluatedAt,
  skipReason,
  programName,
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
          impact indicators. Independent of the application proposal — use this to weigh track
          record alongside the Internal evaluation.
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
        <CompletedState evaluation={evaluation} context={context} programName={programName} />
      ) : (
        <PendingState />
      )}
    </div>
  );
};

function SkippedState({ reason }: { reason?: KarmaProfileSkipReason }) {
  const copy = reason
    ? SKIP_COPY[reason]
    : "Track-record evaluation didn't run for this application.";
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
  programName,
}: {
  evaluation: string;
  context: string | null;
  programName?: string;
}) {
  const parsed = parseEvaluation(evaluation);
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
    <>
      <EvaluationDisplay
        data={parsed}
        programName={programName}
        getScoreIcon={getScoreIcon}
        getStatusColor={getStatusColor}
        getScoreColor={getScoreColor}
        getPriorityColor={getPriorityColor}
        footerDisclaimer="AI-generated — verify counts and dates against the source data block below before quoting them."
      />
      {context ? (
        <KarmaProfileContextSection
          context={context}
          title="Source data used"
          hint="Raw Karma project markdown the AI evaluated. Use this to audit any claim above."
        />
      ) : null}
    </>
  );
}
