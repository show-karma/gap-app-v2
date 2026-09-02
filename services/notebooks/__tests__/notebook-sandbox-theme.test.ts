import { afterEach, describe, expect, it } from "vitest";
import {
  CUSTOM_HTML_THEME_PORT_LIMITS,
  notebookSandboxFontFaces,
  notebookSandboxFontPriority,
  notebookSandboxThemeMode,
  pruneNotebookSandboxFontFaces,
  readNotebookSandboxTheme,
} from "../notebook-sandbox-theme";

/**
 * The theme snapshot, which is the whole of "seamless" that is not CSS.
 *
 * WHAT THESE TESTS ARE ACTUALLY DEFENDING is a failure mode with no error in
 * it. Every function here can return a perfectly well-formed snapshot that is
 * simply missing something — a font whose URL stayed relative, a token
 * declared in a class rule the walk did not match, a family name still
 * wearing its CSSOM quotes — and the only symptom is a block that renders in
 * the browser's default font on a white background inside a dark page. Nothing
 * throws, nothing logs, and the assertion "it sends a theme" passes.
 *
 * So the font-face tests drive stub sheets rather than jsdom's CSS parser: the
 * point is to pin the transformations, and a test that depends on jsdom being
 * able to parse `@font-face` would be testing jsdom.
 */

/**
 * A stylesheet as the walk sees one.
 *
 * `href` is part of the fixture now, because it is the base a `url()` inside
 * this sheet resolves against — see the D2 block. `null` is the inline
 * `<style>` case, where the document's base is the right answer.
 */
function sheet(rules: unknown[], href: string | null = null) {
  return { cssRules: rules, href } as unknown as CSSStyleSheet;
}

/**
 * A style rule shaped like a REAL one, which the earlier fixtures were not.
 *
 * THE EMPTY `cssRules` LIST IS THE WHOLE POINT. Since CSS Nesting shipped,
 * every `CSSStyleRule` in a browser carries one for its nested rules — empty,
 * and therefore truthy. jsdom's does not, so a walk that classified rules by
 * `cssRules` truthiness passed every test here while collecting exactly zero
 * declarations in Chrome. A fixture that cannot reproduce that is a fixture
 * that will not catch it coming back.
 */
function styleRule(selectorText: string, declarations: string[], nested: unknown[] = []) {
  return {
    selectorText,
    cssRules: nested,
    style: declarations,
  };
}

function fontFaceRule(declarations: Record<string, string>) {
  return {
    style: {
      getPropertyValue: (name: string) => declarations[name] ?? "",
    },
  };
}

function docWith(sheets: CSSStyleSheet[]) {
  return { styleSheets: sheets } as unknown as Document;
}

/** A document whose root matches `selector`, for the custom-property walk. */
function docMatching(sheets: CSSStyleSheet[], selector: string, matches: boolean) {
  return {
    styleSheets: sheets,
    baseURI: BASE,
    documentElement: {
      matches: (candidate: string) => matches && candidate === selector,
      classList: { contains: () => false },
      style: [],
    },
    defaultView: {
      getComputedStyle: () => ({
        getPropertyValue: (name: string) => `value-for-${name}`,
      }),
    },
  } as unknown as Document;
}

const BASE = "https://app.karmahq.org/community/x/notebooks/y";

describe("notebookSandboxThemeMode", () => {
  it("should_report_dark_when_the_root_carries_the_dark_class", () => {
    const root = document.createElement("html");
    root.className = "h-full dark __variable_abc";

    expect(notebookSandboxThemeMode(root)).toBe("dark");
  });

  it("should_report_light_when_it_does_not", () => {
    const root = document.createElement("html");
    root.className = "h-full __variable_abc";

    expect(notebookSandboxThemeMode(root)).toBe("light");
  });

  // `dark` must be the CLASS, not a substring of one. A className of
  // "darkmode-toggle" is not dark mode, and `includes("dark")` would say it is.
  it("should_not_treat_a_class_merely_containing_dark_as_dark_mode", () => {
    const root = document.createElement("html");
    root.className = "darkmode-toggle not-dark";

    expect(notebookSandboxThemeMode(root)).toBe("light");
  });
});

