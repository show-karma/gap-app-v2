import { describe, expect, it } from "vitest";
import type { CompositeWeights } from "@/types/donor-research";
import { DEFAULT_WEIGHTS_BASIS_POINTS } from "../report-brief/scoring";
import {
  isValidWeights,
  redistributeWeights,
  WEIGHT_DIMENSIONS,
  type WeightDimension,
  weightsEqual,
  weightsTotal,
} from "./weights-allocation";

const BALANCED: CompositeWeights = DEFAULT_WEIGHTS_BASIS_POINTS; // 25/10/25/25/15
const NONE = new Set<WeightDimension>();

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

describe("redistributeWeights", () => {
  it("redistributes the remainder across the other unlocked factors, total stays 100%", () => {
    const next = redistributeWeights(BALANCED, NONE, "onlinePresence", 40);
    expect(next.onlinePresence).toBe(4000);
    expect(sum(next)).toBe(10000);
    // The other four absorbed the −15% proportionally (10/25/25/15 of the 60 left).
    expect(next.socialPresence).toBe(800);
    expect(next.impactRecency).toBe(2000);
    expect(next.donorMatch).toBe(2000);
    expect(next.compliance).toBe(1200);
  });

  it("never touches a locked factor", () => {
    const locked = new Set<WeightDimension>(["compliance"]);
    const next = redistributeWeights(BALANCED, locked, "onlinePresence", 40);
    expect(next.compliance).toBe(1500); // frozen
    expect(next.onlinePresence).toBe(4000);
    expect(sum(next)).toBe(10000);
  });

  it("clamps the request to what's available after locked factors", () => {
    const locked = new Set<WeightDimension>(["impactRecency", "donorMatch", "compliance"]);
    // 65% locked → only 35% available; asking for 50% pins at 35%.
    const next = redistributeWeights(BALANCED, locked, "onlinePresence", 50);
    expect(next.onlinePresence).toBe(3500);
    expect(next.socialPresence).toBe(0);
    expect(sum(next)).toBe(10000);
  });

  it("forces the value when it is the only unlocked factor (dead end)", () => {
    const locked = new Set<WeightDimension>([
      "socialPresence",
      "impactRecency",
      "donorMatch",
      "compliance",
    ]);
    const next = redistributeWeights(BALANCED, locked, "onlinePresence", 80);
    // 10+25+25+15 locked = 75 → online must be the remaining 25%.
    expect(next.onlinePresence).toBe(2500);
    expect(sum(next)).toBe(10000);
  });

  it("stays summed to 100% across many independent moves", () => {
    let w: CompositeWeights = { ...BALANCED };
    for (let p = 0; p <= 100; p += 13) {
      const dim = WEIGHT_DIMENSIONS[p % WEIGHT_DIMENSIONS.length];
      w = redistributeWeights(w, NONE, dim, p);
      expect(sum(w)).toBe(10000);
      expect(isValidWeights(w)).toBe(true);
    }
  });
});
