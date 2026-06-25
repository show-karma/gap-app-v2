import type { CompositeWeights } from "@/types/donor-research";

/**
 * Weights model for the DEV-418 scoring allocator (U6).
 *
 * Lock & redistribute: each factor is a weight in basis points (0–10000) and
 * the five always sum to 100%. The advisor can LOCK the factors they're happy
 * with — their percentage is frozen — and moving an unlocked slider (or editing
 * its number) only redistributes the difference across the OTHER UNLOCKED
 * factors, proportionally to their current values. The total therefore stays at
 * exactly 100% by construction, so the advisor never has to hit a target by
 * hand. Whole-percent granularity keeps the numbers clean.
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

function toBasisPoints(percents: Record<WeightDimension, number>): CompositeWeights {
  return {
    onlinePresence: percents.onlinePresence * 100,
    socialPresence: percents.socialPresence * 100,
    impactRecency: percents.impactRecency * 100,
    donorMatch: percents.donorMatch * 100,
    compliance: percents.compliance * 100,
  };
}

/**
 * Set `changed` to `requestedPercent` and redistribute the remainder across the
 * other UNLOCKED factors (proportionally to their current values), leaving
 * locked factors untouched. The result is whole percentages summing to exactly
 * 100, returned as basis points.
 *
 * `requestedPercent` is clamped to what's available after the locked factors,
 * so a slider dragged past the ceiling simply pins at the ceiling. When no
 * other factor is unlocked, `changed` absorbs everything that isn't locked.
 */
export function redistributeWeights(
  weights: CompositeWeights,
  locked: ReadonlySet<WeightDimension>,
  changed: WeightDimension,
  requestedPercent: number
): CompositeWeights {
  const pct = (d: WeightDimension) => weightPercent(weights, d);
  const result = {} as Record<WeightDimension, number>;

  const lockedDims = WEIGHT_DIMENSIONS.filter((d) => d !== changed && locked.has(d));
  for (const d of lockedDims) result[d] = pct(d);
  const lockedSum = lockedDims.reduce((sum, d) => sum + result[d], 0);
  const available = TOTAL_PERCENT - lockedSum;

  const others = WEIGHT_DIMENSIONS.filter((d) => d !== changed && !locked.has(d));
  if (others.length === 0) {
    result[changed] = Math.max(0, available);
    return toBasisPoints(result);
  }

  const next = clamp(Math.round(requestedPercent), 0, available);
  result[changed] = next;

  const remaining = available - next;
  const othersSum = others.reduce((sum, d) => sum + pct(d), 0);
  const exact = others.map((d) => ({
    d,
    e: othersSum > 0 ? (pct(d) / othersSum) * remaining : remaining / others.length,
  }));
  for (const o of exact) result[o.d] = Math.floor(o.e);
  let drift = remaining - exact.reduce((sum, o) => sum + Math.floor(o.e), 0);
  const byRemainder = [...exact].sort((a, b) => b.e - Math.floor(b.e) - (a.e - Math.floor(a.e)));
  for (let i = 0; drift > 0; i++, drift--) result[byRemainder[i % byRemainder.length].d] += 1;

  return toBasisPoints(result);
}
