#!/usr/bin/env node
/* eslint-disable */
// Quality Gate — collects metrics from biome/tsc/vitest/jscpd/knip/react-doctor,
// compares against quality-baseline.json, prints a markdown report, and exits
// non-zero on regression. See docs/quality-gate.md for the full design.

const fs = require("node:fs");
const path = require("node:path");
const { execSync, spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const BASELINE_PATH = path.join(ROOT, "quality-baseline.json");
const LIMITS_PATH = path.join(ROOT, "quality-limits.json");
const REPORT_DIR = path.join(ROOT, ".quality");
const REPORT_PATH = path.join(REPORT_DIR, "report.md");
const ARTIFACT_PATH = path.join(REPORT_DIR, "current.json");

const argv = new Set(process.argv.slice(2));

if (argv.has("--help") || argv.has("-h")) {
  process.stdout.write(
    `Quality Gate — runs lint/coverage/duplication/dead-code/size/react-doctor checks
and compares each metric against quality-baseline.json.

Usage: node scripts/quality-gate.js [options]

Options:
  --update-baseline   write current metrics to quality-baseline.json and exit 0
  --update-baseline=design
                      refresh ONLY violations.design (skips every other
                      collector); land it on a PR labelled quality-baseline
  --report-only       generate the markdown report but never exit non-zero
  --ci                also append the report to GITHUB_STEP_SUMMARY (auto on CI)
  --skip-biome        skip Biome lint diagnostics collection
  --skip-coverage     skip vitest coverage collection
  --skip-design       skip the design-system scan
  --skip-jscpd        skip jscpd duplication scan
  --skip-knip         skip knip dead-code / unused-deps scan
  --skip-react-doctor skip react-doctor health-score scan
  --skip-sizes        skip per-glob file size scan
  --help, -h          show this help

Outputs:
  .quality/report.md      — markdown report (also posted as PR comment in CI)
  .quality/current.json   — raw metrics snapshot

Exit codes:
  0  no regression vs baseline (or --update-baseline / --report-only)
  1  at least one metric regressed
`
  );
  process.exit(0);
}

// `--update-baseline` refreshes every metric; `--update-baseline=design`
// refreshes only violations.design, which is the only supported way to move
// the design snapshot (never hand-edit quality-baseline.json).
const UPDATE_BASELINE_SCOPES = new Set(["all", "design"]);

/**
 * Reads `--update-baseline[=<scope>]` out of argv. The bare flag (what
 * `pnpm quality:baseline` passes) means a full refresh; `=design` refreshes
 * only `violations.design`. Throws on an unknown scope rather than silently
 * refreshing everything.
 */
function parseUpdateBaselineScope(argvList) {
  const arg = argvList.find((a) => a === "--update-baseline" || a.startsWith("--update-baseline="));
  if (!arg) return null;
  const scope = arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : "all";
  if (!UPDATE_BASELINE_SCOPES.has(scope)) {
    throw new Error(
      `unknown --update-baseline scope "${scope}" (expected --update-baseline or --update-baseline=design)`
    );
  }
  return scope;
}

let updateBaselineScope = null;
try {
  updateBaselineScope = parseUpdateBaselineScope([...argv]);
} catch (err) {
  console.error(`[quality] ${err.message}`);
  process.exit(2);
}

// A scoped refresh only writes violations.design, so running the other
// collectors would cost ~10 minutes for numbers nobody reads.
const designOnly = updateBaselineScope === "design";

const FLAGS = {
  updateBaseline: updateBaselineScope !== null,
  updateBaselineScope,
  reportOnly: argv.has("--report-only"),
  ci: argv.has("--ci") || process.env.CI === "true",
  skip: {
    biome: designOnly || argv.has("--skip-biome"),
    typecheck: designOnly || argv.has("--skip-typecheck"),
    coverage: designOnly || argv.has("--skip-coverage"),
    design: argv.has("--skip-design"),
    jscpd: designOnly || argv.has("--skip-jscpd"),
    knip: designOnly || argv.has("--skip-knip"),
    reactDoctor: designOnly || argv.has("--skip-react-doctor"),
    sizes: designOnly || argv.has("--skip-sizes"),
  },
};

// Pinned react-doctor version. The reactDoctor section of
// quality-baseline.json is captured against this exact version — bump both in
// the same (quality-baseline-labelled) PR, never independently.
const REACT_DOCTOR_VERSION = "0.2.2";

// ── utils ───────────────────────────────────────────────────────────────────
const log = (...a) => console.log("[quality]", ...a);
const warn = (...a) => console.warn("[quality:warn]", ...a);

function tryReadJson(p, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function runCapture(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
    ...opts,
  });
  // spawnSync sets `error` (e.g. ENOENT) when the binary is missing. Surface
  // that explicitly so collectors don't silently report zero metrics.
  if (res.error) {
    warn(`failed to launch \`${cmd} ${args.join(" ")}\`: ${res.error.message}`);
  }
  return {
    stdout: res.stdout || "",
    stderr: res.stderr || "",
    status: res.status ?? 1,
    error: res.error ?? null,
  };
}

function commitSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
  } catch {
    return null;
  }
}

// ── collectors ──────────────────────────────────────────────────────────────

function collectCoverage() {
  if (FLAGS.skip.coverage) return null;
  const summaryPath = path.join(ROOT, "coverage", "coverage-summary.json");
  if (!fs.existsSync(summaryPath)) {
    warn(
      "coverage/coverage-summary.json not found — run pnpm test:coverage first; skipping coverage."
    );
    return null;
  }
  const summary = tryReadJson(summaryPath);
  const t = summary?.total;
  if (!t) return null;
  return {
    lines: t.lines?.pct ?? 0,
    statements: t.statements?.pct ?? 0,
    functions: t.functions?.pct ?? 0,
    branches: t.branches?.pct ?? 0,
  };
}

function collectBiome() {
  if (FLAGS.skip.biome) return null;
  log("biome check (json)…");
  // biome's `--reporter=json` writes a SARIF-ish structure; in 2.x it emits a
  // diagnostics list. We only need the count and per-rule grouping. Use
  // `--reporter=json` and tolerate non-zero exit (biome exits 1 when issues
  // exist, which is normal here).
  const res = runCapture("pnpm", ["exec", "biome", "check", "--reporter=json", "."]);
  let parsed = null;
  try {
    parsed = JSON.parse(res.stdout);
  } catch {
    // biome may print a summary line above the JSON; try to slice from the
    // first `{` to the last `}`.
    const start = res.stdout.indexOf("{");
    const end = res.stdout.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(res.stdout.slice(start, end + 1));
      } catch {
        /* noop */
      }
    }
  }
  if (!parsed) {
    warn("could not parse biome JSON output; biome violations will be 0.");
    return { total: 0, byRule: {} };
  }
  const diagnostics = parsed.diagnostics ?? [];
  const byRule = {};
  for (const d of diagnostics) {
    const rule = d.category ?? d.rule ?? "unknown";
    byRule[rule] = (byRule[rule] ?? 0) + 1;
  }
  return { total: diagnostics.length, byRule };
}

function collectJscpd() {
  if (FLAGS.skip.jscpd) return null;
  log("jscpd…");
  ensureDir(path.join(REPORT_DIR, "jscpd"));
  const res = runCapture("pnpm", ["exec", "jscpd", "."]);
  const jsonPath = path.join(REPORT_DIR, "jscpd", "jscpd-report.json");
  const report = tryReadJson(jsonPath);
  if (!report) {
    warn(
      `jscpd report not found at ${jsonPath} (exit ${res.status}); duplication metrics will be 0.`
    );
    return { percent: 0, fragments: 0 };
  }
  const stats = report.statistics?.total ?? {};
  return {
    percent: Number((stats.percentage ?? 0).toFixed(2)),
    fragments: stats.clones ?? 0,
  };
}

