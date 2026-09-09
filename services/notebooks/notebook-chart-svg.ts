/**
 * Structural guards over a compiled chart SVG.
 *
 * WHERE THE SAFETY ACTUALLY COMES FROM, stated plainly so nobody mistakes this
 * module for the boundary: the SVG is built by OUR code from a CLOSED
 * template. The author's chart object is read field by field and never spread
 * (see `notebook-chart-vega.ts`), the specification's `data` is always inline
 * values this build constructed, and the only third-party strings anywhere in
 * the picture are row labels, which vega's `SVGStringRenderer` escapes as text.
 * That is the boundary.
 *
 * THIS FILE IS DEFENCE IN DEPTH AGAINST A VEGA REGRESSION, and nothing else.
 * It is NOT a sanitizer: it never rewrites markup to make it safe, it only
 * answers yes or no, and a "no" degrades the section to its table. Treating it
 * as a sanitizer would be the mistake — a sanitizer invites hostile input,
 * and nothing hostile is supposed to reach here in the first place.
 *
 * THE GUARD IS STRUCTURAL, NOT A BLACKLIST. Three allowlists:
 *
 *   1. tag NAMES, anywhere a `<` is followed by a letter;
 *   2. attribute NAMES, tokenised inside each start tag so that attribute
 *      VALUES are stepped over rather than scanned;
 *   3. a colour predicate over the values of `fill`, `stroke`, `stop-color`
 *      and `flood-color` — and of nothing else.
 *
 * It never reads text content, and never reads the value of an attribute that
 * is not a paint. That is not an optimisation, it is the correctness
 * requirement: a project named `#ff0000 Collective` and one named
 * `<script>alert(1)</script>` both appear in this document — the first
 * verbatim, the second escaped — and both must be ACCEPTED. A guard that
 * grepped for `<script` or for a hex colour would refuse a page over what a
 * community called itself. Both cases are pinned by test.
 *
 * `style` IS DELIBERATELY ABSENT from the attribute allowlist, and there is no
 * `style` element in the tag allowlist, so neither `url()` nor `@import` has
 * anywhere to appear. If a future vega starts emitting one we fail closed —
 * the chart becomes a table and the renderer reports it — which is the right
 * way round.
 *
 * PURE, so the server render and any client that receives an SVG can apply the
 * identical predicate.
 */

/**
 * Elements vega's SVG renderer emits, plus the containers it may wrap them in.
 *
 * Kept minimal on purpose. Every entry is a shape or a text node; nothing here
 * can load, execute or reference anything.
 */
export const NOTEBOOK_CHART_ALLOWED_TAGS: ReadonlySet<string> = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "line",
  "text",
  "tspan",
  "title",
  "desc",
  "defs",
  "clipPath",
  "circle",
]);

/**
 * Attribute names a chart may carry.
 *
 * The list is the plan's, plus four names observed in real compiled output —
 * `xmlns:xlink`, `version`, `stroke-miterlimit` and `display` — which vega
 * emits on every document. They are here because the guard FAILS CLOSED: an
 * attribute nobody listed turns every chart into a table silently, so the
 * compiled-output test beside the renderer, which runs a real compile of every
 * mark through `isSafeChartSvg`, is the thing that keeps this list honest.
 * Extend it from observed output, never from imagination.
 */
export const NOTEBOOK_CHART_ALLOWED_ATTRIBUTES: ReadonlySet<string> = new Set([
  "viewBox",
  "width",
  "height",
  "class",
  "version",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-miterlimit",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "d",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "transform",
  "text-anchor",
  "font-family",
  "font-size",
  "font-weight",
  "dy",
  "dx",
  "display",
  "clip-path",
  "id",
  "xmlns",
  "xmlns:xlink",
  "aria-hidden",
  "role",
  "focusable",
  "aria-label",
  "aria-roledescription",
  "pointer-events",
]);

/** The attributes whose VALUE is a paint, and the only ones read as one. */
export const NOTEBOOK_CHART_PAINT_ATTRIBUTES: ReadonlySet<string> = new Set([
  "fill",
  "stroke",
  "stop-color",
  "flood-color",
]);

/** Any `<` immediately followed by a name — a start tag, wherever it appears. */
const TAG_NAME_PATTERN = /<([a-zA-Z][\w:-]*)/g;

/**
 * A start tag and its attribute body.
 *
 * The body alternation steps over quoted runs first, so a `>` inside an
 * attribute value cannot end the tag early — which is exactly what a label
 * containing markup characters would otherwise do.
 */
const START_TAG_PATTERN = /<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

const ATTRIBUTE_NAME_PATTERN = /^[a-zA-Z_:][\w:.-]*/;
const ATTRIBUTE_SEPARATOR_PATTERN = /^[\s/]+/;
const ATTRIBUTE_EQUALS_PATTERN = /^\s*=\s*/;
const ATTRIBUTE_QUOTED_VALUE_PATTERN = /^"([^"]*)"|^'([^']*)'/;
const ATTRIBUTE_BARE_VALUE_PATTERN = /^[^\s]*/;

/** Paints that name no colour at all, and so can carry no literal. */
const KEYWORD_PAINTS: ReadonlySet<string> = new Set([
  "none",
  "transparent",
  "currentColor",
  "inherit",
]);

