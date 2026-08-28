#!/usr/bin/env node
/* eslint-disable */
// Static design-system check (DEV-557).
//
// Parses every scannable source with the TypeScript parser (no type-check) and
// reports design-system deviations: raw colour literals, arbitrary Tailwind
// colour/scale values, inline style literals, `!important` overrides and raw
// interactive primitives. CSS/SCSS is scanned textually for colour literals.
//
// Plain CommonJS on purpose: it has to run from `.husky/pre-commit`, from the
// bash post-edit hook and from CI without ts-node. Only dependency is
// `typescript`, which is already a devDependency.
//
// See gap-app-v2/CLAUDE.md § "Design system enforcement" for the rule table.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const ts = require("typescript");

const DEFAULT_CONFIG_PATH = path.join(__dirname, "design-check.config.json");

// ── rule table ──────────────────────────────────────────────────────────────

const RULES = {
  DS000: { id: "DS000", name: "bad-waiver", severity: "error" },
  DS001: { id: "DS001", name: "arbitrary-color-class", severity: "error" },
  DS002: { id: "DS002", name: "raw-color-literal", severity: "error" },
  DS003: { id: "DS003", name: "inline-style-literal", severity: "error" },
  DS004: { id: "DS004", name: "important-prefix", severity: "error" },
  DS005: { id: "DS005", name: "raw-primitive", severity: "error" },
  DS006: { id: "DS006", name: "arbitrary-scale", severity: "warn" },
  DS007: { id: "DS007", name: "css-color-literal", severity: "error" },
};

// Tailwind utilities whose arbitrary value is a colour.
const COLOR_UTILS = new Set([
  "bg",
  "text",
  "border",
  "ring",
  "fill",
  "stroke",
  "from",
  "via",
  "to",
  "outline",
  "shadow",
  "accent",
  "caret",
  "decoration",
  "divide",
  "placeholder",
]);

// Tailwind utilities whose arbitrary value is a spacing/type scale step.
//
// Sizing utilities (w/h/min-*/max-*/size/basis/inset/top/right/bottom/left,
// translate) are deliberately NOT here: a layout dimension is legitimately
// arbitrary — it is driven by the content or the viewport, not by a design
// scale — and including them made 43 % of DS006 false positives (Tester D3).
const SCALE_UTILS = new Set([
  "p",
  "px",
  "py",
  "pt",
  "pr",
  "pb",
  "pl",
  "ps",
  "pe",
  "m",
  "mx",
  "my",
  "mt",
  "mr",
  "mb",
  "ml",
  "ms",
  "me",
  "gap",
  "gap-x",
  "gap-y",
  "space-x",
  "space-y",
  "text",
  "leading",
  "tracking",
  "indent",
  "rounded",
  "rounded-t",
  "rounded-r",
  "rounded-b",
  "rounded-l",
  "rounded-tl",
  "rounded-tr",
  "rounded-br",
  "rounded-bl",
]);

const RAW_PRIMITIVES = new Set(["button", "input", "select", "textarea"]);

// `style={{ … }}` keys that carry visual design decisions.
const STYLE_COLOR_KEYS = new Set([
  "color",
  "background",
  "backgroundColor",
  "backgroundImage",
  "border",
  "borderColor",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outline",
  "outlineColor",
  "fill",
  "stroke",
  "boxShadow",
  "textShadow",
  "caretColor",
  "accentColor",
  "textDecorationColor",
  "columnRuleColor",
]);
// The Tailwind utility that replaces each inline key, so the DS003 hint names
// something the reader can actually type.
const TAILWIND_EQUIVALENT = {
  color: "text-*",
  background: "bg-*",
  backgroundColor: "bg-*",
  backgroundImage: "bg-*",
  border: "border-*",
  borderColor: "border-*",
  borderTopColor: "border-t-*",
  borderRightColor: "border-r-*",
  borderBottomColor: "border-b-*",
  borderLeftColor: "border-l-*",
  outline: "outline-*",
  outlineColor: "outline-*",
  fill: "fill-*",
  stroke: "stroke-*",
  boxShadow: "shadow-*",
  textShadow: "drop-shadow-*",
  caretColor: "caret-*",
  accentColor: "accent-*",
  textDecorationColor: "decoration-*",
  columnRuleColor: "divide-*",
  fontSize: "text-*",
  fontFamily: "font-*",
};

const STYLE_SIZE_KEYS = new Set(["fontSize"]);
const STYLE_FONT_KEYS = new Set(["fontFamily"]);

const CSS_KEYWORDS = new Set([
  "none",
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
  "auto",
  "currentcolor",
  "transparent",
]);

const NAMED_COLORS = new Set([
  "aqua",
  "beige",
  "black",
  "blue",
  "brown",
  "coral",
  "crimson",
  "cyan",
  "fuchsia",
  "gold",
  "gray",
  "green",
  "grey",
  "indigo",
  "khaki",
  "lavender",
  "lime",
  "magenta",
  "maroon",
  "navy",
  "olive",
  "orange",
  "orchid",
  "pink",
  "plum",
  "purple",
  "red",
  "salmon",
  "silver",
  "tan",
  "teal",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "yellow",
]);

// ── small utilities ─────────────────────────────────────────────────────────

function toPosix(p) {
  return String(p).replace(/\\/g, "/");
}

const GLOB_CACHE = new Map();

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Minimal glob to RegExp: supports **, * and {a,b} alternation. */
function globToRegExp(glob) {
  const cached = GLOB_CACHE.get(glob);
  if (cached) return cached;
  let out = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*" && glob[i + 2] === "/") {
        out += "(?:.*/)?";
        i += 2;
      } else if (glob[i + 1] === "*") {
        out += ".*";
        i += 1;
      } else {
        out += "[^/]*";
      }
    } else if (c === "{") {
      const close = glob.indexOf("}", i);
      if (close === -1) {
        out += escapeRe(c);
        continue;
      }
      const alts = glob
        .slice(i + 1, close)
        .split(",")
        .map(escapeRe);
      out += `(?:${alts.join("|")})`;
      i = close;
    } else {
      out += escapeRe(c);
    }
  }
  const re = new RegExp(`^${out}$`);
  GLOB_CACHE.set(glob, re);
  return re;
}

