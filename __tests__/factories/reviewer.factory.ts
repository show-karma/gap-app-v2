import type { ReviewerInfo } from "@/types/reviewer";
import { applyOverrides, type DeepPartial, seq } from "./utils";

// ─── Reviewer factory ───

export function createMockReviewer(overrides?: DeepPartial<ReviewerInfo>): ReviewerInfo {
  const n = seq();
  const defaults: ReviewerInfo = {
    choice: "yes",
    name: `Reviewer ${n}`,
    email: `reviewer-${n}@karma.fund`,
    categories: ["infrastructure", "defi"],
  };
  return applyOverrides(defaults, overrides);
}

// ─── Presets ───

export function approvedReviewer(overrides?: DeepPartial<ReviewerInfo>): ReviewerInfo {
  return createMockReviewer({
    choice: "yes",
    ...overrides,
  } as DeepPartial<ReviewerInfo>);
}

export function rejectedReviewer(overrides?: DeepPartial<ReviewerInfo>): ReviewerInfo {
  return createMockReviewer({
    choice: "no",
    ...overrides,
  } as DeepPartial<ReviewerInfo>);
}

export function uncategorizedReviewer(overrides?: DeepPartial<ReviewerInfo>): ReviewerInfo {
  return createMockReviewer({
    categories: [],
    ...overrides,
  } as DeepPartial<ReviewerInfo>);
}
