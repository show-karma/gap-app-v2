/**
 * Import-safe, dependency-free CLI around verifyIndexability. Running the file
 * directly executes the verification; importing it (e.g. from tests) only
 * exposes parseArgs/main without side effects.
 *
 * Precedence: flags > INDEXABILITY_* env > built-in defaults. The root sitemap
 * URL follows the (possibly overridden) canonical origin unless it is set
 * explicitly.
 */
import { mkdir as fsMkdir, writeFile as fsWriteFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeOrigin, verifyIndexability } from "./indexability/verify-indexability.mjs";

const DEFAULTS = Object.freeze({
  canonicalOrigin: "https://www.karmahq.xyz",
  apexOrigin: "https://karmahq.xyz",
  gapOrigin: "https://gap.karmahq.xyz",
  indexerOrigin: "https://gapapi.karmahq.xyz",
  // Leaf-count floor. Recalibrated 4000 -> 3800 after gap-indexer PR #2195
  // (production-1.47.49) shipped the projects=v4 content-gate: a project root now
  // requires the project's OWN substantive description; grant text alone no longer
  // qualifies. That dropped the accepted projects baseline ~3845 -> 3750 (total
  // leaves ~4087 -> ~3992). 3800 is ~95% of the new 3992 baseline: it still
  // catches a real regression (a large, unexpected drop) without flapping on the
  // expected v4 contract propagation or normal project churn.
  minLeafCount: "3800",
  timeoutMs: "15000",
});

const FLAG_TO_KEY = Object.freeze({
  "--canonical-origin": "canonicalOrigin",
  "--apex-origin": "apexOrigin",
  "--gap-origin": "gapOrigin",
  "--indexer-origin": "indexerOrigin",
  "--root-sitemap-url": "rootSitemapUrl",
  "--min-leaf-count": "minLeafCount",
  "--timeout-ms": "timeoutMs",
  "--output": "output",
});

