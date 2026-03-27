import type { AIEvaluation } from "@/types/whitelabel-entities";
import { applyOverrides, type DeepPartial, seq } from "./utils";

// ─── AI Evaluation factory ───

export function createMockEvaluation(overrides?: DeepPartial<AIEvaluation>): AIEvaluation {
  const n = seq();
  const defaults: AIEvaluation = {
    score: 7.5,
    feedback: `Application #${n} demonstrates strong technical approach with clear milestones and measurable deliverables.`,
    strengths: [
      "Well-defined project scope and milestones",
      "Experienced team with relevant track record",
      "Clear impact metrics",
    ],
    improvements: [
      "Budget breakdown could be more detailed",
      "Timeline for community engagement is unclear",
    ],
    evaluatedAt: "2024-07-15T14:30:00Z",
  };
  return applyOverrides(defaults, overrides);
}

// ─── Score presets ───

export function highScoreEvaluation(overrides?: DeepPartial<AIEvaluation>): AIEvaluation {
  return createMockEvaluation({
    score: 9.2,
    feedback:
      "Exceptional proposal with comprehensive technical design and strong ecosystem alignment.",
    strengths: [
      "Outstanding technical architecture",
      "Proven team with multiple successful grants",
      "Significant potential for ecosystem impact",
      "Detailed risk mitigation plan",
    ],
    improvements: ["Minor: Consider adding more community outreach milestones"],
    ...overrides,
  } as DeepPartial<AIEvaluation>);
}

export function lowScoreEvaluation(overrides?: DeepPartial<AIEvaluation>): AIEvaluation {
  return createMockEvaluation({
    score: 3.1,
    feedback: "Proposal lacks technical depth and has unclear deliverables.",
    strengths: ["Addresses a real ecosystem need"],
    improvements: [
      "Technical approach needs significant elaboration",
      "No clear milestones or success metrics",
      "Team experience not demonstrated",
      "Budget is unrealistic for stated scope",
    ],
    ...overrides,
  } as DeepPartial<AIEvaluation>);
}

export function minimalEvaluation(overrides?: DeepPartial<AIEvaluation>): AIEvaluation {
  return createMockEvaluation({
    score: 5.0,
    feedback: "Application meets minimum requirements.",
    strengths: undefined,
    improvements: undefined,
    ...overrides,
  } as DeepPartial<AIEvaluation>);
}
