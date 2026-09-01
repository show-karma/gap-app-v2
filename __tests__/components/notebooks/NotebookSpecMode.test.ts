import { describe, expect, it } from "vitest";
import {
  isComposedNotebookSpec,
  isCustomHtmlNotebookSpec,
  NOTEBOOK_CUSTOM_HTML_MAX,
  NotebookComposedSpecSchema,
  NotebookCustomHtmlSpecSchema,
  NotebookSpecSchema,
} from "@/services/notebooks/notebook-spec";

/**
 * The mode discriminant, and the boundary it draws.
 *
 * A notebook is EITHER composed from the closed vocabulary OR an author's own
 * document — never half of each. An `html` SECTION type would have been the
 * easy shape and the wrong one: it would put untrusted markup inside an
 * otherwise trusted page, making every composed page a mixed-trust surface and
 * punching a per-section hole through the boundary tier A rests on.
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
