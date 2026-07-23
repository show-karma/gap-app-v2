"use client";

import { AlertCircle, Check, LoaderCircle, Minus } from "lucide-react";
import pluralize from "pluralize";
import { memo } from "react";
import { SkeletonList } from "@/components/Pages/Dashboard/v3/primitives";
import type {
  CandidateEnrichmentStage,
  CandidateStageStatus,
  FastReportEvent,
  IdentifiedReportCandidate,
} from "@/types/donor-research";

const STAGES: ReadonlyArray<{ name: CandidateEnrichmentStage; label: string }> = [
  { name: "compliance", label: "Compliance" },
  { name: "contacts", label: "Contacts" },
  { name: "news", label: "News" },
  { name: "social", label: "Social" },
];

interface CandidateStageProgress {
  status: CandidateStageStatus;
  detail: string;
  verdict: string | null;
}

interface CandidateProgressProps {
  events: FastReportEvent[];
}

function isCandidate(value: unknown): value is IdentifiedReportCandidate {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.fundingOrganizationId === "string" &&
    typeof candidate.name === "string" &&
    (candidate.city === null || typeof candidate.city === "string") &&
    (candidate.state === null || typeof candidate.state === "string")
  );
}

function getIdentifiedCandidates(events: FastReportEvent[]): IdentifiedReportCandidate[] | null {
  const event = events.find((item) => item.name === "candidates_identified");
  if (!event || !Array.isArray(event.data.candidates)) return null;
  return event.data.candidates.filter(isCandidate);
}

function isStage(value: unknown): value is CandidateEnrichmentStage {
  return STAGES.some((stage) => stage.name === value);
}

function isStatus(value: unknown): value is CandidateStageStatus {
  return value === "ok" || value === "skipped" || value === "failed";
}

function getStageProgressByCandidate(
  events: FastReportEvent[]
): Map<string, Map<CandidateEnrichmentStage, CandidateStageProgress>> {
  const progressByCandidate = new Map<
    string,
    Map<CandidateEnrichmentStage, CandidateStageProgress>
  >();

  for (const event of events) {
    if (event.name !== "candidate_stage_complete") continue;
    const { fundingOrganizationId, stage, status, detail, verdict } = event.data;
    if (
      typeof fundingOrganizationId !== "string" ||
      !isStage(stage) ||
      !isStatus(status) ||
      typeof detail !== "string"
    ) {
      continue;
    }
    const candidateProgress = progressByCandidate.get(fundingOrganizationId) ?? new Map();
    candidateProgress.set(stage, {
      status,
      detail,
      verdict: typeof verdict === "string" ? verdict : null,
    });
    progressByCandidate.set(fundingOrganizationId, candidateProgress);
  }

  return progressByCandidate;
}

function locationFor(candidate: IdentifiedReportCandidate): string | null {
  return [candidate.city, candidate.state].filter(Boolean).join(", ") || null;
}

function isCandidateSettled(
  progress: Map<CandidateEnrichmentStage, CandidateStageProgress> | undefined
): boolean {
  if (!progress) return false;
  if (progress.get("compliance")?.verdict === "disqualified") return true;
  return STAGES.every((stage) => progress.has(stage.name));
}

interface StageStatusProps {
  disqualified: boolean;
  label: string;
  progress: CandidateStageProgress | undefined;
  stage: CandidateEnrichmentStage;
}

const StageStatus = memo(function StageStatus({
  disqualified,
  label,
  progress,
  stage,
}: StageStatusProps) {
  const wasSkippedByCompliance = disqualified && stage !== "compliance";
  const wasDisqualified = stage === "compliance" && progress?.verdict === "disqualified";
  const status = wasSkippedByCompliance || wasDisqualified ? "skipped" : progress?.status;
  const detail = wasSkippedByCompliance ? "Not run after screening" : progress?.detail;

  return (
    <li className="min-w-0">
      <p className="text-[10px] font-[650] uppercase tracking-[0.09em] text-sf-muted">{label}</p>
      <div className="mt-1 flex min-w-0 items-start gap-1.5">
        <StageIcon status={status} />
        <p
          className={`min-w-0 text-[11.5px] leading-[1.35] ${
            status === "failed"
              ? "text-amber-700 dark:text-amber-300"
              : status === "skipped"
                ? "text-sf-muted"
                : "text-sf-ink"
          }`}
        >
          {detail ?? "Waiting"}
        </p>
      </div>
    </li>
  );
});

