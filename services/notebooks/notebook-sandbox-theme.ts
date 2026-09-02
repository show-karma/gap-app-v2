/**
 * The app's live theme, snapshotted into something that can cross an opaque
 * origin boundary.
 *
 * WHY A SNAPSHOT AND NOT A STYLESHEET LINK. The sandboxed frame has no
 * `allow-same-origin`, so it is in an opaque origin: it cannot read our
 * document, and a stylesheet it loaded from us would still leave it a separate
 * document with its own cascade root. There is no way to *share* our styles
 * with it. The only thing that crosses is a structured-cloneable message, so
 * the theme has to be reduced to values — a mode, a bag of custom properties,
 * and enough of each `@font-face` rule for the shell to redeclare it.
 *
 * WHAT CROSSES IS INERT, and that is what makes this safe to send into an
 * untrusted document. A CSS custom property is an unparsed token stream until
 * something references it; `mode` is one of two strings; a font face is a
 * family name, a URL on our own origin, and two keywords. Nothing here is
 * markup, nothing is a script, and nothing is a secret — every value in it is
 * already readable by anyone who opens the app in a browser. It travels the
 * other way from the author's document (parent to sandbox) so it never touches
 * the trust boundary that matters, but it is worth being able to say plainly
 * that a hostile shell learns nothing from it.
 *
 * The mirror of this is `karma-notebooks`' shell, which applies the snapshot.
 * The message shape is the contract; see `NOTEBOOK_SANDBOX_THEME`.
 */

/**
 * How much theme the shell will accept in one message.
 *
 * MIRRORED FROM THE PORT CONTRACT, by the same two-door rule as the spec: the
 * indexer exports `CUSTOM_HTML_THEME_PORT_LIMITS` and generates the shell's
 * caps from it, this copy carries the same name and the same literals, and the
 * congruence corpus pins both numbers so a change on either side fails a test
 * rather than silently halving what a page can be styled with.
 *
 * THE SHELL REJECTS AN OVER-LONG MESSAGE WHOLE — not the surplus entries, the
 * entire theme — so one face too many is indistinguishable from sending no
 * theme at all. That is not hypothetical: three families of next/font subsets
 * came to 39 faces against a cap of 16, the shell dropped the message, and the
 * block rendered black text on the black page in dark mode with nothing
 * anywhere reporting a problem.
 *
 * So the host holds itself under the caps rather than trusting that it happens
 * to be under a number it cannot observe. A page whose extended subsets are
 * missing is a page; a page with no theme is a bug report.
 */
export const CUSTOM_HTML_THEME_PORT_LIMITS = {
  variables: 256,
  fontFaces: 64,
} as const;

/** One `@font-face`, reduced to what the shell needs to redeclare it. */
export interface NotebookSandboxFontFace {
  /** The `font-family` as declared, quotes stripped. */
  family: string;
  /**
   * An ABSOLUTE url on the app's origin.
   *
   * Absolute because the shell resolves it against ITS OWN document, which is
   * on a different origin — a relative `/_next/static/media/...` would resolve
   * against the sandbox origin and 404. This is the one field that would fail
   * silently and invisibly if it were passed through as declared.
   */
  src: string;
  weight?: string;
  style?: string;
}

export interface NotebookSandboxThemeSnapshot {
  mode: "light" | "dark";
  /**
   * Every `--*` custom property that applies to `<html>`, by name.
   *
   * VALUES ARE READ FROM THE LIVE ELEMENT, not from the rules they were
   * declared in. That is what makes one snapshot correct in both themes: the
   * `.dark` override, the `:root` default and a tenant's theme tokens have
   * already been resolved by the cascade by the time `getComputedStyle` answers,
   * so this reads whatever is actually in force right now.
   */
  vars: Record<string, string>;
  fontFaces: NotebookSandboxFontFace[];
}

/**
 * Whether the app is in dark mode.
 *
 * Tailwind is configured `darkMode: ["class"]`, so the class on `<html>` IS
 * the mode — not `prefers-color-scheme`, which the app's own theme switch
 * overrides and which would therefore disagree with the page around the frame
 * for any reader who has chosen a theme.
 */
export function notebookSandboxThemeMode(root: HTMLElement): "light" | "dark" {
  return root.classList.contains("dark") ? "dark" : "light";
}

/**
 * Strip the quotes CSSOM keeps on a `font-family` value.
 *
 * `getPropertyValue("font-family")` returns the declaration as authored, so a
 * next/font family comes back as `'__Inter_a1b2c3'` WITH the quotes. Passed
 * through as-is the shell would redeclare a family whose name contains
 * apostrophes and nothing would match it.
 */
