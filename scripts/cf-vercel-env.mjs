#!/usr/bin/env node
// Hands the Vercel environment that `vercel pull` wrote to the Cloudflare build
// and Workers, so the Cloudflare staging runs with the same values as the
// Vercel one (.github/workflows/cloudflare-staging.yml).
//
//   node scripts/cf-vercel-env.mjs build <env file>
//     Appends every NEXT_PUBLIC_* variable to $GITHUB_ENV, masked in the logs,
//     for `pnpm cf:build`. Only those: they are inlined into the bundles anyway.
//     Never write them to a .env at the app root, because OpenNext copies that
//     file into the Worker bundle, with whatever secrets it holds.
//
//   [CF_SECRETS=A,B] node scripts/cf-vercel-env.mjs secrets <env file> -- <wrangler secret put args>
//     Stores each runtime secret in RUNTIME_SECRETS (or only those in CF_SECRETS) that the file defines with
//     `wrangler secret put <name> <args>`, passing the value on stdin. Values
//     are never printed.
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

/** Server-only variables the app reads at runtime (utilities/env.schema.ts, the cron route). */
const RUNTIME_SECRETS = [
  "CRON_SECRET",
  "SANITY_VIEWER_TOKEN",
  "SANITY_WEBHOOK_SECRET",
  "SANITY_PREVIEW_SECRET",
  "PROJECT_CACHE_REVALIDATION_SECRET",
  "FIRECRAWL_API_KEY",
];

const [mode, envFile, separator, ...wranglerArgs] = process.argv.slice(2);
if (!envFile || (mode !== "build" && mode !== "secrets")) {
  process.stderr.write(
    "Usage: cf-vercel-env.mjs build <env file> | secrets <env file> -- <wrangler args>\n"
  );
  process.exit(2);
}
const vars = parseEnv(readFileSync(envFile, "utf8"));

if (mode === "build") {
  const githubEnv = process.env.GITHUB_ENV;
  if (!githubEnv) throw new Error("GITHUB_ENV is not set: run this inside GitHub Actions.");
  const names = Object.keys(vars).filter((name) => name.startsWith("NEXT_PUBLIC_") && vars[name]);
  for (const name of names) {
    const value = vars[name];
    for (const line of value.split("\n")) if (line) process.stdout.write(`::add-mask::${line}\n`);
    const delimiter = `EOF_${name}_${Math.random().toString(36).slice(2)}`;
    appendFileSync(githubEnv, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
  }
  process.stdout.write(`Exported ${names.length} NEXT_PUBLIC_* variables for the build.\n`);
} else {
  if (separator !== "--") throw new Error("Pass the wrangler arguments after --.");
  // CF_SECRETS narrows the list for a Worker that needs only some of them.
  const only = process.env.CF_SECRETS?.split(",").map((name) => name.trim());
  const names = only ? RUNTIME_SECRETS.filter((name) => only.includes(name)) : RUNTIME_SECRETS;
  let failed = 0;
  for (const name of names) {
    if (!vars[name]) {
      process.stdout.write(`${name}: not set in the Vercel environment, skipped\n`);
      continue;
    }
    const result = spawnSync("npx", ["wrangler", "secret", "put", name, ...wranglerArgs], {
      input: vars[name],
      stdio: ["pipe", "ignore", "pipe"],
      encoding: "utf8",
    });
    if (result.status === 0) {
      process.stdout.write(`${name}: stored\n`);
    } else {
      failed++;
      // wrangler's own error text never contains the value, which went to stdin.
      process.stderr.write(`${name}: failed\n${(result.stderr ?? "").slice(-500)}\n`);
    }
  }
  process.exit(failed ? 1 : 0);
}
