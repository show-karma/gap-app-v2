/**
 * Maps a donor persona to report-create form defaults (DEV-431, U8). Pure —
 * no React, no IO — so it is trivially unit-testable.
 *
 * Key contract notes:
 *  - `geography` uses the backend resolver's enum vocabulary
 *    (`city|metro|regional|state|national`), NOT the raw persona `geoRadius`.
 *    Persona never carries a city name, so `local → "metro"`.
 *  - `weights` is `persona.computedWeights` verbatim — the backend is the
 *    single source of truth for the nudge math. No client computation.
 */

import type { CompositeWeights, DonorPersona, GeoRadius } from "@/types/donor-research";

/** Radius vocabulary understood by the backend `LLMGeographyResolver`. */
export type ResolverGeography = "city" | "metro" | "regional" | "state" | "national";

export interface PersonaPrefill {
  /** Seeds the criteria text with the persona narrative verbatim. Absent when no narrative. */
  criteriaTextAppendix?: string;
  geography?: ResolverGeography;
  /** Real USD amounts extracted by the backend (NOT derived from the band). */
  amountMin?: number;
  amountMax?: number;
  /** The recomputed nudge weights, consumed verbatim. */
  weights: CompositeWeights;
}

function geographyFromRadius(radius: GeoRadius | null): ResolverGeography | undefined {
  switch (radius) {
    // Persona carries no specific city name, so "local" resolves to metro.
    case "local":
      return "metro";
    case "regional":
      return "regional";
    case "national":
      return "national";
    default:
      return undefined;
  }
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

  const geography = geographyFromRadius(s.geoRadius.value);
  if (geography) prefill.geography = geography;

  // Amounts come from the backend's EXPLICIT extracted figures, never from the
  // coarse `giftSizeBand` enum (mapping a 3-bucket band to dollars implies a
  // precision the persona never had). Until gap-indexer#2117 ships these,
  // they're absent → amounts stay empty. `amountMax: null` (open-ended) is
  // treated as "no upper bound" → left unset so the field stays empty.
  if (typeof persona.amountMin === "number") prefill.amountMin = persona.amountMin;
  if (typeof persona.amountMax === "number") prefill.amountMax = persona.amountMax;

  return prefill;
}
