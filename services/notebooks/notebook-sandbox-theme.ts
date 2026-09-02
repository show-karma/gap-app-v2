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
 * Every stylesheet this document can actually read.
 *
 * Cross-origin sheets throw a SecurityError on `.cssRules` rather than
 * returning nothing — Google Fonts' stylesheet is the obvious one — so each
 * sheet is tried on its own and a failure skips that sheet instead of
 * abandoning the whole walk. Getting this wrong means one third-party
 * stylesheet silently costs us every font and every token.
 */
function readableRules(doc: Document): CSSRule[] {
  const rules: CSSRule[] = [];
  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      const own = (sheet as CSSStyleSheet).cssRules;
      if (own) rules.push(...Array.from(own));
    } catch {
      // Cross-origin. Nothing to read, nothing to report.
    }
  }
  return rules;
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
function customPropertyNames(doc: Document, root: HTMLElement): string[] {
  const names = new Set<string>();

  const visit = (rules: CSSRule[]) => {
    for (const rule of rules) {
      // Media and supports blocks hold the rules that actually declare things
      // — a `@media (prefers-color-scheme: dark)` block is a normal place for
      // a palette to live, and a flat walk would never see inside it.
      const nested = (rule as CSSGroupingRule).cssRules;
      if (nested) {
        visit(Array.from(nested));
        continue;
      }

      const style = rule as CSSStyleRule;
      const selector = style.selectorText;
      if (typeof selector !== "string" || !style.style) continue;

      let applies = false;
      try {
        applies = root.matches(selector);
      } catch {
        // A selector this browser cannot parse in `matches` (`::selection`,
        // vendor-prefixed pseudo-classes). Not a rule that declares our
        // tokens; skip it rather than abandoning the sheet.
        continue;
      }
      if (!applies) continue;

      for (const name of Array.from(style.style)) {
        if (name.startsWith("--")) names.add(name);
      }
    }
  };

  visit(readableRules(doc));

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

  const visit = (rules: CSSRule[]) => {
    for (const rule of rules) {
      const nested = (rule as CSSGroupingRule).cssRules;
      if (nested) {
        visit(Array.from(nested));
        continue;
      }

      const style = (rule as CSSFontFaceRule).style;
      // `instanceof CSSFontFaceRule` is not usable here: jsdom does not expose
      // the constructor, and a `rule.type` comparison is deprecated. A rule
      // carrying both a family and a src IS a font face, whatever it is called.
      if (!style || typeof style.getPropertyValue !== "function") continue;
      const family = unquote(style.getPropertyValue("font-family"));
      const rawSrc = style.getPropertyValue("src");
      if (!family || !rawSrc) continue;

      const src = absoluteFontSource(rawSrc, base);
      if (!src) continue;

      const weight = style.getPropertyValue("font-weight").trim() || undefined;
      const fontStyle = style.getPropertyValue("font-style").trim() || undefined;

      // One face per family/weight/style/url. Next emits the same face into
      // more than one sheet in development, and a shell redeclaring the same
      // face five times is five identical fetches.
      const key = `${family}|${weight ?? ""}|${fontStyle ?? ""}|${src}`;
      if (seen.has(key)) continue;
      seen.add(key);

      faces.push({ family, src, weight, style: fontStyle });
    }
  };

  visit(readableRules(doc));
  return faces;
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
    for (const name of customPropertyNames(doc, root)) {
      const value = computed.getPropertyValue(name).trim();
      // An empty value is a property that resolves to nothing here. Sending it
      // would have the shell declare `--x: ;`, which is a valid declaration of
      // an empty token stream and shadows any default the shell might have.
      if (value) vars[name] = value;
    }
  }

  return {
    mode: notebookSandboxThemeMode(root),
    vars,
    fontFaces: notebookSandboxFontFaces(doc, base),
  };
}
