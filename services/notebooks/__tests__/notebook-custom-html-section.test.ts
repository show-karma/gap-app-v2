import { describe, expect, it } from "vitest";
import { sectionTitle } from "@/components/Pages/Communities/Notebooks/NotebookEditorial";
import { NotebookGenerationResultSchema } from "@/services/notebooks/notebook-generation.types";
import {
  isComposedNotebookSpec,
  isCustomHtmlNotebookSpec,
  NOTEBOOK_CUSTOM_HTML_MAX,
  NOTEBOOK_SPEC_MAX_SECTIONS,
  NotebookSectionSchema,
  NotebookSpecSchema,
} from "@/services/notebooks/notebook-spec";

/**
 * The custom-html SECTION: an untrusted document inside a trusted page.
 *
 * This file exists because the change it guards reverses a rule this module
 * used to state in prose — "WHOLE-PAGE, NEVER A SECTION" — and reversing it
 * moves a trust boundary that several other things were quietly leaning on.
 * The schema is where the move is visible, so this is where it gets pinned.
 *
 * WHAT ACTUALLY CHANGED, and it is not the containment. The document is still
 * posted over a private MessagePort into a frame that is `allow-scripts`
 * WITHOUT `allow-same-origin`, served from a separate registrable origin, and
 * never URL-addressable. What changed is that a page can now be BOTH: a spec
 * carrying a custom section still answers `isComposedNotebookSpec`, so it
 * still reaches the tier-A renderer, which now has to hand exactly one of its
 * sections to the sandbox and none of the others. That is the new hazard, and
 * the assertions below are about the places it can go wrong quietly.
 */

const TRUSTED_SECTION = { id: "page-hero", type: "hero", headline: "Kernel live monitor" } as const;

/** Hostile on purpose — see `should_store_the_document_byte_for_byte`. */
const HOSTILE_HTML =
  '<script>window.top.location="https://attacker.invalid"</script><img src=x onerror=alert(1)>';

function composed(...sections: unknown[]) {
  return { version: 1, sections };
}

describe("a custom-html section", () => {
  it("should_be_accepted_inside_an_otherwise_composed_page", () => {
    const parsed = NotebookSpecSchema.safeParse(
      composed(TRUSTED_SECTION, { type: "custom-html", html: "<main>Hand-written</main>" })
    );

    expect(parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join("."))).toEqual(
      []
    );
  });

  it.each([
    ["bare", { type: "custom-html", html: "<p>x</p>" }],
    ["with an id", { type: "custom-html", id: "author-block", html: "<p>x</p>" }],
    ["with a title", { type: "custom-html", html: "<p>x</p>", title: "Live detail" }],
    [
      "with both",
      { type: "custom-html", id: "author-block", html: "<p>x</p>", title: "Live detail" },
    ],
  ])("should_accept_the_%s_form", (_label, section) => {
    expect(NotebookSectionSchema.safeParse(section).success).toBe(true);
  });

  /**
   * THE DOCUMENT IS DATA, and this side must not develop opinions about it.
   *
   * The indexer bounds the length and nothing else — no sanitiser, no tag
   * filter, no trim. A `.trim()` or a strip added here would make a document
   * the indexer stores and serves one this build silently rewrites, and the
   * reader would get markup nobody wrote. The containment is the sandboxed
   * frame; it is not, and must never become, a filter at this boundary.
   */
  it("should_store_the_document_byte_for_byte", () => {
    const html = `  ${HOSTILE_HTML}\n`;

    const parsed = NotebookSectionSchema.parse({ type: "custom-html", html });

    expect(parsed).toMatchObject({ html });
  });

  it.each([
    ["an empty document", ""],
    ["one byte over the maximum", "x".repeat(NOTEBOOK_CUSTOM_HTML_MAX + 1)],
  ])("should_refuse_%s", (_label, html) => {
    expect(NotebookSectionSchema.safeParse({ type: "custom-html", html }).success).toBe(false);
  });

  it("should_accept_a_document_at_exactly_the_maximum", () => {
    const html = "x".repeat(NOTEBOOK_CUSTOM_HTML_MAX);

    expect(NotebookSectionSchema.safeParse({ type: "custom-html", html }).success).toBe(true);
  });

  it.each([
    ["a missing document", { type: "custom-html" }],
    ["a document that is not a string", { type: "custom-html", html: 42 }],
    ["a document that is an object", { type: "custom-html", html: { toString: "<p>x</p>" } }],
    // `.strict()` is what keeps the two mirrored copies honest; a field this
    // side invents is a field the indexer would reject on write.
    ["an invented field", { type: "custom-html", html: "<p>x</p>", script: "alert(1)" }],
    ["a smuggled sandbox opt-out", { type: "custom-html", html: "<p>x</p>", sandbox: "" }],
  ])("should_refuse_%s", (_label, section) => {
    expect(NotebookSectionSchema.safeParse(section).success).toBe(false);
  });

  it("should_count_against_the_page_section_cap_like_any_other", () => {
    const overCap = Array.from({ length: NOTEBOOK_SPEC_MAX_SECTIONS + 1 }, () => ({
      type: "custom-html",
      html: "<p>x</p>",
    }));

    expect(NotebookSpecSchema.safeParse(composed(...overCap)).success).toBe(false);
    expect(NotebookSpecSchema.safeParse(composed(...overCap.slice(1))).success).toBe(true);
  });
});