function matchGlob(p, glob) {
  return globToRegExp(glob).test(p);
}

function matchesAny(file, globs) {
  return (globs || []).some((g) => matchGlob(file, g));
}

const SEVERITIES = new Set(["error", "warn"]);

/**
 * The `severity` block is a real policy knob, not decoration: it overrides the
 * built-in level per rule. Validate it at load so a typo fails closed instead
 * of silently doing nothing (Rival R7).
 */
function validateConfig(config, source) {
  const severity = config.severity;
  if (severity === undefined) return config;
  if (typeof severity !== "object" || severity === null || Array.isArray(severity)) {
    throw new FailClosed(`${source}: "severity" must be an object of rule id → "error" | "warn"`);
  }
  for (const [rule, level] of Object.entries(severity)) {
    if (!RULES[rule]) {
      throw new FailClosed(
        `${source}: "severity" names unknown rule \`${rule}\` (known: ${Object.keys(RULES).join(", ")})`
      );
    }
    if (!SEVERITIES.has(level)) {
      throw new FailClosed(
        `${source}: severity for ${rule} is \`${level}\`, expected "error" or "warn"`
      );
    }
  }
  return config;
}

function loadConfig(configPath) {
  const target = configPath || DEFAULT_CONFIG_PATH;
  let raw;
  try {
    raw = fs.readFileSync(target, "utf8");
  } catch (err) {
    throw new FailClosed(`cannot read design-check config ${target}: ${err.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new FailClosed(`design-check config ${target} is not valid JSON: ${err.message}`);
  }
  return validateConfig(parsed, path.relative(process.cwd(), target) || target);
}

/** Configured level for a rule, falling back to the built-in one. */
function severityFor(config, rule) {
  return config.severity?.[rule] ?? RULES[rule].severity;
}

function isScannable(file, config) {
  const rel = toPosix(file);
  if (matchesAny(rel, config.exclude)) return false;
  return matchesAny(rel, config.scanGlobs);
}

/** Maps byte offsets to 1-based line/column. */
function lineIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return {
    starts,
    at(offset) {
      let lo = 0;
      let hi = starts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (starts[mid] <= offset) lo = mid;
        else hi = mid - 1;
      }
      return { line: lo + 1, col: offset - starts[lo] + 1 };
    },
  };
}

// ── colour literal detection ────────────────────────────────────────────────

const HEX_RE = /#([0-9a-fA-F]{3,8})(?![0-9a-zA-Z_-])/g;
// No `\b` before the function name: Tailwind encodes spaces as `_`, so
// `shadow-[0_4px_6px_rgba(0,0,0,.1)]` puts a word character right before it.
const FUNC_COLOR_RE = /(?<![a-zA-Z0-9])(rgba?|hsla?|oklch|oklab)\(\s*[\d.+-]/g;
const VALID_HEX_LENGTHS = new Set([3, 4, 6, 8]);

/** All literal-colour matches inside `text`, as `{ start, end, value }`. */
function findColorLiterals(text) {
  const out = [];
  for (const m of text.matchAll(HEX_RE)) {
    if (!VALID_HEX_LENGTHS.has(m[1].length)) continue;
    // `url(#gradient)` / `url(#abc123)` reference SVG ids, not colours.
    if (/url\($/.test(text.slice(Math.max(0, m.index - 4), m.index))) continue;
    out.push({ start: m.index, end: m.index + m[0].length, value: m[0] });
  }
  for (const m of text.matchAll(FUNC_COLOR_RE)) {
    const close = matchingParen(text, m.index + m[1].length);
    const end = close === -1 ? m.index + m[0].length : close + 1;
    out.push({ start: m.index, end, value: text.slice(m.index, end) });
  }
  return out.sort((a, b) => a.start - b.start);
}

function hasLiteralColor(text) {
  return findColorLiterals(text).length > 0;
}

/** Index of the `)` closing the `(` at `openIdx`, or -1. */
function matchingParen(text, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Ranges covered by `var(…)` — token consumption, never a violation. */
function varRanges(text) {
  const ranges = [];
  for (const m of text.matchAll(/\bvar\(/g)) {
    const close = matchingParen(text, m.index + 3);
    ranges.push([m.index, close === -1 ? text.length : close + 1]);
  }
  return ranges;
}

/**
 * Membership test over a range list. Ranges are produced in ascending start
 * order everywhere they are built, so a binary search is safe and keeps a
 * pathological literal (N `var()` spans x N colour hits) linear rather than
 * quadratic (Rival R6). `sorted: false` falls back to a scan.
 */
/** Sorts a range list in place so inRanges() may binary-search it. */
function sortRanges(ranges) {
  ranges.sort((a, b) => a[0] - b[0]);
  return ranges;
}

function inRanges(pos, ranges, sorted = true) {
  if (!ranges || ranges.length === 0) return false;
  if (!sorted || ranges.length < 8) {
    return ranges.some(([s, e]) => pos >= s && pos < e);
  }
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [start, end] = ranges[mid];
    if (pos < start) hi = mid - 1;
    else if (pos >= end) lo = mid + 1;
    else return true;
  }
  return false;
}

// ── Tailwind candidate lexer ────────────────────────────────────────────────

/**
 * Splits a class-ish string into whitespace-delimited candidates, keeping the
 * offset of each so findings can point at the exact utility.
 */
function lexCandidates(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    while (i < text.length && /\s/.test(text[i])) i++;
    const start = i;
    while (i < text.length && !/\s/.test(text[i])) i++;
    if (i > start) out.push({ token: text.slice(start, i), start, end: i });
  }
  return out;
}

/** Splits `hover:dark:!bg-[#fff]/50` into its parts. */
function parseCandidate(token) {
  let depth = 0;
  let lastColon = -1;
  let opacityAt = -1;
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === "[" || c === "(") depth++;
    else if (c === "]" || c === ")") depth--;
    else if (c === ":" && depth === 0) lastColon = i;
    else if (c === "/" && depth === 0) opacityAt = i;
  }
  const utilStart = lastColon + 1;
  let util = token.slice(utilStart);
  let offset = utilStart;
  if (opacityAt > lastColon) util = token.slice(utilStart, opacityAt);
  let important = false;
  if (util.startsWith("!")) {
    // Any plausible utility after the `!` counts, including the no-dash
    // (`!flex`, `!underline`), negative (`!-mt-2`) and arbitrary-property
    // (`![color:red]`) forms. Requiring a dash missed `!flex`, `md:!absolute`
    // and `!underline`, all live in this repo (Rival R3). `"Hello!"` never
    // reaches here (the `!` is trailing) and a bare `"!"` leaves nothing.
    important = /^!-?(?:[a-z]|\[)/.test(util);
    util = util.slice(1);
    offset += 1;
  }
  const arbitrary = /^(-?)([a-z][a-zA-Z0-9-]*)-\[(.*)\]$/.exec(util);
  return {
    util,
    offset,
    important,
    prefix: arbitrary ? arbitrary[2] : null,
    value: arbitrary ? arbitrary[3] : null,
    valueOffset: arbitrary ? offset + arbitrary[0].indexOf("[") + 1 : -1,
  };
}

function colorUtil(prefix) {
  if (COLOR_UTILS.has(prefix)) return true;
  // `border-t-[…]`, `ring-offset-[…]`, `divide-y-[…]`, …
  return COLOR_UTILS.has(prefix.split("-")[0]);
}

function isNumericScale(value) {
  return /^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|vmin|vmax|ch|ex|pt)?$/.test(value);
}

// ── findings ────────────────────────────────────────────────────────────────

function makeFinding(rule, file, index, start, end, snippet, message, hint) {
  const a = index.at(start);
  const b = index.at(Math.max(start, end - 1));
  return {
    rule,
    severity: RULES[rule].severity,
    file,
    line: a.line,
    col: a.col,
    endLine: b.line,
    snippet: snippet.length > 120 ? `${snippet.slice(0, 117)}…` : snippet,
    message,
    hint: hint || null,
    waived: false,
    waiverLine: null,
    waiverReason: null,
    // Comma-joined, sorted set of rules the same waiver comment covers. The PR
    // body declares one line per waiver carrying this exact set.
    waiverRules: null,
    // Set only in diff modes: true when the waiver comment itself sits on an
    // added line, which is what makes a waiver reviewable in the PR body.
    waiverAdded: false,
  };
}

function hintFor(config, key) {
  if (!key) return null;
  return config.hints?.[key.toLowerCase()] ?? config.hints?.[key] ?? null;
}

// ── scanner ─────────────────────────────────────────────────────────────────

function scanText({ file, text, config }) {
  const rel = toPosix(file);
  const ext = path.extname(rel).toLowerCase();
  const index = lineIndex(text);
  const isStylesheet = ext === ".css" || ext === ".scss";
  const findings = isStylesheet
    ? scanStylesheet(rel, text, index, config)
    : scanScript(rel, text, index, config);
  // Collecting comment ranges costs a second parse of the file, so only pay it
  // when there is something to place: the overwhelming majority of files carry
  // no waiver at all. Without this guard a full-repo scan goes 3 s → 15 s.
  if (WAIVER_PHRASE_RE.test(text)) {
    const comments = isStylesheet
      ? cssCommentRanges(text, ext === ".scss")
      : scriptCommentRanges(rel, text);
    applyWaivers(rel, text, index, findings, comments);
  }
  // Apply the configured severities in one place rather than threading the
  // config through every makeFinding() call site.
  for (const f of findings) f.severity = severityFor(config, f.rule);
  return findings.sort((a, b) => a.line - b.line || a.col - b.col || a.rule.localeCompare(b.rule));
}

/**
 * Byte ranges of every comment in a TS/JS/TSX source, via the real parser.
 *
 * Waivers are only honoured inside comments — a string that merely contains
 * the phrase must not waive anything and must not raise DS000 either
 * (Tester D9). JSX `{/* … *\/}` shows up as a JsxExpression with no
 * expression, which the node walk below covers.
 */
function scriptCommentRanges(rel, text) {
  const ranges = [];
  const kind = rel.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.TSX;
  let sourceFile;
  try {
    sourceFile = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind);
  } catch {
    return ranges;
  }
  const add = (list) => {
    for (const r of list || []) ranges.push([r.pos, r.end]);
  };
  const visit = (node) => {
    add(ts.getLeadingCommentRanges(text, node.getFullStart()));
    add(ts.getTrailingCommentRanges(text, node.getEnd()));
    if (ts.isJsxExpression(node) && !node.expression) {
      ranges.push([node.getStart(sourceFile), node.getEnd()]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  add(ts.getLeadingCommentRanges(text, 0));
  return sortRanges(ranges);
}

/** Byte ranges of every comment in a stylesheet. */
function cssCommentRanges(text, isScss) {
  const ranges = [];
  for (const m of text.matchAll(/\/\*[\s\S]*?\*\//g)) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  if (isScss) {
    for (const m of text.matchAll(/(^|[^:])(\/\/[^\n]*)/g)) {
      const start = m.index + m[1].length;
      ranges.push([start, start + m[2].length]);
    }
  }
  return sortRanges(ranges);
}

// ── scanner: TS / JS / TSX ──────────────────────────────────────────────────

function scanScript(rel, text, index, config) {
  const findings = [];
  const isTokenFile = (config.tokenDefinitionFiles || []).includes(rel);
  // Files that define the spacing/type scale itself. Exempt from DS006 ONLY —
  // every colour and primitive rule still applies to them.
  const isScaleFile = (config.scaleDefinitionFiles || []).includes(rel);
  const isIconFile = matchesAny(rel, config.iconGlobs);
  const primitivesExempt = matchesAny(rel, config.primitiveExemptGlobs);
  // Satori (next/og, @vercel/og) renders with inline styles only — Tailwind
  // classes and CSS variables do not exist there, so DS003 would emit a hint
  // nobody can follow. Detected by glob AND by import, because OG routes live
  // under several conventions (app/api/**/route.tsx among them).
  let inlineStylesExempt = matchesAny(rel, config.inlineStyleExemptGlobs);

  const kind = rel.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.TSX;
  let sourceFile;
  try {
    sourceFile = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind);
  } catch {
    // A file the parser cannot handle is reported by tsc, not here.
    return findings;
  }

  if (!inlineStylesExempt) {
    const exemptImports = config.inlineStyleExemptImports || [];
    for (const st of sourceFile.statements) {
      if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
      if (exemptImports.includes(st.moduleSpecifier.text)) {
        inlineStylesExempt = true;
        break;
      }
    }
  }

  const literals = [];
  const styleObjectRanges = [];

  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (!primitivesExempt) collectPrimitive(node, rel, index, findings, config);
    }
    if (ts.isJsxAttribute(node) && node.name && node.name.getText() === "style") {
      const init = node.initializer;
      if (init && ts.isJsxExpression(init) && init.expression) {
        const expr = init.expression;
        if (ts.isObjectLiteralExpression(expr)) {
          // Still claimed for DS002 precedence even when DS003 is exempt: a
          // colour literal in an OG route's style object is intentional too.
          styleObjectRanges.push([expr.getStart(sourceFile), expr.getEnd()]);
          if (!inlineStylesExempt) collectInlineStyle(expr, rel, index, findings, config);
        }
      }
    }
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      node.kind === ts.SyntaxKind.TemplateHead ||
      node.kind === ts.SyntaxKind.TemplateMiddle ||
      node.kind === ts.SyntaxKind.TemplateTail
    ) {
      const closeLen =
        node.kind === ts.SyntaxKind.TemplateHead || node.kind === ts.SyntaxKind.TemplateMiddle
          ? 2
          : 1;
      const start = node.getStart(sourceFile) + 1;
      const end = node.getEnd() - closeLen;
      if (end > start) literals.push({ start, raw: text.slice(start, end) });
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);

  // DS001 / DS004 / DS006 / DS002 over every string-ish literal.
  const ds001Ranges = [];
  for (const lit of literals) {
    for (const cand of lexCandidates(lit.raw)) {
      const parsed = parseCandidate(cand.token);
      const tokenStart = lit.start + cand.start;

      if (parsed.important) {
        findings.push(
          makeFinding(
            "DS004",
            rel,
            index,
            tokenStart,
            lit.start + cand.end,
            cand.token,
            `\`!important\` override \`${cand.token}\` — fix the specificity instead of forcing it.`,
            null
          )
        );
      }
      if (isTokenFile || !parsed.prefix) continue;

      if (colorUtil(parsed.prefix) && hasLiteralColor(parsed.value)) {
        ds001Ranges.push([tokenStart, lit.start + cand.end]);
        const literalValue = findColorLiterals(parsed.value)[0]?.value ?? parsed.value;
        findings.push(
          makeFinding(
            "DS001",
            rel,
            index,
            tokenStart,
            lit.start + cand.end,
            cand.token,
            `Arbitrary colour \`${literalValue}\` in a Tailwind class — use a theme class or \`${parsed.prefix}-[rgb(var(--token))]\`.`,
            hintFor(config, literalValue)
          )
        );
        continue;
      }
      if (!isScaleFile && SCALE_UTILS.has(parsed.prefix) && isNumericScale(parsed.value)) {
        findings.push(
          makeFinding(
            "DS006",
            rel,
            index,
            tokenStart,
            lit.start + cand.end,
            cand.token,
            `Arbitrary scale value \`${parsed.value}\` — use a spacing/type step from tailwind.config.js.`,
            null
          )
        );
      }
    }
  }

  // DS002 runs as a second pass so both suppression lists are complete and can
  // be sorted once — inRanges() binary-searches them, which is what keeps a
  // literal with N var() spans and N colour hits linear instead of quadratic.
  if (!isTokenFile && !isIconFile) {
    sortRanges(ds001Ranges);
    sortRanges(styleObjectRanges);
    for (const lit of literals) {
      const vars = varRanges(lit.raw);
      for (const hit of findColorLiterals(lit.raw)) {
        const abs = lit.start + hit.start;
        if (inRanges(hit.start, vars)) continue;
        if (inRanges(abs, ds001Ranges)) continue;
        if (inRanges(abs, styleObjectRanges)) continue;
        findings.push(
          makeFinding(
            "DS002",
            rel,
            index,
            abs,
            lit.start + hit.end,
            hit.value,
            `Raw colour literal \`${hit.value}\` — use a theme class or a CSS variable.`,
            hintFor(config, hit.value)
          )
        );
      }
    }
  }

  return findings;
}

function collectPrimitive(node, rel, index, findings, config) {
  const tag = node.tagName;
  if (!ts.isIdentifier(tag)) return;
  const name = tag.getText();
  if (!RAW_PRIMITIVES.has(name)) return;
  if (name === "input" && typeAttrIs(node, "hidden")) return;
  findings.push(
    makeFinding(
      "DS005",
      rel,
      index,
      tag.getStart(),
      tag.getEnd(),
      `<${name}>`,
      `Raw \`<${name}>\` outside components/ui — use the shadcn primitive.`,
      hintFor(config, `<${name}>`)
    )
  );
}

function typeAttrIs(node, expected) {
  for (const attr of node.attributes.properties) {
    if (!ts.isJsxAttribute(attr) || attr.name.getText() !== "type") continue;
    const init = attr.initializer;
    if (init && ts.isStringLiteral(init)) return init.text === expected;
  }
  return false;
}

function collectInlineStyle(objectLiteral, rel, index, findings, config) {
  for (const prop of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const nameNode = prop.name;
    let key;
    if (ts.isIdentifier(nameNode)) key = nameNode.text;
    else if (ts.isStringLiteral(nameNode)) key = nameNode.text;
    else continue; // computed key — a custom property assignment
    if (key.startsWith("--")) continue;

    const value = prop.initializer;
    let literal = null;
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
      literal = value.text;
    else if (ts.isNumericLiteral(value)) literal = value.text;
    else continue; // identifier / call / template with substitutions

    const trimmed = literal.trim();
    if (!trimmed || CSS_KEYWORDS.has(trimmed.toLowerCase())) continue;
    if (varRanges(trimmed).length > 0) continue;

    let offending = null;
    if (STYLE_COLOR_KEYS.has(key)) {
      const hit = findColorLiterals(trimmed)[0];
      if (hit) offending = hit.value;
      else if (NAMED_COLORS.has(trimmed.toLowerCase())) offending = trimmed;
    } else if (STYLE_SIZE_KEYS.has(key)) {
      if (isNumericScale(trimmed)) offending = trimmed;
    } else if (STYLE_FONT_KEYS.has(key)) {
      offending = trimmed;
    }
    if (!offending) continue;

    findings.push(
      makeFinding(
        "DS003",
        rel,
        index,
        prop.getStart(),
        prop.getEnd(),
        prop.getText().replace(/\s+/g, " "),
        `Inline style \`${key}\` uses the literal \`${offending}\` — move it to a Tailwind theme class ` +
          `(\`${TAILWIND_EQUIVALENT[key] ?? "the matching utility"}\`) or read a token with ` +
          `\`${key}: "var(--token)"\`. next/og image routes are exempt and need no waiver.`,
        hintFor(config, offending)
      )
    );
  }
}

// ── scanner: CSS / SCSS ─────────────────────────────────────────────────────

/** Blanks comments while preserving offsets and line breaks. */
function stripCssComments(text, isScss) {
  let out = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  if (isScss) {
    out = out.replace(
      /(^|[^:])\/\/[^\n]*/g,
      (m, lead) => lead + " ".repeat(m.length - lead.length)
    );
  }
  return out;
}

function scanStylesheet(rel, text, index, config) {
  const findings = [];
  if ((config.tokenDefinitionFiles || []).includes(rel)) return findings;
  const body = stripCssComments(text, rel.endsWith(".scss"));
  const vars = varRanges(body);
  for (const hit of findColorLiterals(body)) {
    if (inRanges(hit.start, vars)) continue;
    // `#abc { … }` is an id selector, not a colour.
    if (hit.value.startsWith("#") && /^\s*\{/.test(body.slice(hit.end))) continue;
    findings.push(
      makeFinding(
        "DS007",
        rel,
        index,
        hit.start,
        hit.end,
        hit.value,
        `Colour literal \`${hit.value}\` in a stylesheet — declare it as a token and consume \`var(--token)\`.`,
        hintFor(config, hit.value)
      )
    );
  }
  return findings;
}

// ── waivers ─────────────────────────────────────────────────────────────────

// Case-insensitive: a waiver written DESIGN-CHECK-IGNORE must be recognised
// rather than silently ignored (Tester D8).
const WAIVER_RE = /design-check-ignore([^\n]*)/gi;
// Non-global twin: `.test()` on a /g regex is stateful and would skip files.
const WAIVER_PHRASE_RE = /design-check-ignore/i;

function applyWaivers(rel, text, index, findings, commentRanges = null) {
  const lines = text.split("\n");
  for (const m of text.matchAll(WAIVER_RE)) {
    // Only comments carry waivers. A string that happens to contain the phrase
    // is data: it waives nothing and must not raise DS000 either (Tester D9).
    if (commentRanges && !inRanges(m.index, commentRanges)) continue;

    const { line } = index.at(m.index);
    const tail = m[1]
      .replace(/-->\s*$/, "")
      .replace(/\*\/\s*\}?\s*$/, "")
      .replace(/\}\s*$/, "")
      .trim();
    const snippet = (lines[line - 1] ?? "").trim();
    const badWaiver = (message) =>
      findings.push(
        makeFinding("DS000", rel, index, m.index, m.index + m[0].length, snippet, message, null)
      );

    // One waiver may cover several rules on the same line — a candidate like
    // `!bg-[#123456]` is legitimately both DS004 and DS001. Rule ids are
    // matched case-insensitively and normalised to upper case.
    // Take the whole id-list region first, then validate it strictly. Matching
    // a well-formed prefix instead would let `DS001,,DS004` and `DS001,` waive
    // DS001 and silently swallow the malformed remainder into the reason
    // (Tester N2).
    const parsed = /^:\s*((?:DS\d{3}|[,\s])+)(.*)$/i.exec(tail);
    if (!parsed) {
      badWaiver(
        "Waiver is missing a rule id — write `design-check-ignore: DS00X[,DS00Y] <reason of at least 10 characters>`."
      );
      continue;
    }
    const [, ruleList, reason] = parsed;
    if (!/^\s*DS\d{3}(\s*,\s*DS\d{3})*\s*$/i.test(ruleList)) {
      badWaiver(
        /DS\d{3}/i.test(ruleList)
          ? `Waiver rule list \`${ruleList.trim()}\` is malformed — write comma-separated rule ids with no empty entries, e.g. \`DS001,DS004\`.`
          : "Waiver is missing a rule id — write `design-check-ignore: DS00X[,DS00Y] <reason of at least 10 characters>`."
      );
      continue;
    }
    const ruleIds = [...new Set(ruleList.split(",").map((r) => r.trim().toUpperCase()))];
    if (reason.trim().length < 10) {
      badWaiver(`Waiver for ${ruleIds.join(",")} needs a reason of at least 10 characters.`);
      continue;
    }

    const matched = [];
    for (const ruleId of ruleIds) {
      // EVERY finding of that rule on the next line, not just the first —
      // `className="bg-[#555555] text-[#666666]"` is two DS001s and one
      // waiver above it has to cover both (Tester D7).
      const targets = findings.filter(
        (f) => f.rule === ruleId && f.line === line + 1 && !f.waived && f.rule !== "DS000"
      );
      // Every listed id must land on something, or the waiver is over-broad.
      if (!targets.length) {
        badWaiver(`Orphan waiver: no ${ruleId} finding on the next line.`);
        continue;
      }
      for (const target of targets) {
        target.waived = true;
        target.waiverLine = line;
        target.waiverReason = reason.trim();
        matched.push(target);
      }
    }

    // The comma-joined set the PR body must declare, on one line for the whole
    // waiver rather than one line per rule. Sorted so it is order-independent.
    const waiverRules = [...new Set(matched.map((f) => f.rule))].sort().join(",");
    for (const f of matched) f.waiverRules = waiverRules;
  }
}

