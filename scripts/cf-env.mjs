#!/usr/bin/env node
// Hands build-time and runtime secrets from GitHub Environments to the
// Cloudflare Workers build and deploy workflows, with no Vercel dependency.
//
//   node scripts/cf-env.mjs build
//     Parses CF_PUBLIC_ENV and appends every NEXT_PUBLIC_* variable to
//     $GITHUB_ENV, masked in logs, for `pnpm cf:build`. Rejects non-public
//     keys so server secrets cannot leak into client bundles.
//     Never write them to a .env at the app root, because OpenNext copies that
//     file into the Worker bundle.
//
//   [CF_SECRETS=A,B] node scripts/cf-env.mjs secrets -- <wrangler secret put args>
//     Stores each runtime secret in RUNTIME_SECRETS (or only those in
//     CF_SECRETS) defined in process.env with `wrangler secret put <name>
//     <args>`, passing the value on stdin. Values are never printed.
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

/** Server-only variables the app reads at runtime (utilities/env.schema.ts, the cron route). */
export const RUNTIME_SECRETS = [
  "CRON_SECRET",
  "SANITY_VIEWER_TOKEN",
  "SANITY_WEBHOOK_SECRET",
  "SANITY_PREVIEW_SECRET",
  "PROJECT_CACHE_REVALIDATION_SECRET",
];

/** Catches redacted platform placeholders such as Vercel's `[sensitive]`. */
export function isPlaceholderValue(value) {
  return typeof value === "string" && /^\[[^\]]+\]$/.test(value.trim());
}

/**
 * Parses CF_PUBLIC_ENV dotenv text and returns sorted `[key, value]` entries.
 * Rejects non-`NEXT_PUBLIC_*` keys and bracket placeholders, skips empty
 * values, and drops `NEXT_PUBLIC_VERCEL_ENV`.
 * @param {string} raw
 * @returns {Array<[string, string]>}
 */
export function parsePublicEnv(raw) {
  const parsed = parseEnv(raw);
  const entries = [];

  for (const [key, value] of Object.entries(parsed)) {
    if (!key.startsWith("NEXT_PUBLIC_")) {
      throw new Error(`Non-public variable "${key}" is not allowed in CF_PUBLIC_ENV.`);
    }
    if (key === "NEXT_PUBLIC_VERCEL_ENV" || !value) {
      continue;
    }
    if (isPlaceholderValue(value)) {
      throw new Error(`Variable "${key}" appears to be a redacted placeholder.`);
    }
    entries.push([key, value]);
  }

  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries;
}

/**
 * Masks and exports `CF_PUBLIC_ENV` entries to `$GITHUB_ENV` for the Next build.
 * @param {{ raw: string; githubEnvPath?: string; stdout?: { write: (chunk: string) => unknown } }} options
 * @returns {number}
 */
export function exportBuildEnv({ raw, githubEnvPath, stdout = process.stdout }) {
  if (!raw || !raw.trim()) {
    throw new Error("CF_PUBLIC_ENV is empty.");
  }
  if (!githubEnvPath) {
    throw new Error("GITHUB_ENV is not set: run this inside GitHub Actions.");
  }

  const entries = parsePublicEnv(raw);
  if (entries.length === 0) {
    throw new Error("No NEXT_PUBLIC_* variables found in CF_PUBLIC_ENV.");
  }

  for (const [name, value] of entries) {
    for (const line of value.split("\n")) {
      if (line) stdout.write(`::add-mask::${line}\n`);
    }
    const delimiter = `EOF_${name}_${Math.random().toString(36).slice(2)}`;
    appendFileSync(githubEnvPath, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
  }

  stdout.write(`Exported ${entries.length} NEXT_PUBLIC_* variables for the build.\n`);
  return entries.length;
}

/**
 * Stores defined runtime secrets on a Worker via `wrangler secret put`.
 * @param {{
 *   env?: Record<string, string | undefined>;
 *   only?: string;
 *   wranglerArgs?: string[];
 *   runner?: typeof spawnSync;
 *   stdout?: { write: (chunk: string) => unknown };
 *   stderr?: { write: (chunk: string) => unknown };
 * }} [options]
 * @returns {number} Count of failed secrets.
 */
export function syncRuntimeSecrets({
  env = process.env,
  only,
  wranglerArgs = [],
  runner = spawnSync,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  const onlyList =
    typeof only === "string" && only.trim()
      ? only
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
      : null;
  const names = onlyList
    ? RUNTIME_SECRETS.filter((name) => onlyList.includes(name))
    : RUNTIME_SECRETS;

  let failed = 0;
  for (const name of names) {
    const value = env[name];
    if (!value) {
      stdout.write(`${name}: not set in GitHub environment, skipped\n`);
      continue;
    }
    if (isPlaceholderValue(value)) {
      stderr.write(
        `::error::${name} appears to be a redacted placeholder; refusing to store it on the Worker.\n`
      );
      failed++;
      continue;
    }

    const result = runner("npx", ["wrangler", "secret", "put", name, ...wranglerArgs], {
      input: value,
      stdio: ["pipe", "ignore", "pipe"],
      encoding: "utf8",
    });
    if (result.status === 0) {
      stdout.write(`${name}: stored\n`);
    } else {
      failed++;
      // wrangler's own error text never contains the value, which went to stdin.
      stderr.write(`${name}: failed\n${(result.stderr ?? "").slice(-500)}\n`);
    }
  }
  return failed;
}

const isMain = Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  const [mode, separator, ...wranglerArgs] = process.argv.slice(2);
  if (mode === "build") {
    exportBuildEnv({
      raw: process.env.CF_PUBLIC_ENV ?? "",
      githubEnvPath: process.env.GITHUB_ENV,
      stdout: process.stdout,
    });
  } else if (mode === "secrets") {
    if (separator !== "--") {
      process.stderr.write("Usage: cf-env.mjs build | secrets -- <wrangler args>\n");
      process.exit(2);
    }
    const failed = syncRuntimeSecrets({
      env: process.env,
      only: process.env.CF_SECRETS,
      wranglerArgs,
      runner: spawnSync,
      stdout: process.stdout,
      stderr: process.stderr,
    });
    process.exit(failed ? 1 : 0);
  } else {
    process.stderr.write("Usage: cf-env.mjs build | secrets -- <wrangler args>\n");
    process.exit(2);
  }
}