function collectKnip() {
  if (FLAGS.skip.knip) return null;
  log("knip…");
  const res = runCapture("pnpm", ["exec", "knip", "--reporter", "json", "--no-progress"]);
  let parsed = null;
  try {
    parsed = JSON.parse(res.stdout);
  } catch {
    const start = res.stdout.indexOf("{");
    const end = res.stdout.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(res.stdout.slice(start, end + 1));
      } catch {
        /* noop */
      }
    }
  }
  if (!parsed) {
    warn("could not parse knip JSON output; knip metrics will be 0.");
    return { unusedFiles: 0, unusedExports: 0, unusedTypes: 0, unusedDeps: 0, duplicates: 0 };
  }
  // Knip JSON shape: { files: string[], issues: Array<{file, dependencies[], devDependencies[], exports[], types[], duplicates[], ...}> }
  const unusedFiles = parsed.files?.length ?? 0;
  let unusedExports = 0;
  let unusedTypes = 0;
  let unusedDeps = 0;
  let duplicates = 0;
  for (const i of parsed.issues ?? []) {
    unusedExports += i.exports?.length ?? 0;
    unusedTypes += i.types?.length ?? 0;
    unusedDeps += (i.dependencies?.length ?? 0) + (i.devDependencies?.length ?? 0);
    duplicates += i.duplicates?.length ?? 0;
  }
  return { unusedFiles, unusedExports, unusedTypes, unusedDeps, duplicates };
}

function collectReactDoctor() {
  if (FLAGS.skip.reactDoctor) return null;
  log("react-doctor…");
  ensureDir(REPORT_DIR);
  const outPath = path.join(REPORT_DIR, "react-doctor.json");
  // react-doctor supports JSON output via --json flag.
  // Pin the version: `@latest` makes the gate non-deterministic — a new
  // react-doctor release silently re-categorizes findings and inflates the
  // error count, failing every PR with a regression that no PR introduced.
  // The baseline is captured against this exact version; bump both together.
  const res = runCapture("npx", ["-y", `react-doctor@${REACT_DOCTOR_VERSION}`, ".", "--json"], {
    shell: false,
  });
  let parsed = null;
  // Prefer stdout JSON, else any file it wrote.
  const start = res.stdout.indexOf("{");
  const end = res.stdout.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      parsed = JSON.parse(res.stdout.slice(start, end + 1));
    } catch {
      /* noop */
    }
  }
  if (!parsed) {
    warn(`could not parse react-doctor output (exit ${res.status}); skipping.`);
    return null;
  }
  try {
    fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2));
  } catch {
    /* noop */
  }
  const score = parsed.score ?? parsed.healthScore ?? 0;
  const findings = parsed.findings ?? parsed.diagnostics ?? [];
  let errors = 0;
  let warnings = 0;
  const byCategory = {};
  for (const f of findings) {
    const sev = (f.severity ?? f.level ?? "warning").toLowerCase();
    if (sev === "error") errors++;
    else warnings++;
    const cat = f.category ?? f.group ?? "uncategorized";
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }
  return { score, errors, warnings, byCategory };
}

// Repo-wide design-system snapshot (DEV-557). Per-PR enforcement lives in
// pr-checklist.yml and only looks at added lines; this counter gives the same
// regression-vs-snapshot guarantee as the biome/knip counters, no more.
function collectDesign() {
  if (FLAGS.skip.design) return null;
  log("design system…");
  const res = runCapture("node", [
    path.join("scripts", "check-design-system.js"),
    "--report",
    "--json",
  ]);
  // `--report` never exits non-zero on findings, so anything but 0 means the
  // checker itself failed. Reporting zeros here would silently erase the
  // whole metric, so fail loudly instead.
  if (res.status !== 0) {
    warn(`design checker exited ${res.status}; recording a collector failure.`);
    return { failed: true };
  }
  let parsed = null;
  try {
    parsed = JSON.parse(res.stdout);
  } catch {
    /* noop */
  }
  if (!parsed?.summary?.byRule) {
    warn("could not parse design checker JSON; recording a collector failure.");
    return { failed: true };
  }
  const byRule = parsed.summary.byRule;
  const total = Object.values(byRule).reduce((a, b) => a + b, 0);
  return { total, byRule };
}

/**
 * Returns a copy of `baseline` with only `violations.design` replaced. Used by
 * `--update-baseline=design` so a scoped refresh cannot silently move
 * coverage, duplication or the oversized-file list.
 */
