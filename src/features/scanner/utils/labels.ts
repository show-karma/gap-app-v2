// Backend category ids (agent_access, machine_readability, ...) are routed
// through this map to the display label and the one-line summary the brain-
// storm's R12 promised but the backend doesn't yet emit. When the backend
// starts shipping summaries, swap in scorecard.summary?? CATEGORY_SUBTITLE[id].

import type { CategoryScore } from "../types";

export const CATEGORY_DISPLAY: Record<string, { label: string; subtitle: string }> = {
  agent_access: {
    label: "Agent access",
    subtitle: "Can a machine reach the content at all",
  },
  machine_readability: {
    label: "Machine readability",
    subtitle: "Can it extract clean, structured facts",
  },
  trust_verification: {
    label: "Trust and verification",
    subtitle: "Can a donor advisor confirm legitimacy",
  },
  donation_readiness: {
    label: "Donation readiness",
    subtitle: "Can an agent actually give, including via DAF",
  },
  liveness: {
    label: "Liveness",
    subtitle: "Is the org demonstrably active",
  },
};

export function categoryLabel(id: string): string {
  return CATEGORY_DISPLAY[id]?.label ?? id.replace(/_/g, " ");
}

export function categorySubtitle(id: string): string | null {
  return CATEGORY_DISPLAY[id]?.subtitle ?? null;
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
