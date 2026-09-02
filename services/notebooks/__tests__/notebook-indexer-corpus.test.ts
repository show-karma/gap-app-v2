import { describe, expect, it } from "vitest";
import {
  attachProvenance,
  NotebookGenerationResultSchema,
  type NotebookProvenanceEntry,
} from "@/services/notebooks/notebook-generation.types";
import {
  NOTEBOOK_SPEC_MAX_SECTIONS,
  NotebookSectionSchema,
  NotebookSpecSchema,
} from "@/services/notebooks/notebook-spec";

/**
 * THE STATIC CONGRUENCE CORPUS.
 *
 * Every document below is a payload the INDEXER produces or accepts, copied
 * here verbatim and asserted to survive this side's parse. That is the whole
 * idea: the other tests in this directory check that our schema says what we
 * meant it to say, and they pass perfectly while the two repos disagree,
 * because both halves of the comparison come from this repo.
 *
 * These do not. Each fixture is quoted from a named artefact in gap-indexer,
 * so a field the indexer grows and this copy does not shows up as a failure
 * HERE rather than as a 500 on a published page.
 *
 * WHY THAT FAILURE MODE IS INVISIBLE WITHOUT THIS FILE. The two spec modules
 * are hand-mirrored, and every section object on both sides is `.strict()`.
 * Strictness is what makes an unknown section type a clean rejection instead
 * of a half-drawn page — and it is also what turns "the indexer added an
 * optional field" into "every page carrying that field is unrenderable". The
 * indexer accepts the write (201), stores it, serves it, and this build
 * refuses it on read. Nothing fails until a reader opens the page.
 *
 * That is not hypothetical: it is exactly what `id` did. The indexer added an
 * optional section id for generated-section provenance, its generator emits
 * one on EVERY section, and this side rejected every such document.
 *
 * ADDING TO THIS CORPUS. Copy the document, cite the indexer file it came
 * from, and do not tidy it — a fixture edited to fit our schema is a fixture
 * that has stopped testing anything.
 */

/**
 * The indexer's own sample generator output.
 *
 * Quoted verbatim from `validOutput.structuredOutput` in
 * `gap-indexer/test/unit/v2/services/notebook-config/generate/notebook-spec.generator.test.ts`.
 * This is the reference document the generator's own suite calls a good
 * generation, so if this build cannot read it, this build cannot read AI
 * compose at all.
 */
const GENERATOR_SAMPLE_SPEC = {
  version: 1,
  sections: [
    {
      id: "kernel-heading",
      type: "hero",
      headline: "Filecoin Kernel health",
      subheadline: "A review of network-critical functions.",
    },
    {
      id: "kernel-tiers",
      type: "tiers",
      source: "kernel",
      title: "Health by criticality tier",
    },
    {
      id: "kernel-sla-by-tier",
      type: "query",
      metricId: "kernel.sla-met",
      groupBy: "tier",
      window: "90d",
      title: "SLA met by tier",
    },
  ],
} as const;

/**
 * One section of every type, each carrying an id.
 *
 * The generator can place any member of the vocabulary and gives every section
 * it places an id, so this is the shape of a generated page in general rather
 * than of the one sample above. Ordered to match `NOTEBOOK_SECTION_TYPES` in
 * `gap-indexer/app/modules/v2/domain/models/notebook-spec.ts`, so a reader
 * comparing the two lists can do it line by line.
 */
