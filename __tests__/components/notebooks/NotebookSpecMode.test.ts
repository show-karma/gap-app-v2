import { describe, expect, it } from "vitest";
import {
  isComposedNotebookSpec,
  isCustomHtmlNotebookSpec,
  NOTEBOOK_CUSTOM_HTML_MAX,
  NotebookComposedSpecSchema,
  NotebookCustomHtmlSpecSchema,
  NotebookGeneratedSpecSchema,
  NotebookSpecSchema,
} from "@/services/notebooks/notebook-spec";

/**
 * The mode discriminant, and the boundary it draws.
 *
 * A notebook page is EITHER composed from the closed vocabulary OR nothing but
 * an author's own document. That distinction survives; what changed is that a
 * composed page may now contain a `custom-html` SECTION, so "composed" no
 * longer implies "every byte of this was written by us".
 *
 * THE COMMENT THAT USED TO BE HERE said an html section type would be the easy
 * shape and the wrong one, because it would make a composed page a mixed-trust
 * surface. The section exists now, and the objection was answered rather than
 * overruled: it is quarantined in the same sandbox on the same separate
 * origin, it is marked as unverified in the review surface, and the AI
 * composer cannot emit one. The property actually worth protecting is that
 * nothing can put model-written markup inside the trusted builder — which the
 * last block in this file pins directly, instead of leaving it to fall out of
 * a shape.
 */

const COMPOSED = { version: 1, sections: [{ type: "applications" }] };
const CUSTOM = { version: 1, mode: "custom-html", html: "<h1>hi</h1>" };

describe("mode is additive, so stored pages keep working", () => {
  // Every spec written before the field existed is a composed page. Requiring
  // `mode` would have invalidated the entire back catalogue to record
  // something already true of all of them.
  it("should_read_a_spec_with_no_mode_as_composed", () => {
    const parsed = NotebookSpecSchema.parse(COMPOSED);

    expect(isComposedNotebookSpec(parsed)).toBe(true);
    expect(isCustomHtmlNotebookSpec(parsed)).toBe(false);
  });

  it("should_accept_an_explicit_composed_mode_too", () => {
    expect(NotebookSpecSchema.safeParse({ ...COMPOSED, mode: "composed" }).success).toBe(true);
  });

  it("should_read_a_custom_html_spec_as_custom", () => {
    const parsed = NotebookSpecSchema.parse(CUSTOM);

    expect(isCustomHtmlNotebookSpec(parsed)).toBe(true);
    expect(isComposedNotebookSpec(parsed)).toBe(false);
  });
});

/**
 * THE VERSIONING DOCTRINE, checked rather than asserted in a comment.
 *
 * `version` stays 1 only because a v1 reader REJECTS a custom page rather than
 * misreading it. If the composed schema accepted this and rendered something,
 * the mode would need a version bump.
 */
describe("a composed reader refuses a custom page rather than misreading it", () => {
  it("should_reject_a_custom_html_spec_against_the_composed_schema", () => {
    expect(NotebookComposedSpecSchema.safeParse(CUSTOM).success).toBe(false);
  });

  it("should_reject_a_composed_spec_against_the_custom_schema", () => {
    expect(NotebookCustomHtmlSpecSchema.safeParse(COMPOSED).success).toBe(false);
  });

  // The two shapes cannot be blended: no page is half composed and half custom.
  it.each([
    [
      "sections alongside html",
      { version: 1, mode: "custom-html", html: "<p>x</p>", sections: [] },
    ],
    ["html alongside sections", { ...COMPOSED, html: "<p>x</p>" }],
    ["html on an explicitly composed page", { ...COMPOSED, mode: "composed", html: "<p>x</p>" }],
  ])("should_refuse_%s", (_label, spec) => {
    expect(NotebookSpecSchema.safeParse(spec).success).toBe(false);
  });

  it("should_refuse_a_mode_it_does_not_know", () => {
    expect(
      NotebookSpecSchema.safeParse({ version: 1, mode: "iframe", html: "<p>x</p>" }).success
    ).toBe(false);
  });
});

describe("the custom document itself", () => {
  it("should_refuse_an_empty_document", () => {
    expect(NotebookSpecSchema.safeParse({ ...CUSTOM, html: "" }).success).toBe(false);
  });

  it("should_accept_a_document_at_the_size_limit", () => {
    const html = "x".repeat(NOTEBOOK_CUSTOM_HTML_MAX);

    expect(NotebookSpecSchema.safeParse({ ...CUSTOM, html }).success).toBe(true);
  });

  it("should_refuse_a_document_over_the_size_limit", () => {
    const html = "x".repeat(NOTEBOOK_CUSTOM_HTML_MAX + 1);

    expect(NotebookSpecSchema.safeParse({ ...CUSTOM, html }).success).toBe(false);
  });

  // The document is DATA. Nothing here sanitises it and nothing should: it is
  // never executed by this application, only posted into a sandboxed frame on
  // a foreign origin. Sanitising would imply the containment was optional.
  it("should_store_a_hostile_document_verbatim_because_containment_is_the_defence", () => {
    const html = '<script>fetch("//evil.example")</script>';

    const parsed = NotebookSpecSchema.parse({ ...CUSTOM, html });

    expect(isCustomHtmlNotebookSpec(parsed) && parsed.html).toBe(html);
  });
});

