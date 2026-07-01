// Backend category ids (agent_access, machine_readability, ...) carry
// their display label and subtitle on the scorecard payload now
// (rubric category metadata flows through summarizeCategoryScores).
// The local FALLBACK_LABEL map is a degradation path for older
// scorecards still in flight that don't yet have the BE-provided
// label / subtitle, and so components can always render a readable
// name even before the API response loads.

import type { CategoryScore } from "../types";

const FALLBACK_LABEL: Record<string, string> = {
  agent_access: "Agent access",
  machine_readability: "Machine readability",
  trust_verification: "Trust and verification",
  donation_readiness: "Donation readiness",
  liveness: "Liveness",
};

export function categoryLabel(score: CategoryScore | string): string {
  if (typeof score === "string") {
    return FALLBACK_LABEL[score] ?? score.replace(/_/g, " ");
  }
  return score.label ?? FALLBACK_LABEL[score.category] ?? score.category.replace(/_/g, " ");
}

export function categorySubtitle(score: CategoryScore | string): string | null {
  if (typeof score === "string") return null;
  return score.subtitle ?? null;
}

export type ScoreBand = "strong" | "ok" | "weak" | "critical";

export function bandForScore(
  score: Pick<CategoryScore, "pointsAwarded" | "pointsPossible">
): ScoreBand {
  if (score.pointsPossible === 0) {
    return "weak";
  }
  const ratio = score.pointsAwarded / score.pointsPossible;
  if (score.pointsAwarded === 0) {
    return "critical";
  }
  if (ratio >= 0.8) {
    return "strong";
  }
  if (ratio >= 0.5) {
    return "ok";
  }
  return "weak";
}

export const GRADE_TAGLINE: Record<string, { tag: string; tone: ScoreBand }> = {
  A: { tag: "Excellent", tone: "strong" },
  B: { tag: "Competitive", tone: "strong" },
  C: { tag: "Improving", tone: "ok" },
  D: { tag: "Needs work", tone: "weak" },
  F: { tag: "At risk", tone: "critical" },
};

// Reader-friendly label per grade, single source of truth for both the
// in-app GradeHeadline component and the OG image route. Kept here so
// edits land in one place; ScanGrade is the closed union and these
// labels are part of the public rubric vocabulary.
export const GRADE_LABEL: Record<string, string> = {
  A: "AI-ready",
  B: "Mostly ready",
  C: "Partially ready",
  D: "Significant gaps",
  F: "Not AI-ready",
};

// Map a band to brand-aware Tailwind classes. Brand teal lives in the
// "strong" slot; warm amber for "ok"; orange-amber for "weak"; rose for
// critical / no-EIN gate fired. Reserve the teal accent for the gauge fill
// and pass states so it stays meaningful when it appears.
export const BAND_FG: Record<ScoreBand, string> = {
  strong: "text-brand-emphasis",
  ok: "text-amber-700",
  weak: "text-orange-700",
  critical: "text-rose-700",
};

export const BAND_BG: Record<ScoreBand, string> = {
  strong: "bg-brand",
  ok: "bg-amber-500",
  weak: "bg-orange-500",
  critical: "bg-rose-500",
};

export const BAND_TRACK: Record<ScoreBand, string> = {
  strong: "bg-brand-faint",
  ok: "bg-amber-100",
  weak: "bg-orange-100",
  critical: "bg-rose-100",
};
