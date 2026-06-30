/**
 * Frontend mirror of the backend donor-persona enum vocabularies (DEV-431,
 * U6). Kept in lockstep with the gap-indexer domain enums so the chip option
 * lists and human labels live in one place. The value arrays double as the
 * source of truth for `<Select>` options; the label maps drive display text.
 *
 * Every chip additionally offers a "clear" option whose value is `null`,
 * rendered with {@link PERSONA_NULL_LABEL}.
 */

import type {
  AdvocacyStance,
  FaithStance,
  GeoRadius,
  GiftSizeBand,
  OrgMaturity,
  PersonaStructured,
} from "@/types/donor-research";

const ORG_MATURITY_VALUES: readonly OrgMaturity[] = ["upcoming", "established", "mixed"];
const GEO_RADIUS_VALUES: readonly GeoRadius[] = ["local", "regional", "national"];
const FAITH_STANCE_VALUES: readonly FaithStance[] = ["secular", "faith_based", "agnostic"];
const GIFT_SIZE_BAND_VALUES: readonly GiftSizeBand[] = [
  "small_high_leverage",
  "mid",
  "large_institutional",
];
const ADVOCACY_STANCE_VALUES: readonly AdvocacyStance[] = ["funds_advocacy", "avoids_advocacy"];

/** Label shown for a chip with no value (`value: null`). */
export const PERSONA_NULL_LABEL = "Not specified";

const ORG_MATURITY_LABELS: Record<OrgMaturity, string> = {
  upcoming: "Upcoming / emerging",
  established: "Established",
  mixed: "Mixed",
};

const GEO_RADIUS_LABELS: Record<GeoRadius, string> = {
  local: "Local",
  regional: "Regional",
  national: "National",
};

const FAITH_STANCE_LABELS: Record<FaithStance, string> = {
  secular: "Secular",
  faith_based: "Faith-based",
  agnostic: "No preference",
};

const GIFT_SIZE_BAND_LABELS: Record<GiftSizeBand, string> = {
  small_high_leverage: "Small / high-leverage",
  mid: "Mid-size",
  large_institutional: "Large / institutional",
};

const ADVOCACY_STANCE_LABELS: Record<AdvocacyStance, string> = {
  funds_advocacy: "Funds advocacy",
  avoids_advocacy: "Avoids advocacy",
};

/** The five structured-chip keys, in display order. */
export type PersonaChipKey = keyof PersonaStructured;

/**
 * Descriptor per chip — drives the five `<Select>`s in `PersonaStructuredChips`
 * (U7) from a single declarative source: the field key, its `<label>` text,
 * the allowed enum values, and the value→label map.
 */
export interface PersonaChipDescriptor {
  key: PersonaChipKey;
  label: string;
  values: readonly string[];
  labels: Record<string, string>;
}

export const PERSONA_CHIP_FIELDS: readonly PersonaChipDescriptor[] = [
  {
    key: "orgMaturity",
    label: "Org maturity",
    values: ORG_MATURITY_VALUES,
    labels: ORG_MATURITY_LABELS,
  },
  {
    key: "geoRadius",
    label: "Geographic radius",
    values: GEO_RADIUS_VALUES,
    labels: GEO_RADIUS_LABELS,
  },
  {
    key: "faithStance",
    label: "Faith stance",
    values: FAITH_STANCE_VALUES,
    labels: FAITH_STANCE_LABELS,
  },
  {
    key: "giftSizeBand",
    label: "Gift size band",
    values: GIFT_SIZE_BAND_VALUES,
    labels: GIFT_SIZE_BAND_LABELS,
  },
  {
    key: "advocacyStance",
    label: "Advocacy stance",
    values: ADVOCACY_STANCE_VALUES,
    labels: ADVOCACY_STANCE_LABELS,
  },
];

/** Human label for a chip value, falling back to {@link PERSONA_NULL_LABEL} when null. */
export function personaChipLabel(descriptor: PersonaChipDescriptor, value: string | null): string {
  if (value === null) return PERSONA_NULL_LABEL;
  return descriptor.labels[value] ?? value;
}
