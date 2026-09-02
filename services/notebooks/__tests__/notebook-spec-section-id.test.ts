import { describe, expect, it } from "vitest";
import {
  NOTEBOOK_SECTION_ID_MAX,
  NOTEBOOK_SPEC_MAX_SECTIONS,
  type NotebookSection,
  NotebookSectionSchema,
  NotebookSpecSchema,
} from "@/services/notebooks/notebook-spec";

/**
 * Section ids, and the fact that this side accepts the ones the indexer emits.
 *
 * The two spec modules are hand-mirrored copies, and this field is exactly the
 * kind that drifts: it was added to the indexer for generated-section
 * provenance, and every section schema on BOTH sides is `.strict()`. So a spec
 * the indexer accepts on write (201) and this build refuses on read is not a
 * hypothetical — it is what happens the moment one copy grows a field the
 * other has not. It surfaces as a ContractViolationError on a published page,
 * which reads like a bad generation and is not one.
 *
 * The generator REQUIRES an id on every section it emits, so this is the whole
 * of what stands between AI compose and a 500 on arrival. Nothing in the type
 * system connects the two modules; these assertions do.
 */

/**
 * One valid section per member of the union.
 *
 * Written out rather than taken from `newSection`, which deliberately returns
 * half-filled sections ("" bodies, "" headlines) for the author to complete —
 * those fail validation for reasons that have nothing to do with ids.
 */
const SECTION_FIXTURES: readonly NotebookSection[] = [
  { type: "kpis", metrics: ["committed"] },
  { type: "bars", source: "programs", metric: "disbursedVsCommitted", title: "Disbursed" },
  { type: "applications" },
  { type: "text", body: "What these numbers mean." },
  {
    type: "timeseries",
    source: "indicators",
    indicatorId: "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
    chartStyle: "line",
    title: "Trend",
  },
  { type: "table", source: "kernel", columns: ["function", "tier"], title: "Inventory" },
  { type: "tiers", source: "kernel", title: "Kernel tiers" },
  { type: "query", metricId: "kernel.coverage", groupBy: "none", window: "90d", title: "Coverage" },
  { type: "header", eyebrow: "Filecoin" },
  { type: "hero", headline: "Kernel live monitor" },
  { type: "nav" },
  { type: "narrative", body: "Plain prose with no tokens." },
];

describe("section ids", () => {
  // The guard that matters: a section type added to the union without the
  // identity fields fails HERE, at the point it is added, rather than on a
  // generated page months later.
  it("are covered for every member of the section union", () => {
    expect(SECTION_FIXTURES).toHaveLength(NotebookSectionSchema.options.length);
    expect(SECTION_FIXTURES.map((section) => section.type)).toEqual([
      "kpis",
      "bars",
      "applications",
      "text",
      "timeseries",
      "table",
      "tiers",
      "query",
      "header",
      "hero",
      "nav",
      "narrative",
    ]);
  });

  it.each(SECTION_FIXTURES.map((section) => [section.type, section] as const))(
    "are accepted on a %s section",
    (_type, section) => {
      const parsed = NotebookSectionSchema.safeParse({
        ...section,
        id: "kernel-health-overview",
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.id).toBe("kernel-health-overview");
      }
    }
  );

  // The back catalogue: every page written before the generator existed has no
  // ids at all, and must stay valid. This is why the field is optional rather
  // than required to match the generator's own output schema.
  it.each(SECTION_FIXTURES.map((section) => [section.type, section] as const))(
    "are not required on a %s section",
    (_type, section) => {
      expect(NotebookSectionSchema.safeParse(section).success).toBe(true);
    }
  );

  /**
   * The exact payload that failed: a full page, ids on every section, accepted
   * by the indexer and refused here. `NOTEBOOK_SPEC_MAX_SECTIONS` because the
   * failure was reported on a 20-section page and the cap is where a spec stops
   * being representative.
   */
  it("do not break a full-length composed spec", () => {
    const sections = Array.from({ length: NOTEBOOK_SPEC_MAX_SECTIONS }, (_, index) => ({
      ...SECTION_FIXTURES[index % SECTION_FIXTURES.length],
      id: `section-${index}`,
    }));

    expect(NotebookSpecSchema.safeParse({ version: 1, sections }).success).toBe(true);
  });
});

/**
 * The SHAPE, pinned to the indexer's `NotebookSectionIdSchema`. Both copies
 * have to refuse the same strings, not merely accept the same ones: an id this
 * side accepts and the indexer rejects fails on save instead, which is the
 * same drift pointing the other way.
 */
describe("the section id shape", () => {
  it("matches the indexer's bound", () => {
    expect(NOTEBOOK_SECTION_ID_MAX).toBe(80);
  });

  it.each([
    ["a", "a single character"],
    ["kernel-health-overview", "lowercase kebab"],
    ["9-lives", "a leading digit"],
    ["a".repeat(NOTEBOOK_SECTION_ID_MAX), "the maximum length"],
  ])("accepts %s (%s)", (id) => {
    expect(NotebookSectionSchema.safeParse({ type: "nav", id }).success).toBe(true);
  });

  it.each([
    ["", "empty"],
    ["Kernel-Health", "uppercase"],
    ["-leading-hyphen", "a leading hyphen"],
    ["has space", "a space"],
    ["under_score", "an underscore"],
    ["dotted.id", "a dot — the query metricId shape, not this one"],
    ["a".repeat(NOTEBOOK_SECTION_ID_MAX + 1), "one over the maximum"],
  ])("refuses %s (%s)", (id) => {
    expect(NotebookSectionSchema.safeParse({ type: "nav", id }).success).toBe(false);
  });

  it("refuses an id that is not a string at all", () => {
    expect(NotebookSectionSchema.safeParse({ type: "nav", id: 7 }).success).toBe(false);
  });
});
