"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { CompositeWeights, ResearchReportCandidate } from "@/types/donor-research";
import { CandidateCard } from "../report-viewer/CandidateCard";
import { briefDisplay, briefProse } from "./fonts";
import { formatLocale, humanizeCase } from "./text-utils";

interface AlsoConsideredProps {
  candidates: readonly ResearchReportCandidate[];
  /** Starting rank for the first item — usually 4 if top-3 above. */
  startRank: number;
  /** Persisted report weights for each card's breakdown; `null` = legacy. */
  weights: CompositeWeights | null;
}

/**
 * The long-tail. Each row reads as a single typographic line:
 *   04 · Sound Cities Conservancy · San Jose, CA · 58
 * Click to expand the row into the full CandidateCard. Keeps the
 * brief scannable without hiding the underlying transparency.
 */
export function AlsoConsidered({ candidates, startRank, weights }: AlsoConsideredProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (candidates.length === 0) return null;

  return (
    <section className="mb-20 sm:mb-24">
      <header className="mb-6 sm:mb-8">
        <p
          className={`${briefDisplay.className} text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground`}
        >
          Also considered
        </p>
        <h2
          className={`${briefDisplay.className} mt-2 text-balance text-[clamp(1.5rem,3vw,2rem)] font-medium leading-[1.1] tracking-[-0.018em] text-foreground`}
        >
          The rest of the pool, in rank order.
        </h2>
        <p
          className={`${briefProse.className} mt-3 max-w-[58ch] text-[1rem] leading-[1.55] text-foreground/75`}
        >
          Surfaced by the same model but ranked below the lead three. Tap any row to read the full
          one-pager and compliance breakdown.
        </p>
      </header>

      <ol className="flex flex-col border-y border-border/70">
        {candidates.map((candidate, i) => {
          const rank = startRank + i;
          const name = humanizeCase(candidate.organizationName ?? "Unidentified", "title");
          const locale = formatLocale(candidate.organizationCity, candidate.organizationState);
          const composite100 = Math.round(candidate.composite * 100);
          const isOpen = expanded === candidate.id;
          const isDisqualified = candidate.complianceVerdict === "disqualified";

          return (
            <li key={candidate.id} className="border-b border-border/60 last:border-b-0">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : candidate.id)}
                aria-expanded={isOpen}
                aria-controls={`also-${candidate.id}`}
                className={`${briefDisplay.className} group grid w-full grid-cols-[2.75rem_1fr_auto] items-baseline gap-x-4 py-4 text-left transition-colors hover:bg-foreground/[0.02] sm:grid-cols-[3.5rem_1fr_auto_2.5rem]`}
              >
                <span
                  className={`text-[11px] font-medium uppercase tracking-[0.18em] tabular-nums ${
                    isDisqualified ? "text-muted-foreground/60" : "text-muted-foreground"
                  }`}
                >
                  {String(rank).padStart(2, "0")}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span
                    className={`truncate text-[1rem] font-medium leading-tight ${
                      isDisqualified
                        ? "text-muted-foreground line-through decoration-1"
                        : "text-foreground"
                    }`}
                  >
                    {name}
                  </span>
                  {locale ? (
                    <span className="mt-0.5 truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {locale}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`hidden text-right text-[11px] uppercase tracking-[0.18em] tabular-nums text-muted-foreground sm:block`}
                >
                  {isDisqualified ? "Disqualified" : "Composite"}
                </span>
                <span
                  className={`text-right text-lg font-light tabular-nums ${
                    isDisqualified ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {composite100}
                </span>
                <ChevronDown
                  aria-hidden
                  className={`col-start-3 hidden h-4 w-4 text-muted-foreground transition-transform sm:col-auto sm:block ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen ? (
                <div id={`also-${candidate.id}`} className="border-t border-border/50 px-1 py-4">
                  <CandidateCard candidate={candidate} variant="detail" weights={weights} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
