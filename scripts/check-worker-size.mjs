#!/usr/bin/env node
// Fails when the Cloudflare Worker built by `pnpm cf:build` gets too close to
// the platform limit.
//
// Cloudflare rejects a Worker whose code is over 64 MiB uncompressed (paid
// plan), and the gap-app-v2 Worker sits close to it, so a single new
// server-side dependency can push it over. This script bundles the Worker the
// way an upload would (`wrangler deploy --dry-run`, which builds locally and
// sends nothing), sums the modules it would upload, and exits 1 above the
// budget. The budget defaults to 62 MiB, so a breach shows up here with 2 MiB
// left to fix it instead of at upload time.
//
// Usage: pnpm cf:size            (after pnpm cf:build)
//        WORKER_SIZE_BUDGET_MIB=63 pnpm cf:size
import { execFileSync } from "node:child_process";
import { readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const MIB = 1024 * 1024;
const PLATFORM_LIMIT_MIB = 64;
const budgetMib = Number(process.env.WORKER_SIZE_BUDGET_MIB ?? 62);
const outDir = path.resolve(".open-next/size-check");

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

rmSync(outDir, { recursive: true, force: true });
execFileSync("wrangler", ["deploy", "--dry-run", "--outdir", outDir], { stdio: "inherit" });

// Source maps and the README wrangler writes next to the bundle are not Worker code.
const modules = filesUnder(outDir).filter(
  (file) => !file.endsWith(".map") && path.basename(file) !== "README.md"
);
const totalBytes = modules.reduce((sum, file) => sum + statSync(file).size, 0);
const totalMib = totalBytes / MIB;

const largest = modules
  .map((file) => ({ file: path.relative(outDir, file), mib: statSync(file).size / MIB }))
  .sort((a, b) => b.mib - a.mib)
  .slice(0, 5);

process.stdout.write(
  `\nWorker code: ${totalMib.toFixed(2)} MiB uncompressed ` +
    `(budget ${budgetMib} MiB, platform limit ${PLATFORM_LIMIT_MIB} MiB)\n`
);
for (const { file, mib } of largest) process.stdout.write(`  ${mib.toFixed(2)} MiB  ${file}\n`);

if (totalMib > budgetMib) {
  process.stderr.write(
    `\nThe Worker is over its ${budgetMib} MiB budget. Keep browser-only libraries out of ` +
      "the server bundle (see the turbopack.resolveAlias stubs in next.config.ts and " +
      "docs/cloudflare-opennext-feasibility.md).\n"
  );
  process.exit(1);
}
