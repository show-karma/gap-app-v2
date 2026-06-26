import { describe, expect, it } from "vitest";
import type { CompositeWeights } from "@/types/donor-research";
import { DEFAULT_WEIGHTS_BASIS_POINTS } from "../report-brief/scoring";
import { isValidWeights, setWeight, weightsEqual, weightsTotal } from "./weights-allocation";

const BALANCED: CompositeWeights = DEFAULT_WEIGHTS_BASIS_POINTS; // 25/10/25/25/15

function sum(w: CompositeWeights): number {
  return weightsTotal(w);
}

describe("weights-allocation validation", () => {
  it("is valid only when the five sum to exactly 10000", () => {
    expect(isValidWeights(BALANCED)).toBe(true);
    expect(isValidWeights({ ...BALANCED, compliance: BALANCED.compliance - 100 })).toBe(false);
  });

  it("compares weight sets across every dimension", () => {
    expect(weightsEqual(BALANCED, { ...BALANCED })).toBe(true);
    expect(weightsEqual(BALANCED, { ...BALANCED, donorMatch: 1 })).toBe(false);
  });
});

describe("setWeight", () => {
  it("sets only the named factor and leaves the others untouched", () => {
    const next = setWeight(BALANCED, "onlinePresence", 40);
    expect(next.onlinePresence).toBe(4000);
    // Nothing redistributes — the total shifts by the delta.
    expect(next.socialPresence).toBe(BALANCED.socialPresence);
    expect(next.impactRecency).toBe(BALANCED.impactRecency);
    expect(next.donorMatch).toBe(BALANCED.donorMatch);
    expect(next.compliance).toBe(BALANCED.compliance);
    expect(sum(next)).toBe(10000 - BALANCED.onlinePresence + 4000);
  });

  it("rounds to whole percent and clamps to 0–100", () => {
    expect(setWeight(BALANCED, "onlinePresence", 33.4).onlinePresence).toBe(3300);
    expect(setWeight(BALANCED, "onlinePresence", -5).onlinePresence).toBe(0);
    expect(setWeight(BALANCED, "onlinePresence", 150).onlinePresence).toBe(10000);
  });

  it("can land the total back on exactly 100%", () => {
    // Drop online 25→10 leaving 85%, then a +15% elsewhere balances it.
    const dropped = setWeight(BALANCED, "onlinePresence", 10);
    expect(isValidWeights(dropped)).toBe(false);
    const balanced = setWeight(dropped, "socialPresence", 25);
    expect(sum(balanced)).toBe(10000);
    expect(isValidWeights(balanced)).toBe(true);
  });
});
