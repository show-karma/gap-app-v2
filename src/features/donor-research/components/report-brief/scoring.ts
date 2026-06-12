import type { ResearchReportCandidate } from "@/types/donor-research";

/**
 * Component weights duplicated from the backend's composite-ranking
 * service so the brief can render the math without a round-trip. Keep
 * in sync when the backend weights change.
 */
export const COMPONENT_WEIGHTS = {
  freshness: 0.35,
  impactRecency: 0.25,
  donorMatch: 0.25,
  compliance: 0.15,
} as const;

type ComponentKey = keyof typeof COMPONENT_WEIGHTS;

interface ComponentRow {
  key: ComponentKey;
  label: string;
  /** 0..1 — already on the same scale as `candidate.components.*`. */
  score: number;
  /** 0..1 — weight in the composite. */
  weight: number;
  /** scaled 0..100 — what reads in the brief. */
  scoreOutOf100: number;
  /** contribution to the composite in 0..100 = score * weight * 100. */
  contributionOutOf100: number;
}

export function componentRows(candidate: ResearchReportCandidate): readonly ComponentRow[] {
  const { components } = candidate;
  const rows: ComponentRow[] = [
    row("donorMatch", "Mission match", components.donorMatch),
    row("freshness", "Online presence", components.freshness),
    row("impactRecency", "IRS 990 recency", components.impactRecency),
    row("compliance", "Compliance", components.compliance),
  ];
  return rows;
}

function row(key: ComponentKey, label: string, score: number): ComponentRow {
  const weight = COMPONENT_WEIGHTS[key];
  return {
    key,
    label,
    score,
    weight,
    scoreOutOf100: Math.round(score * 100),
    contributionOutOf100: Math.round(score * weight * 100),
  };
}

/**
 * Editorial band the masthead surfaces near the composite. Avoids
 * "STRONG FIT" — the brief reads better with sentence-cased qualifiers.
 */
export function compositeBand(score: number, disqualified: boolean): string {
  if (disqualified) return "Disqualified";
  if (score >= 0.6) return "Outstanding fit";
  if (score >= 0.4) return "Strong fit";
  if (score >= 0.25) return "Promising";
  return "Marginal";
}

/**
 * One-line plain-language summary for the lead's "Why we're leading
 * with this" line. Reads as a single sentence, not three checkmarks.
 */
export function leadJustification(candidate: ResearchReportCandidate): string {
  const c = candidate.components;
  const fragments: string[] = [];

  if (c.donorMatch >= 0.65) fragments.push("close alignment with your stated cause and geography");
  else if (c.donorMatch >= 0.45) fragments.push("solid alignment with your criteria");

  if (c.freshness >= 0.7) fragments.push("recent public activity within the last month");
  else if (c.freshness >= 0.45) fragments.push("public activity in the last quarter");

  if (c.impactRecency >= 0.65) fragments.push("a recent IRS 990 on file");
  if (c.compliance >= 0.85) fragments.push("clean compliance across every check we ran");

  if (fragments.length === 0) {
    return "the highest composite among the candidates we evaluated.";
  }
  if (fragments.length === 1) return `${fragments[0]}.`;
  if (fragments.length === 2) return `${fragments[0]} and ${fragments[1]}.`;
  const last = fragments.pop();
  return `${fragments.join(", ")}, and ${last}.`;
}