function unquote(value: string): string {
  const trimmed = value.trim();
  const quoted = /^(["'])(.*)\1$/.exec(trimmed);
  return quoted ? quoted[2] : trimmed;
}

/**
 * The first `url(...)` in a `src` descriptor, resolved against this document.
 *
 * ONLY THE FIRST, and only a `url()`. A next/font `src` is one woff2 per face,
 * so there is nothing to lose; `local(...)` entries are deliberately dropped
 * because a local family name means something different on every reader's
 * machine and would silently substitute a different typeface.
 *
 * Returns `null` for a face we cannot address, and the caller then omits the
 * face entirely rather than sending a broken URL — a font that does not load
 * falls back to the stack, which is a worse-looking page; a font that loads
 * from the WRONG place is a page that looks broken.
 */
function absoluteFontSource(src: string, base: string): string | null {
  const match = /url\(\s*(["']?)([^"')]+)\1\s*\)/.exec(src);
  if (!match) return null;
  try {
    const resolved = new URL(match[2], base);
    // Data URLs are already absolute and self-contained; http(s) is the only
    // other thing a font can usefully be. Anything else is not addressable
    // from another origin.
    if (resolved.protocol !== "https:" && resolved.protocol !== "http:") {
      return match[2].startsWith("data:") ? match[2] : null;
    }
    return resolved.href;
  } catch {
    return null;
  }
}

/**
 * A rule is a STYLE rule if it has a selector. Nothing else classifies it.
 *
 * THE BUG THIS EXISTS TO PREVENT, because it was shipped and it was invisible.
 * The walk used to ask `if (rule.cssRules) { recurse; continue; }` — treating
 * a `cssRules` list as the mark of a grouping rule (`@media`, `@supports`).
 * That was true once. Since CSS Nesting shipped (Chrome 120, Firefox 117,
 * Safari 17.2) EVERY `CSSStyleRule` also carries a `cssRules` list for its
 * nested rules — usually empty, and an empty `CSSRuleList` is an object, so
 * always truthy. Every style rule in the document was therefore classified as
 * a grouping rule, recursed into, and its own declarations never read.
 *
 * Measured in the real page: 7071 rules seen, 0 matched, 0 custom
 * declarations collected — while a top-level `:root` block declaring 76 custom
 * properties sat right there. The snapshot went out with `vars: {}`, the shell
 * applied nothing, and the block rendered in the browser's defaults: black
 * text on the black page in dark mode.
 *
 * IT PASSED EVERY UNIT TEST, which is the part worth remembering. jsdom's
 * `CSSStyleRule` has no `cssRules` property at all, so the faulty branch was
 * never taken under test and the stub rules in this suite look nothing like a
 * real one. Hence `isStyleRule` and `isFontFaceRule` below: classification by
 * the property that actually distinguishes the two kinds, and stub rules in
 * the tests that carry an empty `cssRules` list the way a real one does.
 */
function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return typeof (rule as CSSStyleRule).selectorText === "string";
}

/**
 * A font face has declarations and NO selector.
 *
 * `instanceof CSSFontFaceRule` is not usable: jsdom does not expose the
 * constructor. The absence of a selector is what separates it from a style
 * rule that merely mentions `font-family`.
 */
function isFontFaceRule(rule: CSSRule): boolean {
  const style = (rule as CSSFontFaceRule).style;
  return !isStyleRule(rule) && Boolean(style) && typeof style.getPropertyValue === "function";
}

/**
 * Walk every readable rule, carrying the URL each one was declared in.
 *
 * THE BASE IS PER SHEET, NOT PER DOCUMENT, and that is defect D2. A `url()`
 * inside a stylesheet resolves against THAT STYLESHEET, never against the page
 * — which is ordinary CSS and was got wrong here. Resolving Next's font
 * `url(../media/x.woff2)` against a page at `/community/filecoin/notebooks/y`
 * produced `/community/filecoin/media/x.woff2`, a 404 on every face, and again
 * no error anyone would see: just a fallback typeface.
 *
 * `sheet.href` is null for an inline `<style>`, where the document's own base
 * IS the right answer — so the fallback is not a guess, it is the other half
 * of the rule.
 *
 * Cross-origin sheets throw a SecurityError on `.cssRules` rather than
 * returning nothing — Google Fonts' stylesheet is the obvious one — so each
 * sheet is tried on its own and a failure skips that sheet instead of
 * abandoning the whole walk.
 */
function walkStyleSheets(
  doc: Document,
  fallbackBase: string,
  visit: (rule: CSSRule, base: string) => void
): void {
  const descend = (rules: CSSRuleList, base: string) => {
    for (const rule of Array.from(rules)) {
      visit(rule, base);
      // Recurse UNCONDITIONALLY where there is anything to recurse into: a
      // grouping rule's children and a style rule's nested rules are read the
      // same way, so nothing has to be classified to decide whether to look.
      const nested = (rule as CSSGroupingRule).cssRules;
      if (nested && nested.length > 0) descend(nested, base);
    }
  };

  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      const own = (sheet as CSSStyleSheet).cssRules;
      if (own) descend(own, (sheet as CSSStyleSheet).href ?? fallbackBase);
    } catch {
      // Cross-origin. Nothing to read, nothing to report.
    }
  }
}

/**
 * The names of every custom property that could apply to `<html>`.
 *
 * MATCHED AGAINST THE ELEMENT, not against the string ":root". The app's font
 * variables are declared by next/font in generated class rules
 * (`.__variable_1a2b3c`) applied to `<html>`, and the dark palette lives under
 * `.dark` — a `:root`-only scan would miss both and the block would render in
 * the wrong palette with the wrong typeface. `element.matches(selector)` asks
 * the browser the question we actually mean: does this rule apply here.
 *
 * Only NAMES are collected. Values come from the computed style, so a name
 * found in a rule that is currently losing the cascade still resolves to the
 * winning value.
 */
function customPropertyNames(doc: Document, root: HTMLElement, base: string): string[] {
  const names = new Set<string>();

  walkStyleSheets(doc, base, (rule) => {
    if (!isStyleRule(rule) || !rule.style) return;

    let applies = false;
    try {
      applies = root.matches(rule.selectorText);
    } catch {
      // A selector this browser cannot parse in `matches` (`::selection`,
      // vendor-prefixed pseudo-classes, a nested rule's `&`). Not a rule that
      // declares our tokens; skip it rather than abandoning the sheet.
      return;
    }
    if (!applies) return;

    for (const name of Array.from(rule.style)) {
      if (name.startsWith("--")) names.add(name);
    }
  });

  // Properties set INLINE on <html>, which no stylesheet walk can see.
  //
  // Not hypothetical: a theme switch that writes a token straight onto the
  // element is a normal implementation, and the value would resolve perfectly
  // well in `getComputedStyle` while its NAME appeared in no rule anywhere. It
  // would be missing from the snapshot and from nothing else, which is about
  // the hardest version of this bug to find.
  for (const name of Array.from(root.style)) {
    if (name.startsWith("--")) names.add(name);
  }

  return Array.from(names);
}

/**
 * The `@font-face` rules the app declared, addressable from another origin.
 *
 * NOTE FOR ANYONE DEBUGGING A FALLBACK FONT IN THE BLOCK: the URLs here are on
 * the app origin and the shell is not, so the browser fetches them as a
 * cross-origin font request — which requires CORS on `/_next/static/media`,
 * granted in `next.config.ts`. Without that header this function still returns
 * a perfectly correct list and the fonts still silently do not load.
 */
export function notebookSandboxFontFaces(doc: Document, base: string): NotebookSandboxFontFace[] {
  const faces: NotebookSandboxFontFace[] = [];
  const seen = new Set<string>();

  walkStyleSheets(doc, base, (rule, sheetBase) => {
    if (!isFontFaceRule(rule)) return;
    const style = (rule as CSSFontFaceRule).style;

    const family = unquote(style.getPropertyValue("font-family"));
    const rawSrc = style.getPropertyValue("src");
    if (!family || !rawSrc) return;

    // Against the SHEET's URL, not the page's. See `walkStyleSheets`.
    const src = absoluteFontSource(rawSrc, sheetBase);
    if (!src) return;

    const weight = style.getPropertyValue("font-weight").trim() || undefined;
    const fontStyle = style.getPropertyValue("font-style").trim() || undefined;

    /**
     * ONE FACE PER FAMILY/WEIGHT/STYLE — the URL is deliberately NOT in the
     * key, and that is a trade rather than a tidy-up.
     *
     * next/font emits one `@font-face` per SUBSET: the same family, weight and
     * style, pointing at a latin file, a latin-ext file, a cyrillic file. Three
     * families of those came to 39 faces against a shell that accepts a bounded
     * number, and an over-long list is rejected WHOLE — so the page got no
     * theme at all rather than a partial one.
     *
     * Keeping the first face per family/weight/style keeps latin, which is
     * what these pages are written in, and loses the extended subsets: a
     * Cyrillic glyph inside a custom block falls back to a system face. That
     * is a visibly worse character in a rare case, against no theme at all in
     * every case.
     */
    const key = `${family}|${weight ?? ""}|${fontStyle ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);

    faces.push({ family, src, weight, style: fontStyle });
  });

  return faces;
}

/**
 * The families this page's `--font-*` tokens actually name, in priority order.
 *
 * WHY PRUNE AT ALL. A document declares every face any part of the app might
 * use; a custom block needs the ones its text will actually be set in, which
 * are precisely the families the theme tokens point at. Sending the rest costs
 * budget against the shell's cap and buys nothing.
 *
 * ORDER IS DELIBERATE AND DETERMINISTIC, because truncation makes order load-
 * bearing: whatever falls off the end is a family the block will not have. The
 * body font goes first — a block is mostly prose, so losing the display or
 * mono face is a smaller loss than losing the face the paragraphs are in — and
 * the rest follow in token-name order so two runs on one page cannot disagree
 * about what got cut.
 *
 * A token's value is a font-family LIST (`'__Inter_abc', '__Inter_Fallback_abc'`),
 * so each entry is split and unquoted. The fallback families next/font emits
 * are `local()`-sourced and drop out earlier for having no fetchable URL.
 */
export function notebookSandboxFontPriority(vars: Record<string, string>): string[] {
  const names = Object.keys(vars)
    .filter((name) => name.startsWith("--font-"))
    .sort((left, right) => {
      // The body font first. Named rather than inferred: `--font-inter` is
      // what `body` is set in, and a rule that guessed from computed styles
      // would be a second place for this decision to live.
      if (left === "--font-inter") return -1;
      if (right === "--font-inter") return 1;
      return left.localeCompare(right);
    });

  const families: string[] = [];
  for (const name of names) {
    for (const entry of vars[name].split(",")) {
      const family = unquote(entry);
      if (family && !families.includes(family)) families.push(family);
    }
  }
  return families;
}

/**
 * The faces worth sending, in the order they may be cut from.
 *
 * NO PRIORITY MEANS NO PRUNING, only truncation. A page with no `--font-*`
 * tokens is not a page whose fonts do not matter — it is a page this function
 * knows nothing about, and dropping every face on that basis would turn a
 * missing convention into a missing typeface. Truncation still applies,
 * because the cap is the shell's and is not negotiable.
 */
export function pruneNotebookSandboxFontFaces(
  faces: readonly NotebookSandboxFontFace[],
  priority: readonly string[],
  cap: number = CUSTOM_HTML_THEME_PORT_LIMITS.fontFaces
): NotebookSandboxFontFace[] {
  const ranked =
    priority.length === 0
      ? [...faces]
      : faces
          .filter((face) => priority.includes(face.family))
          // A stable sort by family rank: within one family the declaration
          // order is kept, so the weights a page uses most — which next/font
          // emits first — are the ones that survive a truncation.
          .map((face, index) => ({ face, index, rank: priority.indexOf(face.family) }))
          .sort((left, right) => left.rank - right.rank || left.index - right.index)
          .map((entry) => entry.face);

  return ranked.slice(0, Math.max(0, cap));
}

/**
 * Everything the shell needs to look like it is part of this page.
 *
 * Called on connect and again whenever the theme changes. It re-reads
 * everything each time rather than diffing: the whole snapshot is a few
 * kilobytes over a private port, and a diff would be a second representation
 * of the theme to get wrong for the sake of a saving nobody can measure.
 */
export function readNotebookSandboxTheme(
  doc: Document = document,
  base: string = doc.baseURI
): NotebookSandboxThemeSnapshot {
  const root = doc.documentElement;
  const computed = doc.defaultView?.getComputedStyle(root);

  const vars: Record<string, string> = {};
  if (computed) {
    for (const name of customPropertyNames(doc, root, base)) {
      const value = computed.getPropertyValue(name).trim();
      // An empty value is a property that resolves to nothing here. Sending it
      // would have the shell declare `--x: ;`, which is a valid declaration of
      // an empty token stream and shadows any default the shell might have.
      if (!value) continue;
      /**
       * Stop at the cap rather than sending a message that will be discarded.
       *
       * HEADROOM TODAY, NOT A LIVE CONSTRAINT — the app declares about 76 root
       * properties against a limit of 256. It is enforced anyway because the
       * failure it prevents is the silent one: exceeding the limit costs the
       * whole theme, not the surplus tokens, so "we are comfortably under it"
       * is a fact that has to keep being true rather than one to rely on.
       *
       * Truncation follows the walk, which is stylesheet order, so it is
       * stable across runs of one build and the palette declared at `:root`
       * survives ahead of anything a later sheet adds. If this ever does bite,
       * the answer is to rank the tokens, not to take a bigger slice.
       */
      if (Object.keys(vars).length >= CUSTOM_HTML_THEME_PORT_LIMITS.variables) break;
      vars[name] = value;
    }
  }

  // Faces are pruned against the tokens, so the vars have to be read first —
  // which is also the order the shell needs them declared in.
  const fontFaces = pruneNotebookSandboxFontFaces(
    notebookSandboxFontFaces(doc, base),
    notebookSandboxFontPriority(vars)
  );

  return { mode: notebookSandboxThemeMode(root), vars, fontFaces };
}
