import type { CompositeWeights } from "@/types/donor-research";

/**
 * Sum-to-10000 redistribution for the DEV-418 weights sliders (U6).
 *
 * Pure, framework-free, and exhaustively unit-tested so the slider UI can
 * stay dumb. When the advisor drags one dimension to `nextValueBasisPoints`,
 * the other four absorb the difference proportionally to their current
 * values, every dimension stays at or above a 1-basis-point floor (so a
 * dimension is never silently dropped to 0%), and the five always sum to
 * exactly 10000 — any rounding drift is folded into the largest sibling.
 */

export type WeightDimension = keyof CompositeWeights;

export const WEIGHT_DIMENSIONS: readonly WeightDimension[] = [
  "onlinePresence",
  "socialPresence",
  "impactRecency",
  "donorMatch",
  "compliance",
];

export const WEIGHTS_TOTAL_BASIS_POINTS = 10000;

/** Each dimension keeps at least this, so it never disappears from the mix. */
export const MIN_DIMENSION_BASIS_POINTS = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Recompute all five weights after `changed` is dragged toward
 * `nextValueBasisPoints`. The returned object always sums to exactly 10000
 * with every value >= {@link MIN_DIMENSION_BASIS_POINTS}.
 */
export function rebalanceWeights(
  current: CompositeWeights,
  changed: WeightDimension,
  nextValueBasisPoints: number
): CompositeWeights {
  const others = WEIGHT_DIMENSIONS.filter((d) => d !== changed);

  // Cap the dragged dimension so the other four can each keep the floor.
  const maxForChanged = WEIGHTS_TOTAL_BASIS_POINTS - others.length * MIN_DIMENSION_BASIS_POINTS;
  const next = clamp(Math.round(nextValueBasisPoints), MIN_DIMENSION_BASIS_POINTS, maxForChanged);

  const target = WEIGHTS_TOTAL_BASIS_POINTS - next;
  const distributed = distributeProportional(others, current, target);

  return {
    onlinePresence: changed === "onlinePresence" ? next : distributed.onlinePresence,
    socialPresence: changed === "socialPresence" ? next : distributed.socialPresence,
    impactRecency: changed === "impactRecency" ? next : distributed.impactRecency,
    donorMatch: changed === "donorMatch" ? next : distributed.donorMatch,
    compliance: changed === "compliance" ? next : distributed.compliance,
  };
}

/**
 * Split `target` basis points across `others` proportionally to their
 * current values, with a per-dimension floor and exact-sum guarantee. The
 * floor is reserved up front; the remaining pool is shared proportionally,
 * and integer drift is handed to the largest current dimensions first.
 */
function distributeProportional(
  others: readonly WeightDimension[],
  current: CompositeWeights,
  target: number
): Record<WeightDimension, number> {
  const floor = MIN_DIMENSION_BASIS_POINTS;
  const pool = target - others.length * floor; // >= 0: caller clamped `next`
  const currentSum = others.reduce((sum, d) => sum + current[d], 0);

  const alloc = others.map((d) =>
    currentSum > 0 ? Math.floor((current[d] / currentSum) * pool) : Math.floor(pool / others.length)
  );

  // Hand integer drift to the dimensions with the largest current value, so
  // redistribution feels proportional rather than biased to array order.
  let drift = pool - alloc.reduce((sum, a) => sum + a, 0);
  const byLargest = others
    .map((d, i) => ({ i, value: current[d] }))
    .sort((a, b) => b.value - a.value || a.i - b.i);
  let cursor = 0;
  while (drift > 0) {
    alloc[byLargest[cursor % byLargest.length].i] += 1;
    drift -= 1;
    cursor += 1;
  }

  const result = {} as Record<WeightDimension, number>;
  others.forEach((d, i) => {
    result[d] = floor + alloc[i];
  });
  return result;
}

/** True when the five weights are each >= the floor and sum to exactly 10000. */
export function isValidWeights(weights: CompositeWeights): boolean {
  const values = WEIGHT_DIMENSIONS.map((d) => weights[d]);
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum === WEIGHTS_TOTAL_BASIS_POINTS && values.every((v) => v >= MIN_DIMENSION_BASIS_POINTS);
}
