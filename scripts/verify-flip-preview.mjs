/**
 * Verify a cacheComponents flip preview over HTTP. Manual, like
 * `crawl-sitemap.mjs`: it hits a deployment, so it is not wired into a CI
 * workflow — only its no-network unit tests are.
 *
 *   node scripts/verify-flip-preview.mjs --base https://<flip-preview> \
 *     --baseline artifacts/flip-baseline.json \
 *     --output artifacts/flip-preview-report.json
 *
 * Capture the baseline the same way against an integration-branch preview and
 * pass it back with `--baseline`; without one the absolute floors still apply,
 * so a first run is meaningful rather than vacuously green.
 *
 * Exits 1 on any regression, 2 on a usage or setup error, 0 otherwise.
 *
 * Import-safe: running the file executes the check; importing it exposes
 * parseArgs/resolveConfig/main without side effects.
 *
 * Precedence: flags > FLIP_VERIFY_* env > built-in defaults.
 */
import {
  mkdir as fsMkdir,
  readFile as fsReadFile,
  writeFile as fsWriteFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  DEFAULTS,
  findRegressions,
  formatReport,
  parseSitemapNoLoading,
  run,
} from "./indexability/verify-flip-preview.mjs";

/**
 * The crawlable set is read from the structural test at runtime, so this script
 * and the guard can never disagree about which routes are in scope.
 */
const ROUTE_SOURCE = join("__tests__", "app", "route-file-structure.test.ts");

const FLAG_TO_KEY = Object.freeze({
  "--base": "base",
  "--baseline": "baseline",
  "--output": "output",
  "--whitelabel-base": "whitelabelBase",
  "--concurrency": "concurrency",
  "--timeout-ms": "timeoutMs",
  "--min-content-chars": "minContentChars",
  "--text-drop-tolerance": "textDropTolerance",
  "--samples": "samples",
  "--route-source": "routeSource",
});

const ENV_NAMES = Object.freeze({
  base: "FLIP_VERIFY_BASE",
  baseline: "FLIP_VERIFY_BASELINE",
  output: "FLIP_VERIFY_OUTPUT",
  whitelabelBase: "FLIP_VERIFY_WHITELABEL_BASE",
  concurrency: "FLIP_VERIFY_CONCURRENCY",
  timeoutMs: "FLIP_VERIFY_TIMEOUT_MS",
  minContentChars: "FLIP_VERIFY_MIN_CONTENT_CHARS",
  textDropTolerance: "FLIP_VERIFY_TEXT_DROP_TOLERANCE",
  samples: "FLIP_VERIFY_SAMPLES",
  routeSource: "FLIP_VERIFY_ROUTE_SOURCE",
});

export function parseArgs(argv = []) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = FLAG_TO_KEY[argv[i]];
    if (!key) continue;
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${argv[i]} needs a value`);
    }
    parsed[key] = value;
    i += 1;
  }
  return parsed;
}

const number = (value, fallback) => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Expected a number, got "${value}"`);
  return parsed;
};

export function resolveConfig(args = {}, env = {}) {
  const pick = (key, fallback) => args[key] ?? env[ENV_NAMES[key]] ?? fallback;

  const base = pick("base");
  if (!base) {
    throw new Error("--base <preview url> is required (or FLIP_VERIFY_BASE).");
  }

  return {
    base: new URL(base).href,
    baseline: pick("baseline", null),
    output: pick("output", null),
    samples: pick("samples", null),
    routeSource: pick("routeSource", ROUTE_SOURCE),
    whitelabelBase: new URL(pick("whitelabelBase", DEFAULTS.whitelabelBase)).href,
    concurrency: number(pick("concurrency"), DEFAULTS.concurrency),
    timeoutMs: number(pick("timeoutMs"), DEFAULTS.timeoutMs),
    minContentChars: number(pick("minContentChars"), DEFAULTS.minContentChars),
    textDropTolerance: number(pick("textDropTolerance"), DEFAULTS.textDropTolerance),
  };
}

const readJson = async (path, readFile) => JSON.parse(await readFile(path, "utf8"));

export async function main({
  argv = [],
  env = {},
  readFile = fsReadFile,
  writeFile = fsWriteFile,
  mkdir = fsMkdir,
  stdout = process.stdout,
  stderr = process.stderr,
  fetchImpl = fetch,
} = {}) {
  let config;
  try {
    config = resolveConfig(parseArgs(argv), env);
  } catch (err) {
    stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    return 2;
  }

  let routeIds;
  try {
    routeIds = parseSitemapNoLoading(await readFile(config.routeSource, "utf8"));
  } catch (err) {
    stderr.write(
      `Could not read the crawlable route set: ${err instanceof Error ? err.message : err}\n`
    );
    return 2;
  }

  const samples = config.samples ? await readJson(config.samples, readFile) : null;
  const baseline = config.baseline ? await readJson(config.baseline, readFile) : null;

  const result = await run({
    base: config.base,
    routeIds,
    samples,
    whitelabelBase: config.whitelabelBase,
    concurrency: config.concurrency,
    timeoutMs: config.timeoutMs,
    fetchImpl,
  });

  result.regressions = findRegressions(result, baseline, {
    minContentChars: config.minContentChars,
    textDropTolerance: config.textDropTolerance,
  });
  result.baseline = config.baseline ?? null;
  result.routeCount = routeIds.length;

  stdout.write(`${formatReport(result)}\n`);

  if (config.output) {
    await mkdir(dirname(config.output), { recursive: true });
    await writeFile(config.output, `${JSON.stringify(result, null, 2)}\n`);
    stdout.write(`\nwrote ${config.output}\n`);
  }

  if (!baseline) {
    stdout.write(
      "\nNo --baseline given: only the absolute floors were applied (200, an <h1>, " +
        `${config.minContentChars}+ visible chars, no content in hidden chunks). ` +
        "Capture a baseline against an integration-branch preview to catch drops.\n"
    );
  }

  return result.regressions.length > 0 ? 1 : 0;
}

const isDirectRun = () =>
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun()) {
  main({ argv: process.argv.slice(2), env: process.env })
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      process.exitCode = 2;
      process.stderr.write(`Unexpected error: ${err instanceof Error ? err.message : err}\n`);
    });
}
