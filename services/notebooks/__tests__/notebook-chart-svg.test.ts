import { describe, expect, it } from "vitest";
import {
  isSafeChartSvg,
  isThemedChartSvg,
  normalizeChartSvgRoot,
} from "@/services/notebooks/notebook-chart-svg";

/**
 * A fragment shaped like what vega actually emits, minus the geometry.
 *
 * Every negative case below is this document with ONE thing changed, so a
 * failure names the thing rather than the fixture.
 */
const svg = (body: string) =>
  `<svg class="marks" width="560" height="260" viewBox="0 0 560 260">${body}</svg>`;

const SAFE_BODY =
  '<g fill="none" stroke-miterlimit="10" transform="translate(30,5)">' +
  '<path class="background" aria-hidden="true" d="M0,0h530v223h-530Z"/>' +
  '<line x2="530" y2="0" stroke="hsl(var(--border))" stroke-width="1" opacity="1"/>' +
  '<text text-anchor="middle" font-family="inherit" font-size="10px" ' +
  'fill="hsl(var(--muted-foreground))">Program One</text>' +
  "</g>";

describe("the structural guard", () => {
  it("should_accept_a_document_built_only_from_the_shapes_vega_draws", () => {
    expect(isSafeChartSvg(svg(SAFE_BODY))).toBe(true);
  });

  it.each([
    ["a script element", "<script>alert(1)</script>"],
    // `style` is deliberately absent from BOTH allowlists, so neither a style
    // element nor a style attribute can carry a `url()` or an `@import`.
    ["a style element", "<style>@import url(https://attacker.invalid/x.css)</style>"],
    ["a foreignObject", '<foreignObject><div xmlns="x">hi</div></foreignObject>'],
    ["a use reference", '<use href="https://attacker.invalid/x.svg#a"/>'],
    ["an external image", '<image href="https://attacker.invalid/pixel.png"/>'],
  ])("should_refuse_%s", (_label, body) => {
    expect(isSafeChartSvg(svg(body))).toBe(false);
  });

  it.each([
    ["an event handler", '<g onload="alert(1)"></g>'],
    // Whitespace around the equals sign is legal markup and would slip past a
    // guard that pattern-matched on `on...="`.
    ["an event handler spaced out", '<g onload = "alert(1)"></g>'],
    // A bare attribute with no value at all: the name still has to be known.
    ["a valueless unknown attribute", "<g onload></g>"],
    ["an xlink href", '<path xlink:href="https://attacker.invalid/x"/>'],
    ["a style attribute", '<g style="background:url(https://attacker.invalid/x)"></g>'],
  ])("should_refuse_%s", (_label, body) => {
    expect(isSafeChartSvg(svg(body))).toBe(false);
  });

  /**
   * THE TWO FALSE-POSITIVE REGRESSIONS.
   *
   * These are why the guard is three allowlists over tag names and attribute
   * NAMES rather than a substring blacklist. A blacklist that scanned for
   * `<script` or for a hex colour anywhere in the document would refuse both of
   * these — and refusing them is not a security win, it is a community whose
   * chart silently degrades to a table because of what they called a project.
   */
  it("should_accept_a_project_whose_name_is_escaped_markup", () => {
    const body =
      '<text fill="hsl(var(--foreground))">&lt;script&gt;alert(1)&lt;/script&gt;</text>' +
      '<g role="graphics-symbol" aria-label="X-axis with 1 value: &lt;script&gt;alert(1)&lt;/script&gt;"></g>';

    expect(isSafeChartSvg(svg(body))).toBe(true);
  });

  it("should_accept_a_project_literally_named_after_a_hex_colour", () => {
    const body =
      '<text fill="hsl(var(--foreground))">#ff0000 Collective</text>' +
      '<g role="graphics-symbol" aria-label="X-axis with 1 value: #ff0000 Collective"></g>';

    expect(isSafeChartSvg(svg(body))).toBe(true);
    // And the colour predicate has nothing to say about it either: it reads the
    // values of paint attributes and never text content or other attributes.
    expect(isThemedChartSvg(svg(body))).toBe(true);
  });
});