describe("notebookSandboxFontFaces", () => {
  it("should_absolutise_a_relative_src_against_the_app_origin", () => {
    const faces = notebookSandboxFontFaces(
      docWith([
        sheet([
          fontFaceRule({
            "font-family": "'__Inter_a1b2c3'",
            src: 'url(/_next/static/media/inter.woff2) format("woff2")',
            "font-weight": "100 900",
            "font-style": "normal",
          }),
        ]),
      ]),
      BASE
    );

    // THE ONE THAT MATTERS. The shell resolves this against its OWN origin, so
    // a relative path here is a 404 on the sandbox origin and a silent
    // fallback font — the exact bug with no error attached.
    expect(faces).toEqual([
      {
        family: "__Inter_a1b2c3",
        src: "https://app.karmahq.org/_next/static/media/inter.woff2",
        weight: "100 900",
        style: "normal",
      },
    ]);
  });

  it("should_strip_the_quotes_cssom_keeps_on_a_family_name", () => {
    const faces = notebookSandboxFontFaces(
      docWith([
        sheet([fontFaceRule({ "font-family": '"Spectral Fallback"', src: "url(/f/s.woff2)" })]),
      ]),
      BASE
    );

    expect(faces[0].family).toBe("Spectral Fallback");
  });

  it("should_drop_a_face_whose_only_source_is_a_local_family", () => {
    const faces = notebookSandboxFontFaces(
      docWith([sheet([fontFaceRule({ "font-family": "Inter", src: "local(Inter)" })])]),
      BASE
    );

    // A local family name means a different typeface on every reader's
    // machine. Dropping the face falls back to the stack, which is honest.
    expect(faces).toEqual([]);
  });

  it("should_keep_a_data_url_source_as_it_is", () => {
    const faces = notebookSandboxFontFaces(
      docWith([
        sheet([fontFaceRule({ "font-family": "Inline", src: "url(data:font/woff2;base64,AA)" })]),
      ]),
      BASE
    );

    expect(faces[0].src).toBe("data:font/woff2;base64,AA");
  });

  it("should_deduplicate_the_same_face_declared_in_more_than_one_sheet", () => {
    const rule = fontFaceRule({
      "font-family": "Inter",
      src: "url(/f/i.woff2)",
      "font-weight": "400",
    });
    const faces = notebookSandboxFontFaces(docWith([sheet([rule]), sheet([rule])]), BASE);

    expect(faces).toHaveLength(1);
  });

  it("should_keep_two_weights_of_one_family_as_two_faces", () => {
    const faces = notebookSandboxFontFaces(
      docWith([
        sheet([
          fontFaceRule({ "font-family": "Inter", src: "url(/f/400.woff2)", "font-weight": "400" }),
          fontFaceRule({ "font-family": "Inter", src: "url(/f/700.woff2)", "font-weight": "700" }),
        ]),
      ]),
      BASE
    );

    expect(faces.map((face) => face.weight)).toEqual(["400", "700"]);
  });

  it("should_look_inside_media_blocks", () => {
    const faces = notebookSandboxFontFaces(
      docWith([
        sheet([{ cssRules: [fontFaceRule({ "font-family": "Nested", src: "url(/f/n.woff2)" })] }]),
      ]),
      BASE
    );

    expect(faces.map((face) => face.family)).toEqual(["Nested"]);
  });

  /**
   * A cross-origin sheet throws on `.cssRules` — Google Fonts' is one.
   *
   * The whole walk must not fail with it. Getting this wrong costs every font
   * and every token in the document because one third-party stylesheet was on
   * the page, and the symptom is again a block in the wrong font.
   */
  it("should_skip_a_stylesheet_it_may_not_read_and_keep_walking_the_rest", () => {
    const hostile = {
      get cssRules(): CSSRuleList {
        throw new Error("SecurityError");
      },
    } as unknown as CSSStyleSheet;

    const faces = notebookSandboxFontFaces(
      docWith([
        hostile,
        sheet([fontFaceRule({ "font-family": "Survivor", src: "url(/f/s.woff2)" })]),
      ]),
      BASE
    );

    expect(faces.map((face) => face.family)).toEqual(["Survivor"]);
  });

  it("should_ignore_a_style_rule_that_is_not_a_font_face", () => {
    const faces = notebookSandboxFontFaces(
      docWith([sheet([{ selectorText: ":root", style: { 0: "--x", length: 1 } }])]),
      BASE
    );

    expect(faces).toEqual([]);
  });
});