// ── diff parsing ────────────────────────────────────────────────────────────

/** Unquotes git's C-style quoted paths (`"a/caf\303\251.tsx"`). */
function unquotePath(raw) {
  if (!raw.startsWith('"')) return raw;
  const body = raw.slice(1, -1);
  const bytes = [];
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== "\\") {
      bytes.push(body.charCodeAt(i));
      continue;
    }
    const next = body[++i];
    const octal = /[0-7]/.test(next) ? body.substr(i, 3) : null;
    if (octal && /^[0-7]{3}$/.test(octal)) {
      bytes.push(parseInt(octal, 8));
      i += 2;
      continue;
    }
    const map = { n: 10, t: 9, r: 13, '"': 34, "\\": 92 };
    bytes.push(map[next] ?? next.charCodeAt(0));
  }
  return Buffer.from(bytes).toString("utf8");
}

function stripPrefix(p) {
  return p.replace(/^[ab]\//, "");
}

/**
 * Parses `git diff -U0` output into `path → Set<addedLineNumber>`. Deletions
 * are skipped; renames are keyed by their new path; a pure rename yields an
 * empty set so it can never block.
 */
function parseDiff(diffText) {
  const files = new Map();
  if (!diffText) return files;
  const lines = diffText.split("\n");
  let current = null;
  let pendingRename = null;

  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (line.startsWith("diff --git ")) {
      current = null;
      pendingRename = null;
      continue;
    }
    if (line.startsWith("rename to ")) {
      pendingRename = toPosix(unquotePath(line.slice("rename to ".length).trim()));
      if (!files.has(pendingRename)) files.set(pendingRename, new Set());
      current = pendingRename;
      continue;
    }
    if (line.startsWith("+++ ")) {
      const target = line.slice(4).trim();
      if (target === "/dev/null") {
        current = null;
        continue;
      }
      const file = toPosix(stripPrefix(unquotePath(target)));
      if (!files.has(file)) files.set(file, new Set());
      current = file;
      continue;
    }
    if (line.startsWith("@@") && current) {
      const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (!hunk) continue;
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      const set = files.get(current);
      for (let i = 0; i < count; i++) set.add(start + i);
    }
  }
  return files;
}