const ENV_NAMES = Object.freeze({
  canonicalOrigin: "INDEXABILITY_CANONICAL_ORIGIN",
  apexOrigin: "INDEXABILITY_APEX_ORIGIN",
  gapOrigin: "INDEXABILITY_GAP_ORIGIN",
  indexerOrigin: "INDEXABILITY_INDEXER_ORIGIN",
  rootSitemapUrl: "INDEXABILITY_ROOT_SITEMAP_URL",
  minLeafCount: "INDEXABILITY_MIN_LEAF_COUNT",
  timeoutMs: "INDEXABILITY_TIMEOUT_MS",
  output: "INDEXABILITY_OUTPUT",
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

function resolveConfig(flags, env) {
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

  // Normalize + validate every origin before building URLs downstream: reject
  // path/query/hash/credentials/non-http and collapse a trailing slash to
  // URL.origin (shared with the direct verifier via normalizeOrigin).
  const canonicalOrigin = normalizeOrigin(
    pick("canonicalOrigin", DEFAULTS.canonicalOrigin),
    "--canonical-origin"
  );
  const apexOrigin = normalizeOrigin(pick("apexOrigin", DEFAULTS.apexOrigin), "--apex-origin");
  const gapOrigin = normalizeOrigin(pick("gapOrigin", DEFAULTS.gapOrigin), "--gap-origin");
  const indexerOrigin = normalizeOrigin(
    pick("indexerOrigin", DEFAULTS.indexerOrigin),
    "--indexer-origin"
  );

  // Derived root follows the normalized canonical unless set explicitly (flag or
  // env). Default to /sitemap_index.xml — the sitemap INDEX is the sole URL
  // submitted to Google Search Console, so the monitor audits that entry point by
  // default (override with --root-sitemap-url / INDEXABILITY_ROOT_SITEMAP_URL).
  const explicitRoot = pick("rootSitemapUrl", undefined);
  const rootSitemapUrl = explicitRoot ?? new URL("/sitemap_index.xml", canonicalOrigin).href;

  // minLeafCount: nonnegative safe integer; timeoutMs: positive safe integer.
  const minLeafCount = parseBoundedInt(
    pick("minLeafCount", DEFAULTS.minLeafCount),
    "--min-leaf-count",
    0
  );
  const timeoutMs = parseBoundedInt(pick("timeoutMs", DEFAULTS.timeoutMs), "--timeout-ms", 1);

  const output = pick("output", undefined);

  return {
    canonicalOrigin,
    apexOrigin,
    gapOrigin,
    indexerOrigin,
    rootSitemapUrl,
    minLeafCount,
    timeoutMs,
    output,
  };
}

/**
 * Run the CLI. Injectable (fetch/verify/stdout/stderr/writeFile/mkdir) for
 * tests. Returns 0 on a passing report, 1 otherwise — never calls process.exit.
 */
export async function main({
  argv = [],
  env = {},
  fetch = globalThis.fetch,
  verify = verifyIndexability,
  stdout = process.stdout,
  stderr = process.stderr,
  writeFile = fsWriteFile,
  mkdir = fsMkdir,
} = {}) {
  let config;
  try {
    config = resolveConfig(parseArgs(argv), env);
  } catch (err) {
    writeLine(stderr, `Error: ${errMsg(err)}`);
    return 1;
  }

  let report;
  try {
    report = await verify({
      fetch,
      canonicalOrigin: config.canonicalOrigin,
      apexOrigin: config.apexOrigin,
      gapOrigin: config.gapOrigin,
      indexerBaseUrl: config.indexerOrigin,
      rootSitemapUrl: config.rootSitemapUrl,
      minLeafCount: config.minLeafCount,
      timeoutMs: config.timeoutMs,
    });
  } catch (err) {
    // Even on an unexpected verifier failure, still emit a structured failure
    // report so the monitoring artifact exists.
    writeLine(stderr, `Verification failed to run: ${errMsg(err)}`);
    if (config.output) {
      try {
        await writeReport(config.output, buildFailureReport(config, errMsg(err)), {
          writeFile,
          mkdir,
        });
        writeLine(stdout, `Failure report written to ${config.output}`);
      } catch (writeErr) {
        writeLine(
          stderr,
          `Failed to write failure report to ${config.output}: ${errMsg(writeErr)}`
        );
      }
    }
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
// Rejects decimals, exponents, negatives, and unsafe (>= 2^53) integers.
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

function buildFailureReport(config, message) {
  return {
    timestamp: new Date().toISOString(),
    origins: {
      canonical: config.canonicalOrigin,
      apex: config.apexOrigin,
      gap: config.gapOrigin,
      indexer: config.indexerOrigin,
    },
    sitemap: { sitemapCount: 0, leafCount: 0 },
    representativeProject: null,
    checks: [],
    errors: [message],
    ok: false,
  };
}

async function writeReport(outputPath, report, { writeFile = fsWriteFile, mkdir = fsMkdir } = {}) {
  const dir = dirname(outputPath);
  if (dir && dir !== "." && dir !== "/") {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function printSummary(report, out) {
  writeLine(out, `Indexability check @ ${report.timestamp}`);
  writeLine(
    out,
    `Origins: canonical=${report.origins.canonical} apex=${report.origins.apex} ` +
      `gap=${report.origins.gap} indexer=${report.origins.indexer}`
  );
  writeLine(
    out,
    `Sitemaps: ${report.sitemap.sitemapCount} docs, ${report.sitemap.leafCount} leaves; ` +
      `representative=${report.representativeProject ?? "none"}`
  );
  const passed = report.checks.filter((check) => check.ok).length;
  writeLine(out, `Checks: ${passed}/${report.checks.length} passed`);
  for (const check of report.checks) {
    writeLine(out, `  ${check.ok ? "PASS" : "FAIL"} ${check.name}`);
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
  return err && err.message ? err.message : String(err);
}

function isDirectRun() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isDirectRun()) {
  main({ argv: process.argv.slice(2), env: process.env })
    .then((code) => {
      process.exitCode = code;
    })
    .catch(async (err) => {
      process.exitCode = 1;
      process.stderr.write(`Unexpected error: ${errMsg(err)}\n`);
      // Best-effort failure report if an output path can be resolved.
      try {
        const config = resolveConfig(parseArgs(process.argv.slice(2)), process.env);
        if (config.output) {
          await writeReport(config.output, buildFailureReport(config, errMsg(err)));
        }
      } catch {
        // Ignore secondary failures while handling the primary error.
      }
    });
}