/**
 * The `custom-html` SECTION: untrusted markup inside a composed page.
 *
 * The section and the mode share one bound and one containment. What they do
 * not share is a claim about the page around them — which is why the AI block
 * below is in this file rather than in the generator's own tests.
 */
describe("a custom-html section inside a composed page", () => {
  const withCustom = (section: Record<string, unknown>) => ({
    version: 1,
    sections: [{ type: "applications" }, section],
  });

  it("should_accept_a_custom_html_section_in_a_composed_page", () => {
    const parsed = NotebookSpecSchema.parse(
      withCustom({ type: "custom-html", html: "<p>hand written</p>" })
    );

    // Still a COMPOSED page: the renderer branches on mode, and a page with a
    // custom block in it is one the composed renderer draws.
    expect(isComposedNotebookSpec(parsed)).toBe(true);
    expect(isCustomHtmlNotebookSpec(parsed)).toBe(false);
  });

  it("should_accept_an_optional_title_and_an_optional_id", () => {
    expect(
      NotebookComposedSpecSchema.safeParse(
        withCustom({
          type: "custom-html",
          html: "<p>x</p>",
          title: "Methodology",
          id: "methodology-note",
        })
      ).success
    ).toBe(true);
  });

  it("should_refuse_an_empty_document", () => {
    expect(
      NotebookComposedSpecSchema.safeParse(withCustom({ type: "custom-html", html: "" })).success
    ).toBe(false);
  });

  // ONE BOUND FOR BOTH PLACEMENTS. A section is not a smaller thing than a
  // page here — same document, same port, same frame — and two numbers would
  // be two limits to keep in step with the indexer for no visible difference.
  it("should_share_the_page_mode_size_limit_exactly", () => {
    const at = "x".repeat(NOTEBOOK_CUSTOM_HTML_MAX);
    const over = "x".repeat(NOTEBOOK_CUSTOM_HTML_MAX + 1);

    expect(
      NotebookComposedSpecSchema.safeParse(withCustom({ type: "custom-html", html: at })).success
    ).toBe(true);
    expect(
      NotebookComposedSpecSchema.safeParse(withCustom({ type: "custom-html", html: over })).success
    ).toBe(false);
  });

  it("should_refuse_a_field_the_section_does_not_declare", () => {
    // `.strict()`, like every section. A stored field nothing reads is a field
    // someone will eventually assume is honoured.
    expect(
      NotebookComposedSpecSchema.safeParse(
        withCustom({ type: "custom-html", html: "<p>x</p>", script: "alert(1)" })
      ).success
    ).toBe(false);
  });

  it("should_store_a_hostile_document_verbatim_here_too", () => {
    const html = '<script>fetch("//evil.example")</script>';

    const parsed = NotebookComposedSpecSchema.parse(withCustom({ type: "custom-html", html }));

    // Same reasoning as the page mode: the containment is the sandbox and the
    // separate origin. Sanitising would imply the containment was optional.
    expect(parsed.sections[1]).toMatchObject({ type: "custom-html", html });
  });
});

/**
 * THE ONE THAT MATTERS. A model may not write markup into the trusted builder.
 *
 * This used to hold for free: custom HTML was only a page MODE, and the
 * generator returns a composed spec, so a composed schema refused it without
 * anyone deciding that it should. Adding the section type handed that refusal
 * back — a model could return a composed page with one custom-html block in it
 * and be inside the trusted builder, having written both the markup and every
 * figure in it. The refusal is now explicit, which means it is now something
 * that can be deleted by accident, which is why it is tested.
 */
describe("the generated-spec schema refuses model-written markup", () => {
  const generated = (sections: Record<string, unknown>[]) => ({ version: 1, sections });

  it("should_refuse_a_generated_page_containing_a_custom_html_section", () => {
    const proposal = generated([
      { type: "applications" },
      { type: "custom-html", html: "<p>written by a model</p>" },
    ]);

    expect(NotebookGeneratedSpecSchema.safeParse(proposal).success).toBe(false);
    // And the plain composed schema accepts it, which is exactly why the
    // generator must not be pointed at that one.
    expect(NotebookComposedSpecSchema.safeParse(proposal).success).toBe(true);
  });

  it("should_accept_every_other_section_type_it_could_propose", () => {
    const proposal = generated([
      { type: "hero", headline: "Q3" },
      { type: "kpis", metrics: ["committed"] },
      { type: "narrative", body: "We committed {{committed}}." },
      { type: "applications" },
    ]);

    expect(NotebookGeneratedSpecSchema.safeParse(proposal).success).toBe(true);
  });

  // Anything the generated schema accepts must be a valid composed page, or
  // the narrowing would have become a second vocabulary to keep in step.
  it("should_produce_specs_the_composed_schema_also_accepts", () => {
    const proposal = generated([{ type: "kpis", metrics: ["committed"], id: "kpi-row" }]);

    expect(NotebookGeneratedSpecSchema.safeParse(proposal).success).toBe(true);
    expect(NotebookComposedSpecSchema.safeParse(proposal).success).toBe(true);
  });
});