function filterByAddedLines(findings, added) {
  if (!added) return findings;
  return findings.filter((f) => {
    f.waiverAdded = f.waiverLine !== null && added.has(f.waiverLine);
    for (let l = f.line; l <= f.endLine; l++) if (added.has(l)) return true;
    return f.waiverAdded;
  });
}

// ── git helpers ─────────────────────────────────────────────────────────────

class FailClosed extends Error {}

function git(root, args) {
  const res = spawnSync("git", ["-c", "core.quotepath=false", ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 256,
  });
  if (res.error) throw new FailClosed(`git ${args[0]} failed to launch: ${res.error.message}`);
  return { status: res.status ?? 1, stdout: res.stdout || "", stderr: res.stderr || "" };
}

function gitOrFail(root, args, what) {
  const res = git(root, args);
  if (res.status !== 0) {
    throw new FailClosed(
      `${what}: git ${args.join(" ")} exited ${res.status}\n${res.stderr.trim()}`
    );
  }
  return res.stdout;
}

function listTrackedFiles(root, config) {
  const res = git(root, ["ls-files", "-z"]);
  if (res.status !== 0) throw new FailClosed("could not enumerate tracked files");
  return res.stdout
    .split("\0")
    .filter(Boolean)
    .map(toPosix)
    .filter((f) => isScannable(f, config));
}

