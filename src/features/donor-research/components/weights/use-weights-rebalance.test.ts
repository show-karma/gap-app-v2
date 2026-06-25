import { describe, expect, it } from "vitest";
import type { CompositeWeights } from "@/types/donor-research";
import { DEFAULT_WEIGHTS_BASIS_POINTS } from "../report-brief/scoring";
import {
  isValidWeights,
  MIN_DIMENSION_BASIS_POINTS,
  rebalanceWeights,
  WEIGHT_DIMENSIONS,
  WEIGHTS_TOTAL_BASIS_POINTS,
} from "./use-weights-rebalance";

function sum(w: CompositeWeights): number {
  return WEIGHT_DIMENSIONS.reduce((acc, d) => acc + w[d], 0);
}

describe("rebalanceWeights", () => {
  it("keeps the sum at exactly 10000 when a dimension is increased", () => {
    const next = rebalanceWeights(DEFAULT_WEIGHTS_BASIS_POINTS, "donorMatch", 3500);
    expect(next.donorMatch).toBe(3500);
    expect(sum(next)).toBe(WEIGHTS_TOTAL_BASIS_POINTS);
    expect(isValidWeights(next)).toBe(true);
  });

  it("keeps the sum at exactly 10000 when a dimension is decreased", () => {
    const next = rebalanceWeights(DEFAULT_WEIGHTS_BASIS_POINTS, "onlinePresence", 1000);
    expect(next.onlinePresence).toBe(1000);
    expect(sum(next)).toBe(WEIGHTS_TOTAL_BASIS_POINTS);
  });

  it("absorbs the change proportionally across the other dimensions", () => {
    // Start from an even-ish split so proportionality is observable.
    const even: CompositeWeights = {
      onlinePresence: 2000,
      socialPresence: 2000,
      impactRecency: 2000,
      donorMatch: 2000,
      compliance: 2000,
    };
    const next = rebalanceWeights(even, "onlinePresence", 4000);
    // The remaining 6000 splits evenly across four equal dimensions => 1500 each.
    expect(next.socialPresence).toBe(1500);
    expect(next.impactRecency).toBe(1500);
    expect(next.donorMatch).toBe(1500);
    expect(next.compliance).toBe(1500);
    expect(sum(next)).toBe(WEIGHTS_TOTAL_BASIS_POINTS);
  });

  it("clamps a dimension dragged toward 0 at the 1-bp floor", () => {
    const next = rebalanceWeights(DEFAULT_WEIGHTS_BASIS_POINTS, "compliance", 0);
    expect(next.compliance).toBe(MIN_DIMENSION_BASIS_POINTS);
    expect(sum(next)).toBe(WEIGHTS_TOTAL_BASIS_POINTS);
  });

  it("caps a dimension dragged toward 10000 so the others keep the floor", () => {
    const next = rebalanceWeights(DEFAULT_WEIGHTS_BASIS_POINTS, "donorMatch", 10000);
    // Four other dimensions must each retain at least 1 bp.
    expect(next.donorMatch).toBe(WEIGHTS_TOTAL_BASIS_POINTS - 4 * MIN_DIMENSION_BASIS_POINTS);
    WEIGHT_DIMENSIONS.filter((d) => d !== "donorMatch").forEach((d) => {
      expect(next[d]).toBe(MIN_DIMENSION_BASIS_POINTS);
    });
    expect(sum(next)).toBe(WEIGHTS_TOTAL_BASIS_POINTS);
  });

  it("never produces a sum other than 10000 across many drag positions (property)", () => {
    let weights = DEFAULT_WEIGHTS_BASIS_POINTS;
    for (let value = 0; value <= 10000; value += 137) {
      const dimension = WEIGHT_DIMENSIONS[value % WEIGHT_DIMENSIONS.length];
      weights = rebalanceWeights(weights, dimension, value);
      expect(sum(weights)).toBe(WEIGHTS_TOTAL_BASIS_POINTS);
      expect(isValidWeights(weights)).toBe(true);
    }
  });

  it("distributes evenly when the other dimensions are all at the floor", () => {
    const collapsed: CompositeWeights = {
      onlinePresence: 9996,
      socialPresence: 1,
      impactRecency: 1,
      donorMatch: 1,
      compliance: 1,
    };
    const next = rebalanceWeights(collapsed, "onlinePresence", 9000);
    expect(next.onlinePresence).toBe(9000);
    expect(sum(next)).toBe(WEIGHTS_TOTAL_BASIS_POINTS);
    expect(isValidWeights(next)).toBe(true);
  });
});
