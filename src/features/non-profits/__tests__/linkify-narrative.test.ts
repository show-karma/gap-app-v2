import { describe, expect, it } from "vitest";
import { linkifyNarrative } from "../lib/linkify-narrative";
import type { RankedEntity } from "../types/philanthropy";

function entity(overrides: Partial<RankedEntity> & { id: string; name: string }): RankedEntity {
  return {
    entityType: "foundation",
    id: overrides.id,
    name: overrides.name,
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
    ...overrides,
  };
}

describe("linkifyNarrative", () => {
  it("returns the input when there are no entities", () => {
    expect(linkifyNarrative("hello world", [])).toBe("hello world");
  });

  it("links an exact case-insensitive match", () => {
    const entities = [entity({ id: "f1", name: "Ford Foundation" })];
    expect(linkifyNarrative("The Ford Foundation funds work.", entities)).toContain(
      "[The Ford Foundation](/non-profits/find-funders/foundations/f1)"
    );
  });

  it("links when narrative has punctuation the entity name lacks", () => {
    const entities = [entity({ id: "walton", name: "Alice L Walton Foundation" })];
    const result = linkifyNarrative("the Alice L. Walton Foundation in Bentonville", entities);
    expect(result).toContain(
      "the [Alice L. Walton Foundation](/non-profits/find-funders/foundations/walton)"
    );
  });

  it("does not include a lowercase leading article in the anchor", () => {
    const entities = [entity({ id: "ford", name: "Ford Foundation" })];
    const result = linkifyNarrative("Grants from the Ford Foundation support work.", entities);
    expect(result).toContain("the [Ford Foundation](/non-profits/find-funders/foundations/ford)");
    expect(result).not.toContain("[the Ford Foundation]");
  });

  it("links when the entity name has a leading 'The' and the narrative drops it", () => {
    const entities = [entity({ id: "kresge", name: "THE KRESGE FOUNDATION" })];
    const result = linkifyNarrative("The Kresge Foundation in Troy.", entities);
    expect(result).toContain(
      "[The Kresge Foundation](/non-profits/find-funders/foundations/kresge)"
    );
  });

  it("links when the entity has a trailing 'Inc' the narrative drops", () => {
    const entities = [entity({ id: "casey", name: "Annie E Casey Foundation Inc" })];
    const result = linkifyNarrative("the Annie E. Casey Foundation is based", entities);
    expect(result).toContain(
      "the [Annie E. Casey Foundation](/non-profits/find-funders/foundations/casey)"
    );
  });

  it("prefers longer names when two candidates share a suffix", () => {
    const entities = [
      entity({ id: "short", name: "Ford Foundation" }),
      entity({ id: "long", name: "Henry Ford Foundation" }),
    ];
    const result = linkifyNarrative("The Henry Ford Foundation supports work.", entities);
    expect(result).toContain("/non-profits/find-funders/foundations/long");
    expect(result).not.toContain("/non-profits/find-funders/foundations/short");
  });

  it("does not double-link overlapping mentions", () => {
    const entities = [entity({ id: "f1", name: "Ford Foundation" })];
    const result = linkifyNarrative("Ford Foundation and Ford Foundation", entities);
    const linkCount = result.match(/\/non-profits\/find-funders\/foundations\/f1/g)?.length ?? 0;
    expect(linkCount).toBe(2);
  });

  it("skips single-word entity names to avoid false positives", () => {
    const entities = [entity({ id: "f1", name: "Foundation" })];
    expect(linkifyNarrative("This Foundation is great.", entities)).toBe(
      "This Foundation is great."
    );
  });

  it("produces correct path for each entity type", () => {
    const foundations = [entity({ id: "x", name: "Test Foundation", entityType: "foundation" })];
    const nonprofits = [entity({ id: "x", name: "Test Nonprofit", entityType: "nonprofit" })];
    const grants = [entity({ id: "x", name: "Test Grant", entityType: "grant" })];

    expect(linkifyNarrative("Test Foundation", foundations)).toContain(
      "/non-profits/find-funders/foundations/x"
    );
    expect(linkifyNarrative("Test Nonprofit", nonprofits)).toContain(
      "/non-profits/find-funders/nonprofits/x"
    );
    expect(linkifyNarrative("Test Grant", grants)).toContain("/non-profits/find-funders/grants/x");
  });

  it("handles a realistic narrative with mixed name variations", () => {
    const entities = [
      entity({ id: "ford", name: "THE FORD FOUNDATION" }),
      entity({ id: "arnold", name: "LAURA AND JOHN ARNOLD FOUNDATION" }),
      entity({ id: "walton", name: "Alice L Walton Foundation" }),
      entity({ id: "kresge", name: "THE KRESGE FOUNDATION" }),
      entity({ id: "mott", name: "CHARLES STEWART MOTT FOUNDATION" }),
    ];
    const narrative =
      "The Ford Foundation leads. The Laura and John Arnold Foundation follows, " +
      "as does the Alice L. Walton Foundation, the Kresge Foundation, and the " +
      "Charles Stewart Mott Foundation.";

    const result = linkifyNarrative(narrative, entities);
    expect(result).toContain("/non-profits/find-funders/foundations/ford");
    expect(result).toContain("/non-profits/find-funders/foundations/arnold");
    expect(result).toContain("/non-profits/find-funders/foundations/walton");
    expect(result).toContain("/non-profits/find-funders/foundations/kresge");
    expect(result).toContain("/non-profits/find-funders/foundations/mott");
  });
});