function StageIcon({ status }: { status: CandidateStageStatus | undefined }) {
  if (status === "ok") {
    return (
      <span className="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand-emphasis dark:text-brand-subtle">
        <Check aria-hidden="true" className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === "failed") {
    return <AlertCircle aria-hidden="true" className="mt-px h-4 w-4 shrink-0 text-amber-600" />;
  }
  if (status === "skipped") {
    return (
      <span className="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sf-chip text-sf-muted">
        <Minus aria-hidden="true" className="h-2.5 w-2.5" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <LoaderCircle
      aria-hidden="true"
      className="mt-px h-4 w-4 shrink-0 animate-spin text-brand motion-reduce:animate-none"
    />
  );
}

/**
 * Live candidate ledger fed by PR #2216's granular SSE events. It replaces
 * anonymous skeletons as soon as the pool resolves, then settles each
 * candidate's four enrichment cells independently. The list is capped to a
 * reading viewport so a 200-candidate run does not push the pipeline context
 * thousands of pixels down the page.
 */
export function CandidateProgress({ events }: CandidateProgressProps) {
  const candidates = getIdentifiedCandidates(events);
  if (!candidates) return <SkeletonList count={3} />;

  if (candidates.length === 0) {
    return (
      <section
        aria-label="Candidate research progress"
        className="rounded-sf-card border border-sf-line bg-sf-card px-5 py-4"
      >
        <p className="text-sm font-medium text-sf-heading">
          No matching candidates were identified.
        </p>
        <p className="mt-1 text-xs text-sf-muted">
          The report will finish without recommendations.
        </p>
      </section>
    );
  }

  const progressByCandidate = getStageProgressByCandidate(events);
  const settledCount = candidates.reduce(
    (count, candidate) =>
      count +
      (isCandidateSettled(progressByCandidate.get(candidate.fundingOrganizationId)) ? 1 : 0),
    0
  );

  return (
    <section
      aria-label="Candidate research progress"
      className="overflow-hidden rounded-sf-card border border-sf-line bg-sf-card"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-sf-line px-5 py-3.5">
        <div>
          <h3 className="text-sm font-[650] text-sf-heading">
            {candidates.length} {pluralize("candidate", candidates.length)} identified
          </h3>
          <p className="mt-0.5 text-xs text-sf-muted">
            Research resolves independently for each organization.
          </p>
        </div>
        {settledCount > 0 ? (
          <p className="font-mono text-[11px] tabular-nums text-sf-muted">
            {settledCount} / {candidates.length} reviewed
          </p>
        ) : (
          <p className="text-[11px] font-medium text-brand-emphasis dark:text-brand-subtle">
            Research underway
          </p>
        )}
      </header>

      <ol className="max-h-[34rem] overflow-y-auto">
        {candidates.map((candidate) => {
          const progress = progressByCandidate.get(candidate.fundingOrganizationId);
          const disqualified = progress?.get("compliance")?.verdict === "disqualified";
          const location = locationFor(candidate);
          return (
            <li
              className="grid gap-3 border-t border-sf-line px-5 py-4 first:border-t-0 lg:grid-cols-[minmax(11rem,0.8fr)_minmax(0,3.2fr)] lg:gap-6"
              key={candidate.fundingOrganizationId}
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-[650] text-sf-heading">{candidate.name}</p>
                {location ? (
                  <p className="mt-0.5 truncate text-[11.5px] text-sf-muted">{location}</p>
                ) : null}
              </div>
              <ul
                aria-label={`Research stages for ${candidate.name}`}
                className="grid grid-cols-2 gap-x-4 gap-y-3 xl:grid-cols-4"
              >
                {STAGES.map((stage) => (
                  <StageStatus
                    disqualified={disqualified}
                    key={stage.name}
                    label={stage.label}
                    progress={progress?.get(stage.name)}
                    stage={stage.name}
                  />
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
