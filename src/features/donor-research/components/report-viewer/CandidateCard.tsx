"use client";

import { useState } from "react";
import type { ResearchReportCandidate } from "@/types/donor-research";
import { ScoreBreakdown } from "./ScoreBreakdown";

interface CandidateCardProps {
  candidate: ResearchReportCandidate;
  variant: "one-pager" | "detail";
}

/**
 * Per-candidate card (U13c).
 *
 * - `variant="one-pager"` is the dense top-3 view: composite score,
 *   reasoning summary, one-pager text.
 * - `variant="detail"` is the full ranked-list row: score breakdown
 *   visible inline, detailed text expandable.
 *
 * Score breakdown renders as a horizontal stacked bar per the plan's
 * U13c guidance (NOT four circular dials, which is the canonical AI-slop
 * pattern). Disqualified candidates are persisted with composite=0; the
 * card surfaces the compliance verdict + disqualification messaging so
 * the report explains the gate to the advisor.
 */
export function CandidateCard({ candidate, variant }: CandidateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isDisqualified = candidate.complianceVerdict === "disqualified";

  return (
    <article
      className={`rounded-xl border border-border bg-card p-4 ${
        isDisqualified ? "opacity-70" : ""
      }`}
    >
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">
            {candidate.ein ? `EIN ${formatEin(candidate.ein)}` : "EIN unknown"}
          </h3>
          <p className="text-xs text-muted-foreground">
            Verdict: <span className="capitalize">{candidate.complianceVerdict}</span>
            {" · "}
            Activity: <span className="lowercase">{candidate.activitySignalStatus}</span>
            {candidate.stateRegistrationStatus === "not_verified" ? (
              <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px]">
                State registration not verified
              </span>
            ) : null}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums">{candidate.composite.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Composite</p>
        </div>
      </header>

      <ScoreBreakdown
        components={candidate.components}
        activityStatus={candidate.activitySignalStatus}
      />

      {candidate.reasoningSummary ? (
        <p className="mt-3 text-sm text-foreground">{candidate.reasoningSummary}</p>
      ) : null}

      {variant === "one-pager" && candidate.onePagerText ? (
        <p className="mt-3 rounded-md bg-muted/40 p-3 text-sm">{candidate.onePagerText}</p>
      ) : null}

      {variant === "detail" ? (
        <details
          open={expanded}
          onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)}
          className="mt-3"
        >
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            {expanded ? "Hide" : "Show"} detailed reasoning
          </summary>
          {candidate.detailedText ? (
            <p className="mt-2 whitespace-pre-line text-sm text-foreground">
              {candidate.detailedText}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              No detailed text available for this candidate.
            </p>
          )}
        </details>
      ) : null}
    </article>
  );
}

function formatEin(ein: string): string {
  const digits = ein.replace(/[^0-9]/g, "");
  if (digits.length !== 9) return ein;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}
