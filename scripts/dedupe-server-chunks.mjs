#!/usr/bin/env node
// Makes every duplicate Turbopack server chunk a one-line re-export of a single
// copy, so the Cloudflare Worker bundles each chunk once.
//
// Why. Turbopack writes the same server chunk under several names, one per
// group of routes that uses it. The copies differ only in their trailing
// `//# sourceMappingURL=` comment. OpenNext then bundles every chunk file it
// finds into the Next server Worker (a `require` per chunk in its
// requireChunk switch), so each copy is shipped and parsed again: 195 extra
// copies, 12.4 MiB of the 72 MiB of server JavaScript, in the build of
// 2026-11-19. A new isolate pays to load the whole script before its first
// request (~1.7 s for 55 MiB, docs/cloudflare-opennext-feasibility.md), so
// every byte cut is startup time.
//
// What. A chunk is `module.exports=[...]`: the module ids and factories the
// Turbopack runtime installs when it loads the chunk. Two chunks with the same
// content install the same modules, so a duplicate can return the first copy's
// array: `module.exports=require("./<first copy>")`. The runtime keeps loading
// it by its own path; esbuild bundles the first copy once.
//
// Runs between `next build` and OpenNext's bundling, as the build command in
// open-next.config.ts, on the Cloudflare build only. Vercel never runs it.
//
// Usage: node scripts/dedupe-server-chunks.mjs [.next dir]   (default: .next)
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SOURCE_MAP_COMMENT = /\n\/\/# sourceMappingURL=[^\n]*\s*$/;
const CHUNK_PREFIX = "module.exports=";

function jsFilesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return jsFilesUnder(full);
    return entry.name.endsWith(".js") ? [full] : [];
  });
}

/** The chunk's code without its source map comment, or null when it is not a plain chunk. */
export function chunkBody(source) {
  const body = source.replace(SOURCE_MAP_COMMENT, "");
  return body.startsWith(CHUNK_PREFIX) ? body : null;
}

/** `require` specifier from one chunk file to another, always relative. */
export function relativeRequire(fromFile, toFile) {
  const relative = path.relative(path.dirname(fromFile), toFile).split(path.sep).join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

/**
 * Rewrites the duplicate chunks under `chunksDir`. The copy that sorts first
 * stays; the others re-export it. Returns what changed.
 */
export function dedupeChunks(chunksDir) {
  const groups = new Map();
  for (const file of jsFilesUnder(chunksDir).sort()) {
    const body = chunkBody(readFileSync(file, "latin1"));
    if (body === null) continue;
    const hash = createHash("sha256").update(body, "latin1").digest("hex");
    const group = groups.get(hash);
    if (group) group.files.push(file);
    else groups.set(hash, { bytes: Buffer.byteLength(body, "latin1"), files: [file] });
  }
  let copies = 0;
  let savedBytes = 0;
  for (const { bytes, files } of groups.values()) {
    const [kept, ...duplicates] = files;
    for (const duplicate of duplicates) {
      writeFileSync(
        duplicate,
        `// Same chunk as ${path.basename(kept)} (scripts/dedupe-server-chunks.mjs).\n` +
          `${CHUNK_PREFIX}require(${JSON.stringify(relativeRequire(duplicate, kept))});\n`
      );
      copies++;
      savedBytes += bytes;
    }
  }
  return { copies, savedBytes };
}

function main() {
  const nextDir = path.resolve(process.argv[2] ?? ".next");
  // OpenNext copies the server from the standalone output when there is one;
  // rewrite both so they stay identical.
  const dirs = [
    path.join(nextDir, "server", "chunks"),
    path.join(nextDir, "standalone", ".next", "server", "chunks"),
  ].filter((dir) => existsSync(dir));
  if (dirs.length === 0)
    throw new Error(`No server chunks under ${nextDir}: run next build first.`);
  for (const dir of dirs) {
    const { copies, savedBytes } = dedupeChunks(dir);
    process.stdout.write(
      `${path.relative(process.cwd(), dir)}: ${copies} duplicate chunks now re-export ` +
        `their first copy, ${(savedBytes / 1024 / 1024).toFixed(2)} MiB less to bundle.\n`
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
