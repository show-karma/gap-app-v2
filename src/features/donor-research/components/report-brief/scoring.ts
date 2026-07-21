import type { CompositeWeights, ResearchReportCandidate } from "@/types/donor-research";

/**
 * Shipped default weight distribution (DEV-418 R4), as basis points summing
 * to 10000. Mirrors the backend `DEFAULT_COMPOSITE_WEIGHTS_BASIS_POINTS`.
 * Pre-fills the create-form sliders. The values are intentionally duplicated
 * (not imported from the API) so the form renders before any report exists.
 */
export const DEFAULT_WEIGHTS_BASIS_POINTS: CompositeWeights = {
  onlinePresence: 2500,
  socialPresence: 1000,
  impactRecency: 2500,
  donorMatch: 2500,
  compliance: 1500,
};

/**
 * Legacy four-dimension weights (decimals), used ONLY to render legacy
 * reports (`report.weights === null`) where `freshness` was the combined
 * website+social recency. Methodology and the per-candidate breakdown fall
 * back to these when no persisted weights exist. Not exported as the
 * source-of-truth weights — new reports always carry their own.
 */
const LEGACY_FRESHNESS_WEIGHT = 0.35;
const LEGACY_WEIGHTS = {
  onlinePresence: LEGACY_FRESHNESS_WEIGHT,
  impactRecency: 0.25,
  donorMatch: 0.25,
  compliance: 0.15,
} as const;

const BASIS_POINTS_TOTAL = 10000;

export interface CompositeWeightsDecimals {
  onlinePresence: number;
  socialPresence: number;
  impactRecency: number;
  donorMatch: number;
  compliance: number;
}

/** Convert persisted basis-points weights to the `[0, 1]` decimals the math uses. */
export function weightsToDecimals(weights: CompositeWeights): CompositeWeightsDecimals {
  return {
    onlinePresence: weights.onlinePresence / BASIS_POINTS_TOTAL,
    socialPresence: weights.socialPresence / BASIS_POINTS_TOTAL,
    impactRecency: weights.impactRecency / BASIS_POINTS_TOTAL,
    donorMatch: weights.donorMatch / BASIS_POINTS_TOTAL,
    compliance: weights.compliance / BASIS_POINTS_TOTAL,
  };
}

/**
 * The weights (as decimals) actually used to score a report: the persisted
 * advisor weights on a DEV-418 report, or the fixed legacy distribution when
 * `weights` is null. Legacy reports have no social axis, so `socialPresence`
 * is 0 — callers gate the social row on `weights !== null`, not on this.
 */
export function resolvedWeightsDecimals(
  weights: CompositeWeights | null
): CompositeWeightsDecimals {
  if (weights) return weightsToDecimals(weights);
  return {
    onlinePresence: LEGACY_WEIGHTS.onlinePresence,
    socialPresence: 0,
    impactRecency: LEGACY_WEIGHTS.impactRecency,
    donorMatch: LEGACY_WEIGHTS.donorMatch,
    compliance: LEGACY_WEIGHTS.compliance,
  };
}

/**
 * Website-activity component for a candidate. New reports carry
 * `onlinePresence`; legacy reports carry the bundled `freshness`. Reading
 * through this helper lets every "online presence" consumer treat both
 * report shapes uniformly without branching on `report.weights`.
 */
export function onlinePresenceScore(candidate: ResearchReportCandidate): number {
  const { onlinePresence, freshness } = candidate.components;
  return onlinePresence ?? freshness ?? 0;
}

/** Social-activity component. Absent (legacy) or unscored => 0, matching the backend. */
export function socialPresenceScore(candidate: ResearchReportCandidate): number {
  return candidate.components.socialPresence ?? 0;
}

/**
 * Pure weighted-sum of the five-dimension components, rounded to 3 decimals.
 *
 * Byte-equivalent to the backend `compositeFromComponents` so the in-browser
 * live preview and the post-commit server state agree. A missing
 * `onlinePresence`/`socialPresence`/`freshness` contributes 0.
 */
export function compositeFromComponents(
  components: ResearchReportCandidate["components"],
  weights: CompositeWeightsDecimals
): number {
  const weightedSum =
    (components.onlinePresence ?? components.freshness ?? 0) * weights.onlinePresence +
    (components.socialPresence ?? 0) * weights.socialPresence +
    components.impactRecency * weights.impactRecency +
    components.donorMatch * weights.donorMatch +
    components.compliance * weights.compliance;
  return Math.round(weightedSum * 1000) / 1000;
}

/** Default featured-set size when a report has no explicit `topCount`. */
export const DEFAULT_TOP_COUNT = 3;

export interface RankedCandidate {
  candidate: ResearchReportCandidate;
  /** Composite recomputed under the previewed weights, rounded to 3 decimals. */
  composite: number;
  /** True for the first `topCount` after the deterministic sort (featured set). */
  featuredFlag: boolean;
  /** 1-based position in the recomputed order. */
  rank: number;
}