// ── modes ───────────────────────────────────────────────────────────────────

function readIfExists(abs) {
  try {
    return fs.readFileSync(abs, "utf8");
  } catch {
    return null;
  }
}

/**
 * Reads the revision of `file` the current mode's line numbers refer to.
 *
 * This has to match the tree the diff was taken against or hunk ranges land on
 * the wrong text: `git diff --cached` compares HEAD to the **index**, so
 * `--staged` must read the index blob, not the working copy the developer has
 * kept editing. `--changed` diffs commits, so it reads HEAD.
 */
function revisionSpec(file, source) {
  return source === "index" ? `:${file}` : `HEAD:${file}`;
}

/**
 * Reads many blobs in ONE `git cat-file --batch` instead of spawning a process
 * per file (Rival R6). Returns `path → contents`; a path missing from the tree
 * is simply absent from the map.
 */
function readRevisions(root, files, source) {
  const out = new Map();
  if (!files.length) return out;
  const res = spawnSync("git", ["-c", "core.quotepath=false", "cat-file", "--batch"], {
    cwd: root,
    input: `${files.map((f) => revisionSpec(f, source)).join("\n")}\n`,
    // No `encoding`: stdout must stay a Buffer because the batch protocol is
    // byte-counted, and a blob may hold multi-byte characters.
    maxBuffer: 1024 * 1024 * 512,
  });
  if (res.error) throw new FailClosed(`git cat-file failed to launch: ${res.error.message}`);
  const buf = res.stdout || Buffer.alloc(0);

  let cursor = 0;
  for (const file of files) {
    const nl = buf.indexOf(0x0a, cursor);
    if (nl === -1) break;
    const header = buf.toString("utf8", cursor, nl);
    // "<sha> <type> <size>" for a hit, "<spec> missing" otherwise.
    const parts = header.split(" ");
    if (parts[parts.length - 1] === "missing") {
      cursor = nl + 1;
      continue;
    }
    const size = Number(parts[2]);
    if (!Number.isFinite(size)) break;
    const start = nl + 1;
    out.set(file, buf.toString("utf8", start, start + size));
    cursor = start + size + 1; // trailing newline after the blob
  }
  return out;
}

