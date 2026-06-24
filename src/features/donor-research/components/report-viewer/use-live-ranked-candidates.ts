import { useMemo } from "react";
import type { CompositeWeights, ResearchReportCandidate } from "@/types/donor-research";
import { type RankedCandidate, recompute } from "../report-brief/scoring";

export interface LiveRanking {
  /** Candidates re-ranked under the previewed weights, best-first. */
  ranked: RankedCandidate[];
  /** Ids gaining top-3 status vs the persisted report (one-pager regenerates). */
  entering: Set<string>;
  /** Ids losing top-3 status vs the persisted report (one-pager nulled). */
  leaving: Set<string>;
  /**
   * Number of candidates entering the top-3 — the count of one-pagers the
   * backend will synthesize on commit, surfaced in the confirmation dialog.
   */
  flippedCount: number;
}

/**
 * Diff a previewed weight set against the persisted ranking, entirely in the
 * browser (DEV-418 R11/R12). Pure so it can be unit-tested and reused by the
 * optimistic-update path. `entering`/`leaving` drive the flip badges and the
 * commit dialog copy; `ranked` is the order the preview list renders.
 */
export function computeLiveRanking(
  candidates: readonly ResearchReportCandidate[],
  weights: CompositeWeights,
  topCount: number
): LiveRanking {
  const ranked = recompute(candidates, weights, topCount);
  const wasFeatured = new Set(candidates.filter((c) => c.featuredFlag).map((c) => c.id));

  const entering = new Set<string>();
  const leaving = new Set<string>();
  for (const entry of ranked) {
    const id = entry.candidate.id;
    if (entry.featuredFlag && !wasFeatured.has(id)) entering.add(id);
    else if (!entry.featuredFlag && wasFeatured.has(id)) leaving.add(id);
  }

  return { ranked, entering, leaving, flippedCount: entering.size };
}

/** Memoized {@link computeLiveRanking} for the WeightsPanel live preview. */
export function useLiveRankedCandidates(
  candidates: readonly ResearchReportCandidate[],
  weights: CompositeWeights,
  topCount: number
): LiveRanking {
  return useMemo(
    () => computeLiveRanking(candidates, weights, topCount),
    [candidates, weights, topCount]
  );
}