describe("the colour predicate", () => {
  it("should_accept_paints_that_resolve_through_a_theme_token", () => {
    expect(isThemedChartSvg(svg(SAFE_BODY))).toBe(true);
  });

  it.each([
    ["a hex fill", '<path d="M0,0Z" fill="#4c78a8"/>'],
    ["a hex stroke", '<line x1="0" y1="0" x2="1" y2="1" stroke="#333333"/>'],
    ["a literal rgb fill", '<path d="M0,0Z" fill="rgb(76, 120, 168)"/>'],
    ["a named colour", '<path d="M0,0Z" fill="steelblue"/>'],
    ["a gradient reference", '<path d="M0,0Z" fill="url(#gradient_0)"/>'],
  ])("should_refuse_%s", (_label, body) => {
    expect(isThemedChartSvg(svg(body))).toBe(false);
  });

  /**
   * `--chart-1` is a BARE HSL TRIPLE, so a bare `var()` is not a valid paint
   * and renders black. The predicate accepts it because the hard part of that
   * bug is noticing it at all — the compiled-output test beside the renderer is
   * what pins the `hsl()` wrapper actually reaching the SVG.
   */
  it("should_accept_the_keyword_paints_vega_emits_for_an_unpainted_group", () => {
    expect(isThemedChartSvg(svg('<g fill="none" stroke="transparent"></g>'))).toBe(true);
  });

  it("should_look_at_paint_attributes_only_and_not_at_every_attribute", () => {
    // `class` is not a paint. A guard that scanned attribute values generally
    // would refuse this document over a class name.
    expect(isThemedChartSvg(svg('<g class="mark-group role-frame ff0000"></g>'))).toBe(true);
  });
});

describe("the root element the page embeds", () => {
  const normalized = () => normalizeChartSvgRoot(svg(SAFE_BODY));

  /**
   * WIDTH AND HEIGHT OUT, VIEWBOX IN. The intrinsic size vega compiled is the
   * size the CACHE holds, not the size the reader's column is; keeping it would
   * pin a chart to 560px on a phone. The viewBox is what lets CSS scale it.
   */
  it("should_drop_the_compiled_width_and_height", () => {
    expect(normalized()).not.toMatch(/\swidth=/);
    expect(normalized()).not.toMatch(/\sheight=/);
  });

  it("should_keep_the_viewbox_that_makes_it_scalable", () => {
    expect(normalized()).toContain('viewBox="0 0 560 260"');
  });

  /**
   * The accessible name lives on the wrapping `<div role="img">`, and the
   * figures live in a real table beneath. A chart that announced its own
   * hundred `<text>` nodes would read as noise.
   */
  it("should_hide_the_picture_from_assistive_technology_and_from_the_tab_order", () => {
    expect(normalized()).toContain('aria-hidden="true"');
    expect(normalized()).toContain('focusable="false"');
  });

  it("should_leave_the_drawing_itself_untouched", () => {
    expect(normalized()).toContain(SAFE_BODY);
  });

  it("should_still_pass_both_guards_after_normalising", () => {
    expect(isSafeChartSvg(normalized())).toBe(true);
    expect(isThemedChartSvg(normalized())).toBe(true);
  });

  // Re-normalising is what a cached-then-rewrapped SVG would do, and a root
  // carrying `aria-hidden` twice is invalid markup.
  it("should_not_double_up_the_aria_contract_when_it_is_already_there", () => {
    const rootTag = (markup: string) => markup.slice(0, markup.indexOf(">") + 1);

    const already = rootTag(normalizeChartSvgRoot(normalized()));

    expect(already.match(/aria-hidden="true"/g)).toHaveLength(1);
    expect(already.match(/focusable="false"/g)).toHaveLength(1);
  });
});