/**
 * The mode discriminant, which now means something narrower than its name.
 *
 * `isComposedNotebookSpec` was the gate that kept untrusted markup away from
 * the tier-A renderer, and it no longer is: a composed page may carry one.
 * Stating that here means the day someone reads the old comment and "fixes"
 * the predicate to exclude such pages, the failure names the decision rather
 * than appearing as a blank page.
 */
describe("a composed page carrying a custom section", () => {
  const spec = NotebookSpecSchema.parse(
    composed(TRUSTED_SECTION, { type: "custom-html", html: HOSTILE_HTML })
  );

  it("should_still_read_as_composed", () => {
    expect(isComposedNotebookSpec(spec)).toBe(true);
    expect(isCustomHtmlNotebookSpec(spec)).toBe(false);
  });

  it("should_keep_the_whole_page_custom_mode_a_separate_thing", () => {
    const wholePage = NotebookSpecSchema.parse({
      version: 1,
      mode: "custom-html",
      html: "<p>x</p>",
    });

    expect(isCustomHtmlNotebookSpec(wholePage)).toBe(true);
    expect(isComposedNotebookSpec(wholePage)).toBe(false);
  });

  /**
   * A `mode: "custom-html"` document has no `sections`, and a composed one has
   * no top-level `html`. Neither union branch may accept the hybrid: a spec
   * carrying both would be read as one thing by the reader that checks `mode`
   * first and another by the reader that checks `sections`, and the two
   * readers here are the frontend and the indexer.
   */
  it("should_refuse_a_page_that_is_both_modes_at_once", () => {
    expect(
      NotebookSpecSchema.safeParse({
        version: 1,
        mode: "custom-html",
        html: "<p>x</p>",
        sections: [TRUSTED_SECTION],
      }).success
    ).toBe(false);
  });
});

/**
 * The nav must not index the block.
 *
 * `title` on a custom section is the FRAME'S ACCESSIBLE NAME, not a heading —
 * nothing draws it as text, because the block renders seamlessly with no
 * chrome. An exhaustive-switch refactor that adds `case "custom-html": return
 * section.title` would put an entry in the on-this-page nav whose anchor lands
 * on no visible heading, which reads to a user as a broken link.
 */
describe("the anchor nav", () => {
  it("should_not_name_a_custom_section_by_its_frame_label", () => {
    expect(
      sectionTitle({ type: "custom-html", html: "<p>x</p>", title: "Live detail" })
    ).toBeUndefined();
  });
});

/**
 * THE REFUSAL THAT MOVED, and the reason this block argues rather than asserts.
 *
 * Before the section existed, the composed generator could not return custom
 * HTML because its response schema was the COMPOSED spec schema and custom
 * HTML was a different top-level mode. That refusal was free — nobody wrote
 * it, it fell out of the shape.
 *
 * Adding the section to `NotebookSectionSchema` DISSOLVES that free refusal in
 * total silence: the composed spec schema now admits the section, so a
 * generate response carrying model-written markup parses, reaches the builder,
 * and is saved by a reviewer who believes they are reviewing a composed page.
 * Nothing in the type system objects, and no test that existed before this one
 * fails. The refusal now has to be WRITTEN, on both sides, and this is the
 * frontend half of it.
 */
describe("the composed generator's response", () => {
  const response = (sections: unknown[]) => ({
    spec: { version: 1, sections },
    provenance: [],
    warnings: [],
  });

  it("should_still_be_read_when_it_is_composed_of_the_trusted_vocabulary", () => {
    expect(NotebookGenerationResultSchema.safeParse(response([TRUSTED_SECTION])).success).toBe(
      true
    );
  });

  it("should_be_refused_when_it_returns_a_custom_html_section", () => {
    const parsed = NotebookGenerationResultSchema.safeParse(
      response([{ id: "untrusted-block", type: "custom-html", html: HOSTILE_HTML }])
    );

    expect(parsed.success).toBe(false);
  });

  // Smuggling it past a check that only looks at the first section.
  it("should_be_refused_when_a_custom_section_is_buried_among_trusted_ones", () => {
    const parsed = NotebookGenerationResultSchema.safeParse(
      response([
        TRUSTED_SECTION,
        { id: "note", type: "text", body: "Figures refresh nightly." },
        { id: "untrusted-block", type: "custom-html", html: HOSTILE_HTML },
        { id: "page-nav", type: "nav" },
      ])
    );

    expect(parsed.success).toBe(false);
  });

  // The whole-page form, which is the refusal that already existed. Kept so a
  // rewrite of the schema cannot trade one refusal for the other.
  it("should_be_refused_when_it_returns_a_whole_custom_page", () => {
    const parsed = NotebookGenerationResultSchema.safeParse({
      spec: { version: 1, mode: "custom-html", html: HOSTILE_HTML },
      provenance: [],
      warnings: [],
    });

    expect(parsed.success).toBe(false);
  });
});