function mergeDesignBaseline(baseline, design) {
  if (!design || design.failed) {
    throw new Error("refusing to write a failed design collector into the baseline");
  }
  return {
    ...baseline,
    violations: { ...(baseline.violations ?? {}), design },
  };
}

// A scoped update rewrites the whole file from the object it merged into, so
// an incomplete baseline would be silently promoted to the real one. `{}` is
// syntactically valid JSON and must not qualify (Rival R5, round 4).
const REQUIRED_BASELINE_SECTIONS = [
  "coverage",
  "duplication",
  "violations",
  "oversizedFiles",
  "reactDoctor",
];

function assertUsableBaseline(baseline, label) {
  if (baseline === null || typeof baseline !== "object" || Array.isArray(baseline)) {
    throw new Error(`${label} is not a baseline object — refusing a scoped update.`);
  }
  const missing = REQUIRED_BASELINE_SECTIONS.filter(
    (k) => baseline[k] === undefined || baseline[k] === null || typeof baseline[k] !== "object"
  );
  if (missing.length) {
    throw new Error(
      `${label} is missing required section(s): ${missing.join(", ")} — refusing a scoped update that would discard them. Fix the file, or run the full \`pnpm quality:baseline\`.`
    );
  }
  return baseline;
}

/**
 * Writes JSON through a temp file in the same directory and renames it into
 * place, so an interrupted or failing write can never leave a half-written
 * baseline behind. `deps.fs` is injectable so a real write failure is testable.
 */
function writeJsonAtomic(targetPath, contents, deps = {}) {
  const io = deps.fs ?? fs;
  const tmp = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.${process.pid}.tmp`
  );
  io.writeFileSync(tmp, contents);
  try {
    io.renameSync(tmp, targetPath);
  } catch (err) {
    try {
      io.unlinkSync(tmp);
    } catch {
      /* the temp file is already gone or unreachable */
    }
    throw err;
  }
}

/**
 * The whole scoped-update operation, with its filesystem and target path
 * injected so tests never touch the tracked baseline.
 */
function updateDesignBaseline({ baselinePath, design, fs: io = fs, label } = {}) {
  const name = label ?? path.relative(ROOT, baselinePath) ?? baselinePath;
  let parsed;
  try {
    parsed = JSON.parse(io.readFileSync(baselinePath, "utf8"));
  } catch {
    throw new Error(
      `${name} is missing or not valid JSON — refusing a scoped update that would discard every other metric. Fix the file, or run the full \`pnpm quality:baseline\`.`
    );
  }
  assertUsableBaseline(parsed, name);
  const next = mergeDesignBaseline(parsed, design);
  writeJsonAtomic(baselinePath, `${JSON.stringify(next, null, 2)}\n`, { fs: io });
  return next;
}

function collectFileSizes(limits) {
  if (FLAGS.skip.sizes) return null;
  log("scanning file sizes…");
  // Use git ls-files for fast, gitignore-aware enumeration.
  let files = [];
  try {
    files = execSync("git ls-files '*.ts' '*.tsx' '*.js' '*.jsx'", { cwd: ROOT })
      .toString()
      .split("\n")
      .filter(Boolean);
  } catch {
    return null;
  }
  const rules = limits.fileLimits ?? [];
  const offenders = {};
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    let stat;
    try {
      stat = fs.statSync(abs);
    } catch {
      continue;
    }
    const rule = rules.find(
      (r) => matchGlob(rel, r.glob) && !(r.exclude ?? []).some((g) => matchGlob(rel, g))
    );
    if (!rule) continue;
    const lines = countLines(abs);
    const bytes = stat.size;
    if (lines > rule.maxLines || bytes > rule.maxBytes) {
      offenders[rel] = { lines, bytes, maxLines: rule.maxLines, maxBytes: rule.maxBytes };
    }
  }
  return offenders;
}

function writeFileSafe(abs, contents) {
  try {
    fs.writeFileSync(abs, contents);
    return true;
  } catch (err) {
    warn(`failed to write ${path.relative(ROOT, abs)}: ${err.message}`);
    return false;
  }
}