// A single source file this large is not hand-written product code; parsing it
// would let one PR burn the whole CI runner. Fail closed and name the path.
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
// Emitting hundreds of thousands of findings would blow the JSON and the PR
// comment. The cap applies to the DISPLAYED list only — every count, and the
// blocking decision, is computed from the complete set first (Rival R6).
const MAX_FINDINGS_PER_FILE = 500;

function scanFiles(root, config, entries, source = "worktree") {
  const findings = [];
  const scannable = entries.filter(({ file }) => isScannable(file, config));
  const blobs =
    source === "worktree"
      ? null
      : readRevisions(
          root,
          scannable.map((e) => e.file),
          source
        );

  for (const { file, added } of scannable) {
    const text = blobs ? (blobs.get(file) ?? null) : readIfExists(path.join(root, file));
    if (text === null) continue;
    if (Buffer.byteLength(text, "utf8") > MAX_SOURCE_BYTES) {
      throw new FailClosed(
        `${file} is larger than ${MAX_SOURCE_BYTES} bytes — refusing to scan it rather than stall the run`
      );
    }
    findings.push(...filterByAddedLines(scanText({ file, text, config }), added));
  }
  return findings;
}

function sortFindings(findings) {
  return findings.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.col - b.col ||
      a.rule.localeCompare(b.rule)
  );
}

