import { describe, expect, it } from "vitest";
import { groupEntitiesByType } from "../lib/group-entities";
import type { PhilanthropyEntityType, RankedEntity } from "../types/philanthropy";

function entity(id: string, entityType: PhilanthropyEntityType): RankedEntity {
  return {
    entityType,
    id,
    name: `${entityType}-${id}`,
    description: null,
    ein: null,
    location: null,
    totalAssets: null,
    amount: null,
    date: null,
    filingYear: null,
    foundationId: null,
    foundationName: null,
    nonprofitId: null,
    nonprofitName: null,
    scores: { semantic: 0, amount: 0, recency: 0, composite: 0 },
  };
}

describe("groupEntitiesByType", () => {
  it("returns no groups for an empty list", () => {
    expect(groupEntitiesByType([])).toEqual([]);
  });

  it("omits groups that have no entities", () => {
    const groups = groupEntitiesByType([entity("1", "foundation")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("foundation");
  });

  it("orders groups funders → nonprofits → grants regardless of input order", () => {
    const groups = groupEntitiesByType([
      entity("g1", "grant"),
      entity("n1", "nonprofit"),
      entity("f1", "foundation"),
    ]);
    expect(groups.map((g) => g.type)).toEqual(["foundation", "nonprofit", "grant"]);
  });

  it("labels each group with a role so funders vs recipients are unambiguous", () => {
    const groups = groupEntitiesByType([entity("f1", "foundation"), entity("n1", "nonprofit")]);
    const byType = Object.fromEntries(groups.map((g) => [g.type, g]));
    expect(byType.foundation.role).toMatch(/funder/i);
    expect(byType.nonprofit.role).toMatch(/recipient/i);
  });

  it("keeps the agent's ranking order within a group", () => {
    const groups = groupEntitiesByType([
      entity("f1", "foundation"),
      entity("n1", "nonprofit"),
      entity("f2", "foundation"),
    ]);
    expect(groups[0].entities.map((e) => e.id)).toEqual(["f1", "f2"]);
  });
});