function countLines(abs) {
  try {
    const buf = fs.readFileSync(abs);
    if (buf.length === 0) return 0;
    let count = 0;
    for (let i = 0; i < buf.length; i++) if (buf[i] === 10) count++;
    // Files without a trailing newline still have one logical last line.
    return buf[buf.length - 1] === 10 ? count : count + 1;
  } catch {
    return 0;
  }
}

function matchGlob(p, glob) {
  // Minimal glob: supports **, *, and {a,b,c} alternation. Sufficient for our needs.
  const pattern = glob
    .replace(/[.+^$()|[\]\\]/g, "\\$&")
    .replace(/\{([^}]+)\}/g, (_, alts) => `(${alts.split(",").join("|")})`)
    .replace(/\*\*\//g, "§§§DSLASH§§§")
    .replace(/\*\*/g, "§§§DOUBLESTAR§§§")
    .replace(/\*/g, "[^/]*")
    .replace(/§§§DSLASH§§§/g, "(?:.*/)?")
    .replace(/§§§DOUBLESTAR§§§/g, ".*");
  return new RegExp(`^${pattern}$`).test(p);
}

// ── compare ─────────────────────────────────────────────────────────────────

function compare(current, baseline) {
  const regressions = [];
  const improvements = [];
  const notes = [];

  // Coverage — lower is worse.
  if (current.coverage && baseline.coverage) {
    for (const k of ["lines", "statements", "functions", "branches"]) {
      const b = baseline.coverage[k] ?? 0;
      const c = current.coverage[k] ?? 0;
      const delta = +(c - b).toFixed(2);
      if (delta < -0.01)
        regressions.push(`Coverage.${k} ${b.toFixed(2)}% → ${c.toFixed(2)}% (${delta.toFixed(2)})`);
      else if (delta > 0.01) improvements.push(`Coverage.${k} +${delta.toFixed(2)}%`);
    }
  }

  // Duplication — higher is worse.
  if (current.duplication && baseline.duplication) {
    const delta = +(current.duplication.percent - baseline.duplication.percent).toFixed(2);
    if (delta > 0.01)
      regressions.push(
        `Duplication ${baseline.duplication.percent}% → ${current.duplication.percent}% (+${delta})`
      );
  }

  // Biome violations — higher is worse.
  if (current.violations && baseline.violations) {
    for (const k of [
      "biome",
      "knipUnusedFiles",
      "knipUnusedExports",
      "knipUnusedTypes",
      "knipUnusedDeps",
      "knipDuplicates",
    ]) {
      const b = baseline.violations[k] ?? 0;
      const c = current.violations[k] ?? 0;
      const delta = c - b;
      if (delta > 0) regressions.push(`${k} ${b} → ${c} (+${delta})`);
      else if (delta < 0) improvements.push(`${k} ${delta}`);
    }
  }

  // Design-system violations — one counter per rule, same semantics as biome.
  const currentDesign = current.violations?.design;
  if (currentDesign) {
    if (currentDesign.failed) {
      regressions.push(
        "design collector failed — no repo-wide design snapshot was produced (see the log)"
      );
    } else if (!baseline.violations?.design) {
      // An absent key means "never measured", not zero. Comparing against 0
      // would report every pre-existing violation as a brand-new regression
      // and fail the very PR that introduces the checker.
      notes.push(
        "design: no baseline yet — run pnpm quality --update-baseline=design on a PR labelled quality-baseline"
      );
    } else {
      const baseDesign = baseline.violations.design;
      const rules = new Set([
        ...Object.keys(baseDesign.byRule ?? {}),
        ...Object.keys(currentDesign.byRule ?? {}),
      ]);
      for (const k of [...rules].sort()) {
        const b = baseDesign.byRule?.[k] ?? 0;
        const c = currentDesign.byRule?.[k] ?? 0;
        const delta = c - b;
        if (delta > 0) regressions.push(`design.${k} ${b} → ${c} (+${delta})`);
        else if (delta < 0) improvements.push(`design.${k} ${delta}`);
      }
    }
  }

  // Oversized files — file already over limit must not grow.
  // Only line growth is enforced: byte counts flap with whitespace/formatting
  // changes (e.g. an unrelated reformat commit) and would generate noise.
  if (current.oversizedFiles) {
    const baseFiles = baseline.oversizedFiles ?? {};
    for (const [file, info] of Object.entries(current.oversizedFiles)) {
      const prev = baseFiles[file];
      if (prev) {
        if (info.lines > prev.lines) {
          regressions.push(
            `${file} grew from ${prev.lines} to ${info.lines} lines while already over the limit`
          );
        }
      } else {
        regressions.push(
          `${file} is over the limit (${info.lines} lines / ${info.bytes} bytes) and is not in the baseline`
        );
      }
    }
  }

  // React Doctor score — lower is worse.
  if (current.reactDoctor && baseline.reactDoctor) {
    const b = baseline.reactDoctor.score ?? 0;
    const c = current.reactDoctor.score ?? 0;
    if (c < b) regressions.push(`React Doctor health score ${b} → ${c} (-${b - c})`);
    for (const k of ["errors", "warnings"]) {
      const bv = baseline.reactDoctor[k] ?? 0;
      const cv = current.reactDoctor[k] ?? 0;
      if (cv > bv) regressions.push(`React Doctor ${k} ${bv} → ${cv} (+${cv - bv})`);
    }
  }

  return { regressions, improvements, notes };
}