describe("readNotebookSandboxTheme", () => {
  afterEach(() => {
    document.documentElement.className = "";
    document.documentElement.removeAttribute("style");
    for (const node of Array.from(document.head.querySelectorAll("style[data-test]"))) {
      node.remove();
    }
  });

  it("should_read_a_custom_property_set_inline_on_the_root", () => {
    document.documentElement.style.setProperty("--card", "#101014");

    const theme = readNotebookSandboxTheme(document, BASE);

    // Inline properties appear in no stylesheet rule anywhere, so a
    // stylesheet-only walk finds the value and never learns the name.
    expect(theme.vars["--card"]).toBe("#101014");
  });

  it("should_report_the_mode_from_the_root_class", () => {
    document.documentElement.classList.add("dark");

    expect(readNotebookSandboxTheme(document, BASE).mode).toBe("dark");
  });

  it("should_omit_a_property_that_resolves_to_nothing", () => {
    document.documentElement.style.setProperty("--present", "1rem");

    const theme = readNotebookSandboxTheme(document, BASE);

    // `--absent: ;` in the shell is a valid declaration of an empty token
    // stream, and it would shadow whatever default the shell had.
    expect(theme.vars).not.toHaveProperty("--absent");
    expect(theme.vars["--present"]).toBe("1rem");
  });

  it("should_produce_a_snapshot_that_survives_structured_cloning", () => {
    document.documentElement.style.setProperty("--radius", "0.75rem");

    const theme = readNotebookSandboxTheme(document, BASE);

    // It goes over a MessagePort, which clones rather than referencing. A
    // snapshot holding a live CSSStyleDeclaration would throw a DataCloneError
    // at the moment of sending, long after this module looked correct.
    expect(() => structuredClone(theme)).not.toThrow();
  });
});

/**
 * The three defects that shipped a theme message nobody received.
 *
 * All three failed the same way: a well-formed snapshot that was empty, wrong
 * or over-length, no error anywhere, and a block rendering black text on the
 * black page in dark mode. Light mode looked fine BY ACCIDENT — default text
 * on a transparent canvas — which is why every test below that can be written
 * against dark mode is.
 */
describe("D1: a style rule is classified by its selector, not by cssRules", () => {
  /**
   * THE REGRESSION TEST. It fails against the shipped code.
   *
   * Measured in the real page: 7071 rules seen, 0 matched, 0 custom properties
   * collected, while a `:root` block declaring 76 of them sat at the top level
   * of a readable sheet.
   */
  it("should_collect_properties_from_a_rule_that_carries_an_empty_nested_list", () => {
    const doc = docMatching(
      [sheet([styleRule(":root", ["--background", "--foreground", "color"])])],
      ":root",
      true
    );

    const theme = readNotebookSandboxTheme(doc, BASE);

    expect(Object.keys(theme.vars).sort()).toEqual(["--background", "--foreground"]);
  });

  it("should_still_look_inside_a_grouping_rule", () => {
    // `@media (prefers-color-scheme: dark)` is a normal home for a palette,
    // and the fix must not trade nesting support for grouping support.
    const doc = docMatching(
      [sheet([{ cssRules: [styleRule(":root", ["--card"])] }])],
      ":root",
      true
    );

    expect(Object.keys(readNotebookSandboxTheme(doc, BASE).vars)).toEqual(["--card"]);
  });

  it("should_look_inside_a_rule_nested_within_a_style_rule", () => {
    const doc = docMatching(
      [sheet([styleRule(".wrapper", ["color"], [styleRule(":root", ["--radius"])])])],
      ":root",
      true
    );

    expect(Object.keys(readNotebookSandboxTheme(doc, BASE).vars)).toEqual(["--radius"]);
  });

  it("should_ignore_a_rule_that_does_not_apply_to_the_root", () => {
    const doc = docMatching([sheet([styleRule(".sidebar", ["--sidebar-bg"])])], ":root", false);

    expect(readNotebookSandboxTheme(doc, BASE).vars).toEqual({});
  });

  // The same misclassification was in the font walk. Font faces have no
  // cssRules, so it happened to work — which is exactly why it would have
  // stayed there.
  it("should_find_a_font_face_declared_beside_nesting_style_rules", () => {
    const faces = notebookSandboxFontFaces(
      docWith([
        sheet([
          styleRule("body", ["font-family"]),
          fontFaceRule({ "font-family": "Inter", src: "url(/f/i.woff2)" }),
        ]),
      ]),
      BASE
    );

    expect(faces.map((face) => face.family)).toEqual(["Inter"]);
  });
});

