/**
 * MANUAL-ONLY sitemap content crawl. This hits PRODUCTION and is deliberately
 * not wired into any CI workflow — only its no-network unit tests are.
 *
 *   node scripts/crawl-sitemap.mjs --output artifacts/sitemap-crawl-report.json
 *
 * Import-safe: running the file directly executes the crawl; importing it (e.g.
 * from tests) only exposes parseArgs/main without side effects.
 *
 * Precedence: flags > CRAWL_* env > built-in defaults.
 */
import {
  mkdir as fsMkdir,
  readFile as fsReadFile,
  writeFile as fsWriteFile,
} from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { CRAWL_DEFAULTS, crawlSitemap } from "./indexability/crawl-sitemap.mjs";

/**
 * URLs that are knowingly not yet "200 + indexable + self-canonical + meaningful
 * without JavaScript". Every entry needs a written justification: this list is
 * the record of what is queued for a fix or for removal, not a mute button.
 */
export const DEFAULT_KNOWN_ISSUES = Object.freeze([
  {
    pathnameEndsWith: "/funding-opportunities",
    classifications: ["thin"],
    // The floor is what keeps this from muting a whole route class. The entry
    // only excuses the gap between the server-rendered community header and the
    // 200-char threshold; if a page drops below the header's own worth of prose,
    // the header has regressed too and that is a failure this entry does not
    // cover. Calibrate against the post-deploy crawl report, never upward to
    // make a red run go green.
    minTextLength: 120,
    reason:
      "Client-rendered program directory. It is self-canonical with unique metadata (DEV-586) and the community header gives it a heading and prose, but the program cards themselves only exist after hydration, so a stricter content threshold can classify it thin. Queued for SSR seeding as a follow-up; only that failure mode, and only while the header still renders, is excused.",
  },
]);

const DEFAULTS = Object.freeze({
  rootSitemapUrl: CRAWL_DEFAULTS.rootSitemapUrl,
  samplePerChild: String(CRAWL_DEFAULTS.samplePerChild),
  fullCrawlThreshold: String(CRAWL_DEFAULTS.fullCrawlThreshold),
  concurrency: String(CRAWL_DEFAULTS.concurrency),
  delayMs: String(CRAWL_DEFAULTS.delayMs),
  timeoutMs: String(CRAWL_DEFAULTS.timeoutMs),
  minContentChars: String(CRAWL_DEFAULTS.minContentChars),
});

const FLAG_TO_KEY = Object.freeze({
  "--root-sitemap-url": "rootSitemapUrl",
  "--canonical-origin": "canonicalOrigin",
  "--sample-per-child": "samplePerChild",
  "--full-crawl-threshold": "fullCrawlThreshold",
  "--concurrency": "concurrency",
  "--delay-ms": "delayMs",
  "--timeout-ms": "timeoutMs",
  "--min-content-chars": "minContentChars",
  "--known-issues": "knownIssues",
  "--output": "output",
});

const ENV_NAMES = Object.freeze({
  rootSitemapUrl: "CRAWL_ROOT_SITEMAP_URL",
  canonicalOrigin: "CRAWL_CANONICAL_ORIGIN",
  samplePerChild: "CRAWL_SAMPLE_PER_CHILD",
  fullCrawlThreshold: "CRAWL_FULL_CRAWL_THRESHOLD",
  concurrency: "CRAWL_CONCURRENCY",
  delayMs: "CRAWL_DELAY_MS",
  timeoutMs: "CRAWL_TIMEOUT_MS",
  minContentChars: "CRAWL_MIN_CONTENT_CHARS",
  knownIssues: "CRAWL_KNOWN_ISSUES",
  output: "CRAWL_OUTPUT",
});

/**
 * Parse argv into a flags object. Throws on unknown flags and missing values.
 * Accepts both `--flag value` and `--flag=value` forms.
 */
export function parseArgs(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    let name = token;
    let value;

    const eq = token.startsWith("--") ? token.indexOf("=") : -1;
    if (eq !== -1) {
      name = token.slice(0, eq);
      value = token.slice(eq + 1);
    }

    if (!Object.hasOwn(FLAG_TO_KEY, name)) {
      throw new Error(`Unknown argument: ${token}`);
    }

    if (value === undefined) {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith("--")) {
        throw new Error(`Missing value for ${name}`);
      }
      value = next;
      index += 1;
    }

    if (value === "") {
      throw new Error(`Missing value for ${name}`);
    }

    flags[FLAG_TO_KEY[name]] = value;
  }
  return flags;
}

export function resolveConfig(flags, env) {
  const pick = (key, fallback) => {
    if (flags[key] !== undefined) {
      return flags[key];
    }
    const envValue = env[ENV_NAMES[key]];
    if (envValue !== undefined && envValue !== "") {
      return envValue;
    }
    return fallback;
  };

  return {
    rootSitemapUrl: pick("rootSitemapUrl", DEFAULTS.rootSitemapUrl),
    canonicalOrigin: pick("canonicalOrigin", undefined),
    samplePerChild: parseBoundedInt(
      pick("samplePerChild", DEFAULTS.samplePerChild),
      "--sample-per-child",
      1
    ),
    fullCrawlThreshold: parseBoundedInt(
      pick("fullCrawlThreshold", DEFAULTS.fullCrawlThreshold),
      "--full-crawl-threshold",
      0
    ),
    concurrency: parseBoundedInt(pick("concurrency", DEFAULTS.concurrency), "--concurrency", 1),
    delayMs: parseBoundedInt(pick("delayMs", DEFAULTS.delayMs), "--delay-ms", 0),
    timeoutMs: parseBoundedInt(pick("timeoutMs", DEFAULTS.timeoutMs), "--timeout-ms", 1),
    minContentChars: parseBoundedInt(
      pick("minContentChars", DEFAULTS.minContentChars),
      "--min-content-chars",
      0
    ),
    knownIssues: pick("knownIssues", undefined),
    output: pick("output", undefined),
  };
}