// ── render ──────────────────────────────────────────────────────────────────

// Printed wherever a metric has never been captured. Never `0`, which would
// read as "measured, and it was zero".
const NOT_MEASURED = "not measured";

function pad(s, n) {
  s = String(s);
  return s + " ".repeat(Math.max(0, n - s.length));
}

function table(rows) {
  if (!rows.length) return "_(no data)_";
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
  const header = `| ${rows[0].map((c, i) => pad(c, widths[i])).join(" | ")} |`;
  const sep = `| ${widths.map((w) => "-".repeat(w)).join(" | ")} |`;
  const body = rows
    .slice(1)
    .map((r) => `| ${r.map((c, i) => pad(c, widths[i])).join(" | ")} |`)
    .join("\n");
  return [header, sep, body].join("\n");
}

function render({ status, current, baseline, regressions, improvements, notes = [] }) {
  const lines = [];
  lines.push("# Quality Gate");
  lines.push("");
  lines.push(`**Status:** ${status === "pass" ? "✅ Passed" : "❌ Failed"}`);
  lines.push("");

  if (current.coverage) {
    lines.push("## Coverage");
    lines.push("");
    const rows = [["Metric", "Baseline", "Current", "Δ"]];
    for (const k of ["lines", "statements", "functions", "branches"]) {
      const b = baseline.coverage?.[k] ?? 0;
      const c = current.coverage[k];
      const delta = +(c - b).toFixed(2);
      rows.push([cap(k), `${b.toFixed(2)}%`, `${c.toFixed(2)}%`, fmtDelta(delta, "%")]);
    }
    lines.push(table(rows));
    lines.push("");
  }

  if (current.duplication) {
    lines.push("## Duplication");
    lines.push("");
    const b = baseline.duplication ?? { percent: 0, fragments: 0 };
    const rows = [
      ["Metric", "Baseline", "Current", "Δ"],
      [
        "Percentage",
        `${b.percent}%`,
        `${current.duplication.percent}%`,
        fmtDelta(current.duplication.percent - b.percent, "%"),
      ],
      [
        "Fragments",
        b.fragments,
        current.duplication.fragments,
        fmtDelta(current.duplication.fragments - b.fragments),
      ],
    ];
    lines.push(table(rows));
    lines.push("");
  }

  if (current.violations) {
    lines.push("## Violations");
    lines.push("");
    const b = baseline.violations ?? {};
    const c = current.violations;
    const rows = [["Metric", "Baseline", "Current", "Δ"]];
    for (const k of [
      "biome",
      "knipUnusedFiles",
      "knipUnusedExports",
      "knipUnusedTypes",
      "knipUnusedDeps",
      "knipDuplicates",
    ]) {
      rows.push([labelFor(k), b[k] ?? 0, c[k] ?? 0, fmtDelta((c[k] ?? 0) - (b[k] ?? 0))]);
    }
    rows.push([
      "Oversized files",
      Object.keys(baseline.oversizedFiles ?? {}).length,
      Object.keys(current.oversizedFiles ?? {}).length,
      fmtDelta(
        Object.keys(current.oversizedFiles ?? {}).length -
          Object.keys(baseline.oversizedFiles ?? {}).length
      ),
    ]);
    const cd = c.design;
    // An absent baseline stays absent through rendering. Synthesising
    // `{ total: 0 }` here made the report contradict compare(), printing
    // thousands of "new" violations under a passing gate (Rival R4).
    const bd = b.design;
    if (cd) {
      rows.push([
        "Design system",
        bd ? (bd.total ?? 0) : NOT_MEASURED,
        cd.failed ? "collector failed" : (cd.total ?? 0),
        cd.failed || !bd ? "—" : fmtDelta((cd.total ?? 0) - (bd.total ?? 0)),
      ]);
    }
    lines.push(table(rows));
    lines.push("");

    if (cd && !cd.failed) {
      const rules = [
        ...new Set([...Object.keys(bd?.byRule ?? {}), ...Object.keys(cd.byRule ?? {})]),
      ].sort();
      if (rules.length) {
        lines.push("<details><summary>Design system by rule</summary>\n");
        const ruleRows = [["Rule", "Baseline", "Current", "Δ"]];
        for (const k of rules) {
          const cv = cd.byRule?.[k] ?? 0;
          if (!bd) {
            ruleRows.push([k, NOT_MEASURED, cv, "—"]);
            continue;
          }
          ruleRows.push([k, bd.byRule?.[k] ?? 0, cv, fmtDelta(cv - (bd.byRule?.[k] ?? 0))]);
        }
        lines.push(table(ruleRows));
        lines.push("\n</details>");
        lines.push("");
        if (!bd) {
          lines.push(
            "_No design baseline yet — run `pnpm quality --update-baseline=design` on a PR labelled `quality-baseline`._"
          );
          lines.push("");
        }
      }
    }
  }

  if (current.reactDoctor) {
    lines.push("## React Health");
    lines.push("");
    const b = baseline.reactDoctor ?? { score: 0, errors: 0, warnings: 0 };
    const c = current.reactDoctor;
    const rows = [
      ["Metric", "Baseline", "Current", "Δ"],
      ["Health score", b.score, c.score, fmtDelta(c.score - b.score)],
      ["Errors", b.errors, c.errors, fmtDelta(c.errors - b.errors)],
      ["Warnings", b.warnings, c.warnings, fmtDelta(c.warnings - b.warnings)],
    ];
    lines.push(table(rows));
    if (c.byCategory && Object.keys(c.byCategory).length) {
      lines.push("");
      lines.push("<details><summary>By category</summary>\n");
      for (const [k, v] of Object.entries(c.byCategory)) lines.push(`- **${k}**: ${v}`);
      lines.push("\n</details>");
    }
    lines.push("");
  }

  if (regressions.length) {
    lines.push("## Regressions");
    lines.push("");
    for (const r of regressions) lines.push(`- ${r}`);
    lines.push("");
  }

  if (improvements.length) {
    lines.push("## Improvements");
    lines.push("");
    for (const r of improvements) lines.push(`- ${r}`);
    lines.push("");
  }

  if (notes.length) {
    lines.push("## Notes");
    lines.push("");
    for (const r of notes) lines.push(`- ${r}`);
    lines.push("");
  }

  lines.push("---");
  lines.push(`_Generated by \`scripts/quality-gate.js\` on ${new Date().toISOString()}._`);
  return lines.join("\n");
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function labelFor(k) {
  return (
    {
      biome: "Biome violations",
      knipUnusedFiles: "Unused files",
      knipUnusedExports: "Unused exports",
      knipUnusedTypes: "Unused types",
      knipUnusedDeps: "Unused dependencies",
      knipDuplicates: "Duplicate exports",
    }[k] ?? k
  );
}

function fmtDelta(n, suffix = "") {
  if (Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${typeof n === "number" ? n.toFixed(n % 1 ? 2 : 0).replace(/\.00$/, "") : n}${suffix}`;
}

// ── main ────────────────────────────────────────────────────────────────────

function main() {
  ensureDir(REPORT_DIR);
  const limits = tryReadJson(LIMITS_PATH, { fileLimits: [] });
  // A scoped refresh MERGES into the existing baseline, so it must start from
  // a real one. Falling back to `{}` here would let a malformed or missing
  // file be replaced by a baseline holding nothing but violations.design
  // (Rival R5).
  // Read for comparison only; the scoped update re-reads and validates it.
  const baselineRaw = tryReadJson(BASELINE_PATH, null);
  const baseline = baselineRaw ?? {};

  const current = {
    generatedAt: new Date().toISOString(),
    generatedFromCommit: commitSha(),
    coverage: collectCoverage(),
    duplication: collectJscpd(),
    violations: {
      biome: collectBiome()?.total ?? 0,
      knipUnusedFiles: 0,
      knipUnusedExports: 0,
      knipUnusedTypes: 0,
      knipUnusedDeps: 0,
      knipDuplicates: 0,
      design: collectDesign(),
    },
    oversizedFiles: collectFileSizes(limits) ?? {},
    reactDoctor: collectReactDoctor(),
  };

  const knip = collectKnip();
  if (knip) {
    current.violations.knipUnusedFiles = knip.unusedFiles;
    current.violations.knipUnusedExports = knip.unusedExports;
    current.violations.knipUnusedTypes = knip.unusedTypes;
    current.violations.knipUnusedDeps = knip.unusedDeps;
    current.violations.knipDuplicates = knip.duplicates;
  }

  writeFileSafe(ARTIFACT_PATH, JSON.stringify(current, null, 2));

  if (FLAGS.updateBaselineScope === "design") {
    // Validation, merge and the atomic write all live in updateDesignBaseline,
    // so the tests exercise exactly the path this takes.
    try {
      updateDesignBaseline({ baselinePath: BASELINE_PATH, design: current.violations.design });
    } catch (err) {
      console.error(`[quality] ${err.message}`);
      process.exit(2);
    }
    log(`design baseline updated → ${path.relative(ROOT, BASELINE_PATH)}`);
    log("land this on a PR labelled `quality-baseline` — quality-gate.yml guards the file.");
    process.exit(0);
  }

  if (FLAGS.updateBaseline) {
    const next = {
      $schema: baseline.$schema ?? "./scripts/quality-baseline.schema.json",
      generatedAt: current.generatedAt,
      generatedFromCommit: current.generatedFromCommit,
      coverage: current.coverage ??
        baseline.coverage ?? { lines: 0, statements: 0, functions: 0, branches: 0 },
      duplication: current.duplication ?? baseline.duplication ?? { percent: 0, fragments: 0 },
      violations: current.violations,
      oversizedFiles: current.oversizedFiles,
      reactDoctor: current.reactDoctor ??
        baseline.reactDoctor ?? { score: 0, errors: 0, warnings: 0, byCategory: {} },
    };
    try {
      writeJsonAtomic(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
    } catch (err) {
      console.error(
        `[quality] could not write ${path.relative(ROOT, BASELINE_PATH)} (${err.message}) — the baseline is unchanged.`
      );
      process.exit(2);
    }
    log(`baseline updated → ${path.relative(ROOT, BASELINE_PATH)}`);
    process.exit(0);
  }

  const { regressions, improvements, notes } = compare(current, baseline);
  for (const n of notes) log(n);
  const status = regressions.length ? "fail" : "pass";
  const report = render({ status, current, baseline, regressions, improvements, notes });

  writeFileSafe(REPORT_PATH, report);
  process.stdout.write(report + "\n");

  if (FLAGS.ci && process.env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n");
    } catch {
      /* noop */
    }
  }

  if (status === "fail" && !FLAGS.reportOnly) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  compare,
  matchGlob,
  countLines,
  mergeDesignBaseline,
  assertUsableBaseline,
  updateDesignBaseline,
  writeJsonAtomic,
  render,
  parseUpdateBaselineScope,
};
