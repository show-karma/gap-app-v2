"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { CompositeWeights, ResearchReportCandidate } from "@/types/donor-research";
import { CandidateCard } from "../report-viewer/CandidateCard";
import { formatLocale, humanizeCase } from "./text-utils";

interface AlsoConsideredProps {
  candidates: readonly ResearchReportCandidate[];
  /** Starting rank for the first item — usually 4 if top-3 above. */
  startRank: number;
  /** Persisted report weights for each card's breakdown; `null` = legacy. */
  weights: CompositeWeights | null;
  /** Report id — required to mount the advisor diligence actions. */
  reportId?: string;
  /** Advisor-only: gates the Ask Questions / Connect footer per candidate. */
  showDiligenceActions?: boolean;
}

/**
 * The long-tail. Each row reads as a single line — rank, name, locale,
 * composite — inside an `sf-card`. Click to expand the row into the full
 * `CandidateCard`. Keeps the brief scannable without hiding the
 * underlying transparency.
 */
export function AlsoConsidered({
  candidates,
  startRank,
  weights,
  reportId,
  showDiligenceActions = false,
}: AlsoConsideredProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (candidates.length === 0) return null;

  return (
    <section
      className="rounded-sf-card border border-sf-line bg-sf-card px-6 py-6"
      data-section="also-considered"
    >
      <header>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-sf-heading">Also considered</h2>
        <p className="mt-1 max-w-[58ch] text-[13px] leading-[1.5] text-sf-muted">
          Surfaced by the same model but ranked below the top {startRank - 1}. Tap any row to read
          the full one-pager and compliance breakdown.
        </p>
      </header>

      <ol className="mt-4 flex flex-col overflow-hidden rounded-sf-tile border border-sf-line">
        {candidates.map((candidate, i) => {
          const rank = startRank + i;
          const name = humanizeCase(candidate.organizationName ?? "Unidentified", "title");
          const locale = formatLocale(candidate.organizationCity, candidate.organizationState);
          const composite100 = Math.round(candidate.composite * 100);
          const isOpen = expanded === candidate.id;
          const isDisqualified = candidate.complianceVerdict === "disqualified";

          return (
            <li className="[&+&]:border-t [&+&]:border-sf-line" key={candidate.id}>
              <button
                aria-controls={`also-${candidate.id}`}
                aria-expanded={isOpen}
                className="group grid w-full grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 px-4 py-3.5 text-left transition-colors hover:bg-sf-elev sm:grid-cols-[2.5rem_1fr_auto_1.5rem]"
                onClick={() => setExpanded(isOpen ? null : candidate.id)}
                type="button"
              >
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    isDisqualified ? "text-sf-muted/60" : "text-sf-muted"
                  }`}
                >
                  #{rank}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span
                    className={`truncate text-[14px] font-[600] leading-tight ${
                      isDisqualified ? "text-sf-muted line-through decoration-1" : "text-sf-heading"
                    }`}
                  >
                    {name}
                  </span>
                  {locale ? (
                    <span className="mt-0.5 truncate text-[11.5px] text-sf-muted">{locale}</span>
                  ) : null}
                </span>
                <span className="hidden text-right text-[11px] uppercase tracking-[0.1em] text-sf-muted sm:block">
                  {isDisqualified ? "Disqualified" : "Composite"}
                </span>
                <span
                  className={`text-right font-mono text-base tabular-nums ${
                    isDisqualified ? "text-sf-muted" : "text-sf-heading"
                  }`}
                >
                  {composite100}
                </span>
                <ChevronDown
                  aria-hidden
                  className={`col-start-3 hidden h-4 w-4 text-sf-muted transition-transform sm:col-auto sm:block ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen ? (
                <div className="border-t border-sf-line px-3 py-4" id={`also-${candidate.id}`}>
                  <CandidateCard
                    candidate={candidate}
                    reportId={reportId}
                    showDiligenceActions={showDiligenceActions}
                    variant="detail"
                    weights={weights}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