/** `hsl(var(--x))`, `hsl(var(--x) / 0.5)`, `rgb(var(--x))` — a token, wrapped. */
const WRAPPED_TOKEN_PAINT = /^(?:hsla?|rgba?)\(\s*var\(--[a-zA-Z0-9-]+\)[^()]*\)$/;
const BARE_TOKEN_PAINT = /^var\(--[a-zA-Z0-9-]+\)$/;

interface ChartSvgAttribute {
  name: string;
  value: string;
}

/**
 * The attributes of one start tag, or `null` if the body cannot be tokenised.
 *
 * Values are STEPPED OVER, never scanned: the tokeniser consumes a quoted run
 * whole, which is what keeps a label containing `=` or `<` from being read as
 * an attribute name. Anything it cannot parse is `null`, and every caller
 * treats `null` as unsafe.
 */
function attributesOf(body: string): ChartSvgAttribute[] | null {
  const attributes: ChartSvgAttribute[] = [];
  let rest = body;

  while (rest.length > 0) {
    const separator = rest.match(ATTRIBUTE_SEPARATOR_PATTERN);
    if (separator) {
      rest = rest.slice(separator[0].length);
      continue;
    }

    const name = rest.match(ATTRIBUTE_NAME_PATTERN);
    if (!name) return null;
    rest = rest.slice(name[0].length);

    let value = "";
    const equals = rest.match(ATTRIBUTE_EQUALS_PATTERN);
    if (equals) {
      rest = rest.slice(equals[0].length);
      const quoted = rest.match(ATTRIBUTE_QUOTED_VALUE_PATTERN);
      if (quoted) {
        value = quoted[1] ?? quoted[2] ?? "";
        rest = rest.slice(quoted[0].length);
      } else {
        const bare = rest.match(ATTRIBUTE_BARE_VALUE_PATTERN);
        value = bare ? bare[0] : "";
        rest = rest.slice(value.length);
        // A bare value that consumed nothing would loop forever.
        if (value.length === 0) return null;
      }
    }

    attributes.push({ name: name[0], value });
  }

  return attributes;
}

/** Every start tag's attributes, or `null` if any tag defeats the tokeniser. */
function everyTagsAttributes(svg: string): ChartSvgAttribute[][] | null {
  const tags: ChartSvgAttribute[][] = [];
  for (const match of svg.matchAll(START_TAG_PATTERN)) {
    const attributes = attributesOf(match[2]);
    if (attributes === null) return null;
    tags.push(attributes);
  }
  return tags;
}

/** Whether every element and attribute in the document is one we expect. */
export function isSafeChartSvg(svg: string): boolean {
  for (const match of svg.matchAll(TAG_NAME_PATTERN)) {
    if (!NOTEBOOK_CHART_ALLOWED_TAGS.has(match[1])) return false;
  }

  const tags = everyTagsAttributes(svg);
  if (tags === null) return false;

  for (const attributes of tags) {
    for (const attribute of attributes) {
      if (!NOTEBOOK_CHART_ALLOWED_ATTRIBUTES.has(attribute.name)) return false;
    }
  }

  return true;
}

function isThemedPaint(value: string): boolean {
  const paint = value.trim();
  if (paint.length === 0) return true;
  if (KEYWORD_PAINTS.has(paint)) return true;
  return BARE_TOKEN_PAINT.test(paint) || WRAPPED_TOKEN_PAINT.test(paint);
}

/**
 * Whether every paint in the document resolves through a theme token.
 *
 * This is the half no source lint can do. `pnpm design:check` reads source
 * literals; the colours in a chart are produced at compile time by a library,
 * so the only place they can be checked is here, on the output.
 */
export function isThemedChartSvg(svg: string): boolean {
  const tags = everyTagsAttributes(svg);
  if (tags === null) return false;

  for (const attributes of tags) {
    for (const attribute of attributes) {
      if (!NOTEBOOK_CHART_PAINT_ATTRIBUTES.has(attribute.name)) continue;
      if (!isThemedPaint(attribute.value)) return false;
    }
  }

  return true;
}

const ROOT_SVG_PATTERN = /^\s*<svg((?:"[^"]*"|'[^']*'|[^>"'])*)>/;
const ROOT_DROPPED_ATTRIBUTES: ReadonlySet<string> = new Set([
  // The intrinsic size vega compiled is the size the CACHE holds, not the size
  // the reader's column is. The viewBox is what makes the picture scalable.
  "width",
  "height",
  // Re-applied below, so re-normalising a normalised document is idempotent.
  "aria-hidden",
  "focusable",
]);

/**
 * The root element as the page embeds it.
 *
 * The picture itself is hidden from assistive technology and from the tab
 * order: the accessible name belongs on the wrapping `role="img"` element, and
 * the figures belong in the real table beneath it. A chart that announced its
 * own hundred `<text>` nodes would read as noise.
 *
 * A document whose root cannot be parsed is returned unchanged — this function
 * runs AFTER the guards, so there is nothing left for it to defend against.
 */
export function normalizeChartSvgRoot(svg: string): string {
  const match = ROOT_SVG_PATTERN.exec(svg);
  if (!match) return svg;

  const attributes = attributesOf(match[1]);
  if (attributes === null) return svg;

  const kept = attributes
    .filter((attribute) => !ROOT_DROPPED_ATTRIBUTES.has(attribute.name))
    .map((attribute) => `${attribute.name}="${attribute.value.replaceAll('"', "&quot;")}"`);

  const root = ["<svg", ...kept, 'aria-hidden="true"', 'focusable="false"'].join(" ");

  return `${root}>${svg.slice(match.index + match[0].length)}`;
}
