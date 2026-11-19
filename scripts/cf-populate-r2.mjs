#!/usr/bin/env node
// Uploads the build's incremental cache (.open-next/cache) to a Worker's R2 bucket.
//
// `opennextjs-cloudflare populateCache remote` does the same through a
// temporary Worker, which failed for this app (docs/cloudflare-opennext-feasibility.md).
// This writes each object straight through the R2 REST API instead, under the
// keys the adapter reads (getCacheAssets + computeCacheKey in
// @opennextjs/cloudflare 1.20.16: `incremental-cache/<buildId>/<sha256(key)>.<type>`).
// Re-check them when upgrading the adapter.
//
// Run after `pnpm cf:build`, before deploying: a page missing from R2 is only
// rendered again, but a deploy with an empty cache renders everything on first
// visit. A fallback shell missing from R2 is read from the assets
// (cloudflare/shell-fallback-cache.ts).
//
// Usage: node scripts/cf-populate-r2.mjs <bucket>
//   CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const [bucket] = process.argv.slice(2);
const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!bucket || !token || !account) {
  process.stderr.write(
    "Usage: node scripts/cf-populate-r2.mjs <bucket> (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)\n"
  );
  process.exit(2);
}

const base = path.resolve(".open-next/cache");
const CONCURRENCY = 8;
const ATTEMPTS = 5;

/** Every cache file, with the build id, cache key and type the adapter derives from its path. */
function cacheAssets() {
  return readdirSync(base, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const full = path.join(entry.parentPath, entry.name);
      const rel = path.relative(base, full).split(path.sep).join("/");
      if (rel.startsWith("__fetch")) {
        const [, buildId, ...parts] = rel.split("/");
        return { full, buildId, key: `/${parts.join("/")}`, type: "fetch" };
      }
      if (!rel.endsWith(".cache")) throw new Error(`Unexpected file in the cache: ${rel}`);
      const [buildId, ...parts] = rel.slice(0, -".cache".length).split("/");
      return { full, buildId, key: `/${parts.join("/")}`, type: "cache" };
    });
}

function objectKey({ key, buildId, type }) {
  const hash = createHash("sha256").update(key).digest("hex");
  return `incremental-cache/${buildId}/${hash}.${type}`.replace(/\/+/g, "/");
}

async function upload(asset) {
  const encodedKey = objectKey(asset).split("/").map(encodeURIComponent).join("/");
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${bucket}/objects/${encodedKey}`;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    let status = 0;
    let detail = "";
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { authorization: `Bearer ${token}` },
        body: readFileSync(asset.full),
      });
      if (response.ok) return true;
      status = response.status;
      detail = (await response.text()).slice(0, 200);
    } catch (error) {
      detail = String(error);
    }
    // 4xx other than timeouts and rate limits will not get better on retry.
    const permanent = status >= 400 && status < 500 && status !== 408 && status !== 429;
    if (permanent || attempt === ATTEMPTS) {
      process.stderr.write(`Failed (${status}) ${asset.key}: ${detail}\n`);
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }
  return false;
}

const assets = cacheAssets();
const queue = [...assets];
let written = 0;
let failed = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let asset = queue.shift(); asset; asset = queue.shift()) {
      if (await upload(asset)) written++;
      else failed++;
    }
  })
);
process.stdout.write(
  `R2 ${bucket}: ${assets.length} cache files, ${written} written, ${failed} failed\n`
);
process.exit(failed ? 1 : 0);