/**
 * Re-rank candidates under previewed weights, entirely in the browser
 * (DEV-418 R11). Mirrors the backend `rankByWeights` + flip-set ordering:
 * composite desc, then EIN asc (nulls last), then funding-organization-id
 * asc; the first `topCount` form the featured set (the ones with a one-pager).
 * No backend round-trip — used by the live preview before the advisor commits.
 */
export function recompute(
  candidates: readonly ResearchReportCandidate[],
  weights: CompositeWeights,
  topCount: number = DEFAULT_TOP_COUNT
): RankedCandidate[] {
  const decimals = weightsToDecimals(weights);
  const scored = candidates.map((candidate) => ({
    candidate,
    composite: compositeFromComponents(candidate.components, decimals),
  }));

  scored.sort((a, b) => {
    if (a.composite !== b.composite) return b.composite - a.composite;
    const einDelta = compareNullableString(a.candidate.ein, b.candidate.ein);
    if (einDelta !== 0) return einDelta;
    return compareString(
      a.candidate.fundingOrganizationId ?? "",
      b.candidate.fundingOrganizationId ?? ""
    );
  });

  return scored.map((entry, index) => ({
    candidate: entry.candidate,
    composite: entry.composite,
    featuredFlag: index < topCount,
    rank: index + 1,
  }));
}

function compareNullableString(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return compareString(a, b);
}

function compareString(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export type ComponentKey =
  | "onlinePresence"
  | "socialPresence"
  | "impactRecency"
  | "donorMatch"
  | "compliance";

export interface ComponentRow {
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

/**
 * The per-component weighted breakdown ("How the score adds up"). When
 * `weights` is present the report is a DEV-418 five-dimension report and we
 * render five rows; when `null` the report is legacy four-dimension and we
 * fall back to the bundled `freshness` value and the fixed legacy weights.
 */
export function componentRows(
  candidate: ResearchReportCandidate,
  weights: CompositeWeights | null
): readonly ComponentRow[] {
  const { components } = candidate;

  if (weights === null) {
    return [
      row("donorMatch", "Mission match", components.donorMatch, LEGACY_WEIGHTS.donorMatch),
      row(
        "onlinePresence",
        "Online presence",
        onlinePresenceScore(candidate),
        LEGACY_WEIGHTS.onlinePresence
      ),
      row(
        "impactRecency",
        "IRS 990 recency",
        components.impactRecency,
        LEGACY_WEIGHTS.impactRecency
      ),
      row("compliance", "Compliance", components.compliance, LEGACY_WEIGHTS.compliance),
    ];
  }

  const decimals = weightsToDecimals(weights);
  return [
    row(
      "onlinePresence",
      "Online presence",
      onlinePresenceScore(candidate),
      decimals.onlinePresence
    ),
    row(
      "socialPresence",
      "Social presence",
      socialPresenceScore(candidate),
      decimals.socialPresence
    ),
    row("impactRecency", "IRS 990 recency", components.impactRecency, decimals.impactRecency),
    row("donorMatch", "Mission match", components.donorMatch, decimals.donorMatch),
    row("compliance", "Compliance", components.compliance, decimals.compliance),
  ];
}

function row(key: ComponentKey, label: string, score: number, weight: number): ComponentRow {
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
 * Methodology colophon rows: dimension label + weight percentage only (no
 * per-candidate score). Five rows for a DEV-418 report, the legacy four when
 * `weights` is null. Order matches requirement R16.
 */
export interface MethodologyWeightRow {
  label: string;
  /** 0..100 integer percentage shown in the colophon. */
  percent: number;
}

export function methodologyWeightRows(weights: CompositeWeights | null): MethodologyWeightRow[] {
  if (weights === null) {
    return [
      { label: "Online presence", percent: Math.round(LEGACY_WEIGHTS.onlinePresence * 100) },
      { label: "IRS 990 recency", percent: Math.round(LEGACY_WEIGHTS.impactRecency * 100) },
      { label: "Mission match", percent: Math.round(LEGACY_WEIGHTS.donorMatch * 100) },
      { label: "Compliance", percent: Math.round(LEGACY_WEIGHTS.compliance * 100) },
    ];
  }
  return [
    { label: "Online presence", percent: basisPointsToPercent(weights.onlinePresence) },
    { label: "Social presence", percent: basisPointsToPercent(weights.socialPresence) },
    { label: "IRS 990 recency", percent: basisPointsToPercent(weights.impactRecency) },
    { label: "Mission match", percent: basisPointsToPercent(weights.donorMatch) },
    { label: "Compliance", percent: basisPointsToPercent(weights.compliance) },
  ];
}

/** Basis points (0–10000) to a whole-number percentage (0–100). */
export function basisPointsToPercent(basisPoints: number): number {
  return Math.round(basisPoints / 100);
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
  const online = onlinePresenceScore(candidate);
  const fragments: string[] = [];

  if (c.donorMatch >= 0.65) fragments.push("close alignment with your stated cause and geography");
  else if (c.donorMatch >= 0.45) fragments.push("solid alignment with your criteria");

  if (online >= 0.7) fragments.push("recent public activity within the last month");
  else if (online >= 0.45) fragments.push("public activity in the last quarter");

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