const EVERY_SECTION_TYPE_WITH_AN_ID = {
  version: 1,
  sections: [
    { id: "kpi-row", type: "kpis", metrics: ["committed", "kernelCoverage"], kernelRange: "90d" },
    {
      id: "disbursed-against-commitment",
      type: "bars",
      source: "programs",
      metric: "disbursedVsCommitted",
      title: "Disbursed against commitment",
      description: "How much of each program's committed funding has been paid out.",
    },
    { id: "open-applications", type: "applications" },
    { id: "method-note", type: "text", body: "Figures are refreshed nightly from the indexer." },
    {
      id: "indicator-trend",
      type: "timeseries",
      source: "indicators",
      indicatorId: "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
      chartStyle: "area",
      range: "12m",
      title: "Storage capacity committed",
    },
    {
      id: "kernel-inventory",
      type: "table",
      source: "kernel",
      columns: ["function", "tier", "measured", "slaMetPct"],
      range: "90d",
      title: "Kernel function inventory",
    },
    { id: "kernel-tier-rollup", type: "tiers", source: "kernel", title: "Kernel tiers" },
    {
      id: "coverage-by-tier",
      type: "query",
      metricId: "kernel.coverage",
      groupBy: "tier",
      window: "90d",
      filters: { tier: ["1"], inScope: true, aggregation: "last" },
      title: "Coverage by tier",
    },
    {
      id: "page-header",
      type: "header",
      eyebrow: "Filecoin",
      breadcrumbs: ["Community", "Kernel"],
    },
    { id: "page-hero", type: "hero", headline: "Kernel live monitor" },
    { id: "page-nav", type: "nav", title: "On this page" },
    {
      id: "funding-narrative",
      type: "narrative",
      body: "Committed to date: {{committed}}, of which {{disbursed}} has been disbursed.",
      kernelRange: "30d",
    },
    /**
     * The untrusted block, inside an otherwise composed page.
     *
     * Quoted against `NotebookCustomHtmlSectionSchema` in
     * `gap-indexer/app/modules/v2/domain/models/notebook-spec.ts`, and placed
     * LAST because that is where it sits in the indexer's union — its
     * `NotebookSectionSchema` is `[...NotebookTrustedSectionSchema.options,
     * NotebookCustomHtmlSectionSchema]`, so a reader comparing the two lists
     * line by line finds it in the same place.
     *
     * THE HTML IS DELIBERATELY HOSTILE. A fixture carrying `<p>hello</p>`
     * would pass while this side quietly grew a sanitiser, a length trim or a
     * tag filter the indexer does not have — and the two copies would then
     * disagree about what is storable without a single test going red. The
     * document is DATA on both sides: neither validates its contents, both
     * bound only its length, and the containment is the sandboxed frame it is
     * posted into. A day when this fixture stops parsing is a day someone
     * moved that boundary.
     */
    {
      id: "author-written-block",
      type: "custom-html",
      html: '<script>window.top.location="https://attacker.invalid"</script><img src=x onerror=alert(1)>',
      title: "Live detail",
    },
  ],
} as const;

/**
 * A page at the section cap, ids on every section.
 *
 * `NOTEBOOK_SPEC_MAX_SECTIONS` because the reported failure was on a
 * twenty-section page: the cap is where a document stops being a toy, and a
 * per-section rejection that only bites past some length would be missed by a
 * three-section fixture.
 */
const FULL_LENGTH_GENERATED_PAGE = {
  version: 1,
  sections: Array.from({ length: NOTEBOOK_SPEC_MAX_SECTIONS }, (_, index) => ({
    ...EVERY_SECTION_TYPE_WITH_AN_ID.sections[
      index % EVERY_SECTION_TYPE_WITH_AN_ID.sections.length
    ],
    id: `section-${index}`,
  })),
};

const SPEC_CORPUS = [
  ["the indexer's sample generator output", GENERATOR_SAMPLE_SPEC],
  ["one section of every type, each with an id", EVERY_SECTION_TYPE_WITH_AN_ID],
  ["a full-length generated page", FULL_LENGTH_GENERATED_PAGE],
] as const;

describe("specs the indexer accepts", () => {
  it.each(SPEC_CORPUS)("are readable on this side: %s", (_label, spec) => {
    const parsed = NotebookSpecSchema.safeParse(spec);

    // Named rather than asserted bare: a bulk `success === false` says a page
    // is broken without saying which section or which field, and the whole
    // value of a corpus is that the failure points at the drift.
    expect(parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join("."))).toEqual(
      []
    );
  });

  /**
   * The guard against a corpus that quietly stops being representative.
   *
   * A section type added to the indexer arrives here as a union member; if
   * nobody adds a fixture for it, the corpus keeps passing while covering
   * eleven twelfths of the vocabulary. This fails the moment the union grows.
   */
  it("cover every member of the section union", () => {
    const covered = new Set(EVERY_SECTION_TYPE_WITH_AN_ID.sections.map((section) => section.type));

    expect(covered.size).toBe(NotebookSectionSchema.options.length);
  });

  // The back catalogue, stated as its own case: every page composed before the
  // generator existed carries no ids at all, and must keep rendering. This is
  // why the field is optional here even though the generator always emits one.
  it("stay readable with the ids stripped", () => {
    const sections = EVERY_SECTION_TYPE_WITH_AN_ID.sections.map(({ id: _id, ...rest }) => rest);

    expect(NotebookSpecSchema.safeParse({ version: 1, sections }).success).toBe(true);
  });
});