/**
 * Caps the list shown to a human or JSON consumer at `perFileCap` findings per
 * file, keeping errors first and waived findings next so the entries that
 * decide the outcome are never the ones dropped.
 *
 * Truncation happens AFTER summarize(): dropping findings first let 500
 * leading warnings hide a later error and turn a failing run into a pass.
 */
function truncateForDisplay(findings, perFileCap = MAX_FINDINGS_PER_FILE) {
  const byFile = new Map();
  for (const f of findings) {
    const list = byFile.get(f.file);
    if (list) list.push(f);
    else byFile.set(f.file, [f]);
  }

  const shown = [];
  let truncated = 0;
  const importance = (f) => (f.waived ? 1 : f.severity === "error" ? 0 : 2);
  for (const list of byFile.values()) {
    if (list.length <= perFileCap) {
      shown.push(...list);
      continue;
    }
    const kept = [...list]
      .sort((a, b) => importance(a) - importance(b) || a.line - b.line || a.col - b.col)
      .slice(0, perFileCap);
    truncated += list.length - kept.length;
    shown.push(...kept);
  }
  return { shown: sortFindings(shown), truncated };
}

function relativeToRoot(root, file) {
  const posixFile = toPosix(file);
  if (!path.isAbsolute(posixFile)) return posixFile;
  return toPosix(path.relative(root, posixFile));
}

function collectChanged(root, base) {
  if (!base) throw new FailClosed("--changed requires --base <sha>");
  const resolved = git(root, ["rev-parse", "--verify", "--quiet", `${base}^{commit}`]);
  if (resolved.status !== 0 || !resolved.stdout.trim()) {
    throw new FailClosed(`base commit \`${base}\` does not resolve — fetch it before running`);
  }
  const mergeBase = git(root, ["merge-base", base, "HEAD"]);
  if (mergeBase.status !== 0 || !mergeBase.stdout.trim()) {
    throw new FailClosed(`no merge base between \`${base}\` and HEAD — history is incomplete`);
  }
  // Three-dot: compare HEAD against merge-base(base, HEAD) so an advanced base
  // branch never drags unrelated changes into the diff.
  const diff = gitOrFail(
    root,
    ["diff", "--find-renames", "--no-color", "-U0", `${base}...HEAD`],
    "collecting the PR diff"
  );
  return parseDiff(diff);
}

function collectStaged(root) {
  const diff = gitOrFail(
    root,
    ["diff", "--cached", "--find-renames", "--no-color", "-U0"],
    "collecting the staged diff"
  );
  return parseDiff(diff);
}

function collectWorktree(root, files) {
  const map = new Map();
  for (const raw of files) {
    const file = relativeToRoot(root, raw);
    const tracked = git(root, ["ls-files", "--error-unmatch", "--", file]).status === 0;
    if (!tracked) {
      const text = readIfExists(path.join(root, file));
      if (text === null) continue;
      const total = text.split("\n").length;
      map.set(file, new Set(Array.from({ length: total }, (_, i) => i + 1)));
      continue;
    }
    const diff = gitOrFail(
      root,
      ["diff", "--no-color", "-U0", "HEAD", "--", file],
      "collecting the worktree diff"
    );
    const parsed = parseDiff(diff);
    map.set(file, parsed.get(file) ?? new Set());
  }
  return map;
}

// ── reporting ───────────────────────────────────────────────────────────────

function summarize(findings) {
  const summary = { error: 0, warn: 0, waived: 0, byRule: {} };
  for (const f of findings) {
    if (f.waived) {
      summary.waived++;
      continue;
    }
    if (f.severity === "error") summary.error++;
    else summary.warn++;
    summary.byRule[f.rule] = (summary.byRule[f.rule] ?? 0) + 1;
  }
  return summary;
}

