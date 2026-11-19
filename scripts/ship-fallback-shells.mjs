#!/usr/bin/env node
// Copies the build's fallback shells into the Worker's static assets, where
// cloudflare/shell-fallback-cache.ts reads one when R2 does not have it. See
// that file for why a missing shell is a 500.
//
// A fallback shell is a route cache entry whose path keeps a `[param]` segment:
// .open-next/cache/<buildId>/route-cache/APP_PAGE/<hash>/$/t/[tenant]/project/[projectId].cache
// It lands at the path the static-assets incremental cache of the adapter reads:
// .open-next/assets/cdn-cgi/_next_cache/<buildId>/route-cache/...
// Assets under `cdn-cgi/` are only readable by the Worker, never served.
//
// Runs after `opennextjs-cloudflare build` (part of `pnpm cf:build`).
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ASSETS_CACHE_DIR = "cdn-cgi/_next_cache";

/** Whether a path below a build's cache directory is a fallback shell entry. */
export function isFallbackShellPath(relativePath) {
  const parts = relativePath.split(/[\\/]/);
  const marker = parts.indexOf("$");
  if (parts[0] !== "route-cache" || marker === -1 || !relativePath.endsWith(".cache")) return false;
  return parts.slice(marker + 1).some((part) => /^\[[^/]+\](?:\.cache)?$/.test(part));
}

function filesUnder(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full, base) : [path.relative(base, full)];
  });
}

/** Copies the shells of `buildId` and returns how many there were and their size in bytes. */
export function shipFallbackShells({ cacheRoot, assetsRoot, buildId }) {
  const source = path.join(cacheRoot, buildId);
  const target = path.join(assetsRoot, ASSETS_CACHE_DIR, buildId);
  // Shells of an earlier build in the same output folder would only add weight.
  rmSync(path.join(assetsRoot, ASSETS_CACHE_DIR), { recursive: true, force: true });

  let count = 0;
  let bytes = 0;
  for (const file of filesUnder(path.join(source, "route-cache"), source)) {
    if (!isFallbackShellPath(file)) continue;
    const to = path.join(target, file);
    mkdirSync(path.dirname(to), { recursive: true });
    copyFileSync(path.join(source, file), to);
    count++;
    bytes += readFileSync(to).byteLength;
  }
  return { count, bytes };
}

function main() {
  const buildId = readFileSync(".next/BUILD_ID", "utf8").trim();
  const { count, bytes } = shipFallbackShells({
    cacheRoot: ".open-next/cache",
    assetsRoot: ".open-next/assets",
    buildId,
  });
  if (count === 0) {
    throw new Error(
      `No fallback shell found in .open-next/cache/${buildId}. Without them a missing R2 entry ` +
        "is a 500 on every dynamic route; check that the build ran with cacheComponents."
    );
  }
  process.stdout.write(
    `Shipped ${count} fallback shells (${(bytes / 1024 / 1024).toFixed(1)} MiB) to ` +
      `.open-next/assets/${ASSETS_CACHE_DIR}/${buildId}\n`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`\n${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
