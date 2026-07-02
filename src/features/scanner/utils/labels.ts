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

// One-line "what this grade means for a donor's agent" blurb, keyed by grade.
// Part of the public rubric vocabulary shown under the score gauge.
export const GRADE_BLURB: Record<string, string> = {
  A: "An agent can reach, understand, trust, and give — start to finish.",
  B: "An agent gets most of the way. A few gaps stand between you and a clean pass.",
  C: "An agent can find you, but stumbles on trust or the donate flow.",
  D: "An agent hits walls early. Most donors' assistants would give up.",
  F: "An agent can't complete the journey. Critical checks are failing.",
};

// Map a band to the product's semantic color tokens (never raw Tailwind
// palette). This mirrors the design's three-tier scale: brand teal for
// "strong", the app's amber `warning` for "ok", and `destructive` red for the
// failing bands ("weak" / "critical"). Reserve the teal accent for the gauge
// fill and pass states so it stays meaningful when it appears.
export const BAND_FG: Record<ScoreBand, string> = {
  strong: "text-brand-emphasis",
  ok: "text-warning-700",
  weak: "text-destructive",
  critical: "text-destructive",
};

export const BAND_BG: Record<ScoreBand, string> = {
  strong: "bg-brand",
  ok: "bg-warning-500",
  weak: "bg-destructive",
  critical: "bg-destructive",
};

export const BAND_TRACK: Record<ScoreBand, string> = {
  strong: "bg-brand-faint",
  ok: "bg-warning-50",
  weak: "bg-destructive-subtle",
  critical: "bg-destructive-subtle",
};

// SVG stroke variant of the band palette — used by the radial ScoreGauge ticks.
export const BAND_STROKE: Record<ScoreBand, string> = {
  strong: "stroke-brand",
  ok: "stroke-warning-500",
  weak: "stroke-destructive",
  critical: "stroke-destructive",
};

// Grade -> score band, so the grade badge / gauge share one color vocabulary
// with the category bars. Mirrors GRADE_TAGLINE's tones (A/B strong, C ok,
// D weak, F critical).
export function gradeBand(grade: string): ScoreBand {
  return GRADE_TAGLINE[grade]?.tone ?? "weak";
}
