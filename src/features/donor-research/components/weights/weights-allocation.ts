import type { CompositeWeights } from "@/types/donor-research";

/**
 * Weights model for the DEV-418 scoring allocator (U6).
 *
 * Free allocation: each factor is a weight in basis points (0–10000) and the
 * five must sum to 100% before the advisor can commit. Moving a slider — or
 * typing a percentage — sets ONLY that factor; nothing is redistributed. The
 * advisor brings the running total back to 100% themselves (the UI shows it and
 * `isValidWeights` gates the commit), which keeps a small ±2% nudge from
 * skidding the other factors around. Whole-percent granularity keeps the
 * numbers clean.
 *
 * Pure and framework-free so the slider UI can stay dumb.
 */

export type WeightDimension = keyof CompositeWeights;

export const WEIGHT_DIMENSIONS: readonly WeightDimension[] = [
  "onlinePresence",
  "socialPresence",
  "impactRecency",
  "donorMatch",
  "compliance",
];

/** The five weights always sum to exactly this (100%). */
export const WEIGHTS_TOTAL_BASIS_POINTS = 10000;
const TOTAL_PERCENT = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Sum of all five weights, in basis points. */
export function weightsTotal(weights: CompositeWeights): number {
  return WEIGHT_DIMENSIONS.reduce((acc, d) => acc + weights[d], 0);
}

/** True when every weight is a non-negative integer and the five sum to 100%. */
export function isValidWeights(weights: CompositeWeights): boolean {
  return (
    WEIGHT_DIMENSIONS.every((d) => Number.isInteger(weights[d]) && weights[d] >= 0) &&
    weightsTotal(weights) === WEIGHTS_TOTAL_BASIS_POINTS
  );
}

/** True when two weight sets are identical across every dimension. */
export function weightsEqual(a: CompositeWeights, b: CompositeWeights): boolean {
  return WEIGHT_DIMENSIONS.every((d) => a[d] === b[d]);
}

/** Whole-number percentage (0–100) for a dimension's basis-point weight. */
export function weightPercent(weights: CompositeWeights, dimension: WeightDimension): number {
  return Math.round(weights[dimension] / 100);
}

/**
 * Set a single dimension to `requestedPercent` (whole percent, clamped 0–100)
 * and leave every other weight untouched. Nothing is redistributed — the five
 * no longer self-balance, so the advisor reconciles the running total to 100%
 * themselves and `isValidWeights` gates the commit. Returned as basis points.
 */
export function setWeight(
  weights: CompositeWeights,
  dimension: WeightDimension,
  requestedPercent: number
): CompositeWeights {
  return {
    ...weights,
    [dimension]: clamp(Math.round(requestedPercent), 0, TOTAL_PERCENT) * 100,
  };
}