function renderTable(findings, summary, mode, truncated = 0) {
  if (!findings.length) {
    return `[design] ${mode}: no design-system findings.`;
  }
  const lines = [];
  const rows = findings.map((f) => [
    `${f.file}:${f.line}:${f.col}`,
    f.rule,
    f.waived ? "waived" : f.severity,
    f.message,
  ]);
  const widths = [0, 1, 2].map((i) => Math.max(...rows.map((r) => r[i].length)));
  rows.forEach((r, i) => {
    lines.push(
      `${r[0].padEnd(widths[0])}  ${r[1].padEnd(widths[1])}  ${r[2].padEnd(widths[2])}  ${r[3]}`
    );
    const hint = findings[i].hint;
    if (hint) lines.push(`${" ".repeat(widths[0])}  ${" ".repeat(widths[1])}  → ${hint}`);
  });
  lines.push("");
  if (truncated > 0) {
    lines.push(
      `[design] ${truncated} finding(s) hidden from this listing (cap ${MAX_FINDINGS_PER_FILE} per file); the counts below cover all of them.`
    );
  }
  lines.push(
    `[design] ${mode}: ${summary.error} error(s), ${summary.warn} warning(s), ${summary.waived} waived.`
  );
  return lines.join("\n");
}

const HELP = `Static design-system check (DEV-557).

Usage: node scripts/check-design-system.js [mode] [options]

Modes (added-lines semantics are identical everywhere):
  (default)                 scan every tracked, scannable file
  --changed --base <sha>    findings on lines added by \`<sha>...HEAD\` (three-dot)
  --staged                  findings on lines added in the index
  --worktree <file...>      findings on lines added vs HEAD (untracked ⇒ whole file)
  --files <file...>         whole-file scan, report-only (debugging aid)

Options:
  --report                  never exit 1, whatever is found
  --json                    machine-readable envelope on stdout
  --root <dir>              repository root (default: the script's parent)
  --config <path>           override scripts/design-check.config.json
  --help, -h                show this help

Exit codes:
  0  no blocking findings (or --report / --files)
  1  at least one error-severity finding on an added line
  2  fail closed — unresolvable base, no merge base, or a crash
`;

// ── main ────────────────────────────────────────────────────────────────────

function parseArgv(argv) {
  const opts = {
    mode: "full",
    base: null,
    files: [],
    report: false,
    json: false,
    root: path.resolve(__dirname, ".."),
    config: null,
    help: false,
  };
  let collecting = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg === "--report") opts.report = true;
    else if (arg === "--json") opts.json = true;
    else if (arg === "--changed") opts.mode = "changed";
    else if (arg === "--staged") opts.mode = "staged";
    else if (arg === "--worktree") {
      opts.mode = "worktree";
      collecting = "files";
    } else if (arg === "--files") {
      opts.mode = "files";
      collecting = "files";
    } else if (arg === "--base") {
      opts.base = argv[++i] ?? null;
      collecting = null;
    } else if (arg === "--root") {
      opts.root = path.resolve(argv[++i] ?? ".");
      collecting = null;
    } else if (arg === "--config") {
      opts.config = argv[++i] ?? null;
      collecting = null;
    } else if (arg.startsWith("--")) throw new FailClosed(`unknown option \`${arg}\``);
    else if (collecting === "files") opts.files.push(arg);
    else throw new FailClosed(`unexpected argument \`${arg}\``);
  }
  return opts;
}

function run(argv) {
  const opts = parseArgv(argv);
  if (opts.help) {
    process.stdout.write(HELP);
    return 0;
  }
  const config = loadConfig(opts.config);
  const root = opts.root;

  let findings;
  if (opts.mode === "full") {
    findings = scanFiles(
      root,
      config,
      listTrackedFiles(root, config).map((file) => ({ file, added: null }))
    );
  } else if (opts.mode === "files") {
    findings = scanFiles(
      root,
      config,
      opts.files.map((f) => ({ file: relativeToRoot(root, f), added: null }))
    );
  } else {
    const map =
      opts.mode === "changed"
        ? collectChanged(root, opts.base)
        : opts.mode === "staged"
          ? collectStaged(root)
          : collectWorktree(root, opts.files);
    // Content must come from the same tree the hunk ranges were computed
    // against — see readRevision().
    const source = opts.mode === "changed" ? "head" : opts.mode === "staged" ? "index" : "worktree";
    findings = scanFiles(
      root,
      config,
      [...map.entries()].map(([file, added]) => ({ file, added })),
      source
    );
  }

  sortFindings(findings);
  // Counts and the exit decision come from EVERY finding; only the list we
  // print or serialise is capped.
  const summary = summarize(findings);
  const { shown, truncated } = truncateForDisplay(findings);
  // `waivers` is NEVER capped. The PR-body validator has to see every waiver a
  // PR adds, and reading them out of the truncated `findings` list meant the
  // 501st waiver in a file was silently never checked (Rival R6b).
  const waivers = findings.filter((f) => f.waived);
  const envelope = { mode: opts.mode, base: opts.base, summary, findings: shown, waivers };
  if (truncated > 0) envelope.truncated = truncated;

  process.stdout.write(
    opts.json
      ? `${JSON.stringify(envelope, null, 2)}\n`
      : `${renderTable(shown, summary, opts.mode, truncated)}\n`
  );

  if (opts.report || opts.mode === "files") return 0;
  return summary.error > 0 ? 1 : 0;
}

function main() {
  try {
    process.exit(run(process.argv.slice(2)));
  } catch (err) {
    process.stderr.write(`[design] failed closed: ${err.message}\n`);
    if (!(err instanceof FailClosed) && err.stack) process.stderr.write(`${err.stack}\n`);
    process.exit(2);
  }
}

if (require.main === module) main();

module.exports = {
  RULES,
  filterByAddedLines,
  inRanges,
  isScannable,
  lexCandidates,
  loadConfig,
  matchGlob,
  parseCandidate,
  parseDiff,
  run,
  sortFindings,
  truncateForDisplay,
  scanText,
  summarize,
  toPosix,
  unquotePath,
};