describe("D2: a url() resolves against its own stylesheet, not the page", () => {
  /**
   * THE REGRESSION TEST. It fails against the shipped code, which resolved
   * against `document.baseURI` and produced
   * `/community/filecoin/media/Inter-...` — a 404 on every face, and again a
   * silent fallback rather than an error.
   */
  it("should_resolve_a_relative_src_against_the_sheet_that_declared_it", () => {
    const faces = notebookSandboxFontFaces(
      docWith([
        sheet(
          [fontFaceRule({ "font-family": "Inter", src: "url(../media/f.woff2)" })],
          "https://app.karmahq.org/_next/static/chunks/a.css"
        ),
      ]),
      // The page is several directories away from the sheet. Resolving against
      // this is what produced the 404s.
      "https://app.karmahq.org/community/filecoin/notebooks/x"
    );

    expect(faces[0].src).toBe("https://app.karmahq.org/_next/static/media/f.woff2");
  });

  it("should_fall_back_to_the_document_base_for_an_inline_style_element", () => {
    // An inline `<style>` has no href, and there the document's base IS the
    // right answer — the fallback is the other half of the CSS rule, not a
    // guess.
    const faces = notebookSandboxFontFaces(
      docWith([sheet([fontFaceRule({ "font-family": "Inline", src: "url(/f/i.woff2)" })], null)]),
      "https://app.karmahq.org/community/filecoin/notebooks/x"
    );

    expect(faces[0].src).toBe("https://app.karmahq.org/f/i.woff2");
  });

  it("should_resolve_each_sheet_against_its_own_href", () => {
    const faces = notebookSandboxFontFaces(
      docWith([
        sheet(
          [fontFaceRule({ "font-family": "A", src: "url(./one.woff2)" })],
          "https://app.karmahq.org/_next/static/chunks/a.css"
        ),
        sheet(
          [fontFaceRule({ "font-family": "B", src: "url(./two.woff2)" })],
          "https://app.karmahq.org/assets/b.css"
        ),
      ]),
      BASE
    );

    expect(faces.map((face) => face.src)).toEqual([
      "https://app.karmahq.org/_next/static/chunks/one.woff2",
      "https://app.karmahq.org/assets/two.woff2",
    ]);
  });
});

