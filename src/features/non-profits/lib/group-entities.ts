/**
 * Group ranked entities by type for display.
 *
 * The agent can return foundations, nonprofits, and grants in a single result
 * set. Rendered as one flat list they are easy to confuse — users reported not
 * being able to tell "which table was funders and which was grant recipients".
 * Grouping them under labeled, role-annotated headers removes that ambiguity.
 */

import type { PhilanthropyEntityType, RankedEntity } from "../types/philanthropy";

export interface EntityGroup {
  type: PhilanthropyEntityType;
  /** Singular noun for the group; pluralize at render time with the count. */
  label: string;
  /** Short plain-language role so the user knows what the group represents. */
  role: string;
  entities: RankedEntity[];
}

// Display order + copy. Order is funders first (foundations), then the
// organizations they support, then individual grant records.
const GROUP_META: ReadonlyArray<{
  type: PhilanthropyEntityType;
  label: string;
  role: string;
}> = [
  { type: "foundation", label: "Foundation", role: "Potential funders" },
  { type: "nonprofit", label: "Nonprofit", role: "Grant recipients & peers" },
  { type: "grant", label: "Grant", role: "Example awards" },
];

/**
 * Returns entities split into ordered, non-empty groups. Order within each
 * group is preserved from the input (the agent's ranking).
 */
export function groupEntitiesByType(entities: readonly RankedEntity[]): EntityGroup[] {
  const groups: EntityGroup[] = [];
  for (const meta of GROUP_META) {
    const matching = entities.filter((e) => e.entityType === meta.type);
    if (matching.length === 0) continue;
    groups.push({ type: meta.type, label: meta.label, role: meta.role, entities: matching });
  }
  return groups;
}