/**
 * The generate endpoint's response, which is the OTHER document the indexer
 * hands this build — and the one AI compose fails on first, before anything is
 * ever stored.
 *
 * Quoted against `GeneratedNotebookSpecResponseSchema` in
 * `gap-indexer/app/modules/v2/api/controllers/notebook-config/generate/dto/notebook-spec-generation.schemas.ts`.
 * That schema is `.strict()` and refines a section-per-provenance pairing, so
 * everything below is a response it would emit: one provenance entry per
 * section, in order, keyed by `sectionId` and never by index.
 */
const GENERATION_RESPONSE = {
  spec: GENERATOR_SAMPLE_SPEC,
  provenance: [
    {
      sectionId: "kernel-heading",
      summary: "Authored heading",
      sources: [{ kind: "authored", label: "Model-written copy" }],
    },
    {
      sectionId: "kernel-tiers",
      summary: "Kernel tier rollup",
      sources: [{ kind: "kernel", id: "kernel", label: "Kernel tier rollup" }],
    },
    {
      sectionId: "kernel-sla-by-tier",
      summary: "SLA met, grouped by tier",
      sources: [{ kind: "metric", id: "kernel.sla-met", label: "SLA met" }],
    },
  ],
  warnings: [],
};

describe("the generate response the indexer returns", () => {
  it("is readable on this side", () => {
    const parsed = NotebookGenerationResultSchema.safeParse(GENERATION_RESPONSE);

    expect(parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join("."))).toEqual(
      []
    );
  });

  /**
   * The indexer keys provenance by `sectionId` ONLY — its response schema has
   * no `sectionIndex` field at all. This side accepts both and resolves the
   * index form first, so the id-only form takes the fallback path. That
   * fallback is what every real response goes through, so it is worth pinning
   * that it lands the evidence on the right section rather than merely not
   * throwing.
   */
  it("attaches each entry to the section it describes", () => {
    const entries = GENERATION_RESPONSE.provenance as NotebookProvenanceEntry[];

    const attached = attachProvenance(GENERATOR_SAMPLE_SPEC.sections.length, entries);

    expect(attached.map((entry) => entry?.sectionId)).toEqual(
      GENERATOR_SAMPLE_SPEC.sections.map((section) => section.id)
    );
  });

  /**
   * BOUNDS ARE PART OF THE CONTRACT, not decoration.
   *
   * A string the indexer is willing to send and this side refuses fails the
   * WHOLE call — the parse is all-or-nothing, so one long label loses the spec,
   * the provenance and the warnings together, and the builder reports a failed
   * generation for a generation that succeeded. These are the indexer's own
   * maxima, so a response at any of them has to survive here.
   */
  it.each([
    ["a provenance label at the indexer's 300-character maximum", 300, 500],
    ["a warning at the indexer's 1000-character maximum", 200, 1000],
  ])("survives %s", (_label, labelLength, warningLength) => {
    const response = {
      ...GENERATION_RESPONSE,
      provenance: [
        {
          ...GENERATION_RESPONSE.provenance[0],
          sources: [{ kind: "authored", label: "l".repeat(labelLength) }],
        },
        ...GENERATION_RESPONSE.provenance.slice(1),
      ],
      warnings: ["w".repeat(warningLength)],
    };

    const parsed = NotebookGenerationResultSchema.safeParse(response);

    expect(parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join("."))).toEqual(
      []
    );
  });
});
