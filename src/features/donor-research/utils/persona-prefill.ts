/**
 * Maps a donor persona to report-create form defaults (DEV-431, U8). Pure —
 * no React, no IO — so it is trivially unit-testable.
 *
 * Key contract notes:
 *  - `geography` is the backend's extracted place string (e.g. "Pacific
 *    Northwest"), NOT the coarse `geoRadius` enum. The radius enum carries no
 *    place names, so feeding it into the free-text Geography field surfaced a
 *    raw token like "regional" — we no longer derive geography from it.
 *  - `weights` is `persona.computedWeights` verbatim — the backend is the
 *    single source of truth for the nudge math. No client computation.
 */

import type { CompositeWeights, DonorPersona } from "@/types/donor-research";

export interface PersonaPrefill {
  /** Seeds the criteria text with the persona narrative verbatim. Absent when no narrative. */
  criteriaTextAppendix?: string;
  /** Topical cause / focus area extracted by the backend. */
  cause?: string;
  /** Real place string extracted by the backend (NOT the coarse geoRadius enum). */
  geography?: string;
  /** Real USD amounts extracted by the backend (NOT derived from the band). */
  amountMin?: number;
  amountMax?: number;
  /** The recomputed nudge weights, consumed verbatim. */
  weights: CompositeWeights;
}

/**
 * Builds the form prefill from a persona, or returns `null` when there's
 * nothing to seed: no persona, or both texts empty AND every structured chip
 * unset.
 */
export function buildPersonaPrefill(persona: DonorPersona | null): PersonaPrefill | null {
  if (!persona) return null;

  const s = persona.structured;
  const allStructuredNull =
    s.orgMaturity.value === null &&
    s.geoRadius.value === null &&
    s.faithStance.value === null &&
    s.giftSizeBand.value === null &&
    s.advocacyStance.value === null;
  const noText = !persona.sourceText && !persona.narrative;
  if (noText && allStructuredNull) return null;

  const prefill: PersonaPrefill = { weights: persona.computedWeights };

  if (persona.narrative) {
    prefill.criteriaTextAppendix = persona.narrative;
  }

  // Topical cause is taken from the backend's extracted value (when the source
  // names a clear one); never inferred client-side. Dormant until gap-indexer
  // emits it.
  if (persona.cause) prefill.cause = persona.cause;

  // Geography is the backend's extracted place string (when the source names
  // one); never derived from the coarse geoRadius enum. Dormant until
  // gap-indexer#2117 emits it.
  if (persona.geography) prefill.geography = persona.geography;

  // Amounts come from the backend's EXPLICIT extracted figures, never from the
  // coarse `giftSizeBand` enum (mapping a 3-bucket band to dollars implies a
  // precision the persona never had). Until gap-indexer#2117 ships these,
  // they're absent → amounts stay empty. `amountMax: null` (open-ended) is
  // treated as "no upper bound" → left unset so the field stays empty.
  if (typeof persona.amountMin === "number") prefill.amountMin = persona.amountMin;
  if (typeof persona.amountMax === "number") prefill.amountMax = persona.amountMax;

  return prefill;
}