/**
 * Run the CLI. Injectable (fetch/crawl/stdout/stderr/writeFile/mkdir/readFile)
 * for tests. Returns 0 on a passing report, 1 otherwise — never calls
 * process.exit.
 */
export async function main({
  argv = [],
  env = {},
  fetch = globalThis.fetch,
  crawl = crawlSitemap,
  stdout = process.stdout,
  stderr = process.stderr,
  writeFile = fsWriteFile,
  mkdir = fsMkdir,
  readFile = fsReadFile,
} = {}) {
  let config;
  let knownIssues;
  try {
    config = resolveConfig(parseArgs(argv), env);
    knownIssues = config.knownIssues
      ? parseKnownIssuesFile(await readFile(config.knownIssues, "utf8"), config.knownIssues)
      : DEFAULT_KNOWN_ISSUES;
  } catch (err) {
    writeLine(stderr, `Error: ${errMsg(err)}`);
    return 1;
  }

  let report;
  try {
    report = await crawl({
      fetch,
      rootSitemapUrl: config.rootSitemapUrl,
      canonicalOrigin: config.canonicalOrigin,
      samplePerChild: config.samplePerChild,
      fullCrawlThreshold: config.fullCrawlThreshold,
      concurrency: config.concurrency,
      delayMs: config.delayMs,
      timeoutMs: config.timeoutMs,
      minContentChars: config.minContentChars,
      knownIssues,
    });
  } catch (err) {
    writeLine(stderr, `Crawl failed to run: ${errMsg(err)}`);
    return 1;
  }

  printSummary(report, stdout);

  if (config.output) {
    try {
      await writeReport(config.output, report, { writeFile, mkdir });
      writeLine(stdout, `Report written to ${config.output}`);
    } catch (err) {
      writeLine(stderr, `Failed to write report to ${config.output}: ${errMsg(err)}`);
      return 1;
    }
  }

  return report.ok ? 0 : 1;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Accept only a plain digits string that parses to a safe integer >= min.
function parseBoundedInt(value, label, min) {
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    throw new Error(`Invalid numeric value for ${label}: "${value}"`);
  }
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed < min) {
    throw new Error(`Invalid numeric value for ${label}: "${value}"`);
  }
  return parsed;
}

function parseKnownIssuesFile(contents, path) {
  let parsed;
  try {
    parsed = JSON.parse(contents);
  } catch (err) {
    throw new Error(`Invalid JSON in known-issues file ${path}: ${errMsg(err)}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Known-issues file ${path} must contain a JSON array`);
  }
  return parsed;
}

async function writeReport(outputPath, report, { writeFile = fsWriteFile, mkdir = fsMkdir } = {}) {
  const dir = dirname(outputPath);
  if (dir && dir !== "." && dir !== "/") {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function printSummary(report, out) {
  writeLine(out, `Sitemap crawl @ ${report.timestamp}`);
  writeLine(out, `Root: ${report.root}`);
  for (const child of report.children) {
    writeLine(
      out,
      `  ${child.url} — ${child.total} urls, ${child.sampled} sampled (${child.mode})`
    );
  }
  const { summary } = report;
  writeLine(out, `Crawled ${summary.crawled} urls; ${summary.ok} fully indexable`);
  for (const [name, count] of Object.entries(summary.byClassification)) {
    if (count > 0) {
      writeLine(out, `  ${name}: ${count}`);
    }
  }
  if (summary.allowlisted.length > 0) {
    writeLine(out, `Known issues (${summary.allowlisted.length}) — not counted as failures:`);
    for (const entry of summary.allowlisted) {
      writeLine(out, `  - ${entry.url} [${entry.classification}] ${entry.reason}`);
    }
  }
  if (summary.failing.length > 0) {
    writeLine(out, `Failures (${summary.failing.length}):`);
    for (const entry of summary.failing) {
      writeLine(
        out,
        `  - ${entry.url} [${entry.classification}] status=${entry.status} canonical=${entry.canonical ?? "none"} text=${entry.textLength}`
      );
    }
  }
  if (report.errors.length > 0) {
    writeLine(out, `Errors (${report.errors.length}):`);
    for (const error of report.errors) {
      writeLine(out, `  - ${error}`);
    }
  }
  writeLine(out, `Overall: ${report.ok ? "PASS" : "FAIL"}`);
}

function writeLine(stream, line) {
  stream.write(`${line}\n`);
}

function errMsg(err) {
  return err?.message ? err.message : String(err);
}

function isDirectRun() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isDirectRun()) {
  main({ argv: process.argv.slice(2), env: process.env })
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      process.exitCode = 1;
      process.stderr.write(`Unexpected error: ${errMsg(err)}\n`);
    });
}