describe("D3: the theme stays inside the caps the shell enforces", () => {
  /**
   * Pinned as literals, on purpose.
   *
   * The indexer exports `CUSTOM_HTML_THEME_PORT_LIMITS` and generates the
   * shell's caps from it; this copy carries the same name and values. Reading
   * the numbers from anywhere but a literal here would make this test agree
   * with itself while the two sides drifted apart.
   */
  it("should_mirror_the_port_contract_limits_exactly", () => {
    expect(CUSTOM_HTML_THEME_PORT_LIMITS).toEqual({ variables: 256, fontFaces: 64 });
  });

  const NEXT_FONT_VARS = {
    "--font-inter": "'__Inter_abc', '__Inter_Fallback_abc'",
    "--font-display": "'__Spectral_def'",
    "--font-mono": "'__JetBrains_Mono_ghi'",
    "--background": "#0b0b0f",
  };

  it("should_read_the_families_the_font_tokens_name", () => {
    expect(notebookSandboxFontPriority(NEXT_FONT_VARS)).toEqual([
      "__Inter_abc",
      "__Inter_Fallback_abc",
      "__Spectral_def",
      "__JetBrains_Mono_ghi",
    ]);
  });

  // Truncation makes order load-bearing: whatever falls off the end is a
  // family the block will not have, and the body face is the one it can least
  // afford to lose.
  it("should_put_the_body_font_first_whatever_order_the_tokens_are_in", () => {
    const priority = notebookSandboxFontPriority({
      "--font-mono": "Mono",
      "--font-display": "Display",
      "--font-inter": "Inter",
    });

    expect(priority[0]).toBe("Inter");
  });

  it("should_drop_a_face_no_font_token_names", () => {
    const faces = [
      { family: "__Inter_abc", src: "https://a/i.woff2" },
      { family: "SomeIconFont", src: "https://a/icons.woff2" },
    ];

    const kept = pruneNotebookSandboxFontFaces(faces, notebookSandboxFontPriority(NEXT_FONT_VARS));

    expect(kept.map((face) => face.family)).toEqual(["__Inter_abc"]);
  });

  /**
   * THE REGRESSION TEST for the rejection itself: 39 faces went out against a
   * cap of 16, and an over-long list costs the WHOLE theme rather than the
   * surplus entries.
   */
  it("should_truncate_to_the_cap_rather_than_send_a_message_that_is_discarded", () => {
    const many = Array.from({ length: 39 }, (_, index) => ({
      family: "__Inter_abc",
      src: `https://a/${index}.woff2`,
      weight: String(index),
    }));

    const kept = pruneNotebookSandboxFontFaces(many, ["__Inter_abc"], 16);

    expect(kept).toHaveLength(16);
    // Deterministic: the first sixteen declared, not an arbitrary sixteen.
    expect(kept.map((face) => face.weight)).toEqual(
      Array.from({ length: 16 }, (_, index) => String(index))
    );
  });

  it("should_order_the_kept_faces_by_family_priority", () => {
    const faces = [
      { family: "__JetBrains_Mono_ghi", src: "https://a/m.woff2" },
      { family: "__Inter_abc", src: "https://a/i.woff2" },
    ];

    const kept = pruneNotebookSandboxFontFaces(faces, notebookSandboxFontPriority(NEXT_FONT_VARS));

    expect(kept.map((face) => face.family)).toEqual(["__Inter_abc", "__JetBrains_Mono_ghi"]);
  });

  /**
   * No `--font-*` tokens is not the same as "fonts do not matter here".
   *
   * It is a page this function knows nothing about, and pruning everything on
   * that basis would turn a missing convention into a missing typeface.
   */
  it("should_truncate_but_not_prune_when_no_font_tokens_exist", () => {
    const faces = [
      { family: "Whatever", src: "https://a/w.woff2" },
      { family: "Another", src: "https://a/a.woff2" },
    ];

    expect(pruneNotebookSandboxFontFaces(faces, [])).toHaveLength(2);
    expect(pruneNotebookSandboxFontFaces(faces, [], 1)).toHaveLength(1);
  });

  // next/font emits one face per SUBSET — same family, weight and style,
  // different file. Three families of those came to 39.
  it("should_collapse_the_per_subset_faces_of_one_weight", () => {
    const faces = notebookSandboxFontFaces(
      docWith([
        sheet([
          fontFaceRule({
            "font-family": "Inter",
            src: "url(/f/latin.woff2)",
            "font-weight": "400",
          }),
          fontFaceRule({ "font-family": "Inter", src: "url(/f/ext.woff2)", "font-weight": "400" }),
          fontFaceRule({ "font-family": "Inter", src: "url(/f/cyr.woff2)", "font-weight": "400" }),
        ]),
      ]),
      BASE
    );

    expect(faces).toHaveLength(1);
    // The first declared, which is latin — what these pages are written in.
    expect(faces[0].src).toBe("https://app.karmahq.org/f/latin.woff2");
  });

  it("should_never_emit_more_than_the_cap_from_a_full_snapshot", () => {
    const rules = Array.from({ length: 120 }, (_, index) =>
      fontFaceRule({
        "font-family": "Inter",
        src: `url(/f/${index}.woff2)`,
        "font-weight": String(index),
      })
    );
    const doc = docMatching(
      [sheet([styleRule(":root", ["--font-inter"]), ...rules])],
      ":root",
      true
    );

    const theme = readNotebookSandboxTheme(doc, BASE);

    expect(theme.fontFaces.length).toBeLessThanOrEqual(CUSTOM_HTML_THEME_PORT_LIMITS.fontFaces);
  });
});
