import { afterEach, describe, expect, it } from "vitest";
import {
  notebookSandboxFontFaces,
  notebookSandboxThemeMode,
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

/** A stylesheet as the walk sees one: rules with a `.style` bag. */
function sheet(rules: unknown[]) {
  return { cssRules: rules } as unknown as CSSStyleSheet;
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
