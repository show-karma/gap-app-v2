#!/usr/bin/env node
// Builds the exact Cloudflare Worker upload, keeps it Latin-1, and fails when
// it gets too close to the platform limits.
//
// Why Latin-1. V8 stores a script's source on the heap: one byte per character
// when every character is Latin-1 (<= U+00FF), two bytes per character as soon
// as a single one is not. The Worker is ~57 Mi characters, so one Cyrillic
// letter anywhere doubles its source from ~57 MiB to ~114 MiB of heap, and the
// isolate limit is 128 MiB. Above it Cloudflare recycles the isolate after
// every request without any error, so every request pays a cold start
// (docs/cloudflare-opennext-feasibility.md, "Causa do R1").
//
// esbuild already escapes strings, templates and identifiers to ASCII, but it
// never escapes regular expression literals, even with `charset: "ascii"`, and
// some dependencies ship regexes full of non-Latin-1 text (the CodeMirror
// legacy modes: Gherkin keywords in dozens of languages, APL glyphs...). This
// script parses the bundled Worker and rewrites those characters as \uXXXX
// escapes, which mean the same thing in every regex, with or without the `u`
// flag. Anything non-Latin-1 left outside a regex or a comment is an error, so
// a new dependency cannot silently double the heap again.
//
// Steps:
//  1. `wrangler deploy --dry-run --outdir .open-next/upload` bundles the Worker
//     exactly as an upload would, and sends nothing.
//  2. The regex literals of .open-next/upload/worker.js are escaped in place.
//  3. The upload is measured against the size budget (62 MiB by default,
//     WORKER_SIZE_BUDGET_MIB to change it; the platform limit is 64 MiB).
//
// Upload this file as it is, without bundling it again:
//   wrangler versions upload .open-next/upload/worker.js --no-bundle --no-minify
// (`pnpm cf:upload`). Re-bundling would be harmless but pointless, and only
// this file has been checked.
//
// Usage: pnpm cf:size            (after pnpm cf:build)
//        WORKER_SIZE_BUDGET_MIB=63 pnpm cf:size
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Parser } from "acorn";

const MIB = 1024 * 1024;
const PLATFORM_LIMIT_MIB = 64;
const LATIN1_MAX = 0xff;

/** `\uXXXX` for one UTF-16 code unit. */
function unicodeEscape(codeUnit) {
  return `\\u${codeUnit.toString(16).toUpperCase().padStart(4, "0")}`;
}

/**
 * The raw text of a regex literal with every code unit above U+00FF written
 * as a `\uXXXX` escape. An astral character becomes its two surrogate
 * escapes, which a `u`/`v` regex reads back as the single code point. A
 * character that was an identity escape (`\ф`, legal without the `u` flag)
 * loses its backslash, because `\\u0444` would mean a literal backslash.
 */
export function escapeRegexLiteral(raw) {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code <= LATIN1_MAX) {
      out += raw[i];
      continue;
    }
    let backslashes = 0;
    for (let j = out.length - 1; j >= 0 && out[j] === "\\"; j--) backslashes++;
    if (backslashes % 2 === 1) out = out.slice(0, -1);
    out += unicodeEscape(code);
  }
  return out;
}

/** The text of a comment, with anything above U+00FF escaped. Comments never change behaviour. */
function escapeComment(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out += code <= LATIN1_MAX ? text[i] : unicodeEscape(code);
  }
  return out;
}

/** Index of every code unit above U+00FF in `source`. */
export function nonLatin1Positions(source) {
  const positions = [];
  for (let i = 0; i < source.length; i++) {
    if (source.charCodeAt(i) > LATIN1_MAX) positions.push(i);
  }
  return positions;
}

/**
 * Rewrites the non-Latin-1 characters of every regex literal and comment of
 * an ES module as escapes. Returns the new source and how many characters were
 * escaped. Throws when non-Latin-1 text remains anywhere else (a tagged
 * template's raw string, say), since escaping that would change behaviour.
 */
export function makeLatin1(source) {
  const edits = [];
  Parser.parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
    allowHashBang: true,
    onToken(token) {
      if (token.type.label !== "regexp") return;
      const raw = source.slice(token.start, token.end);
      if (nonLatin1Positions(raw).length > 0) {
        edits.push({ start: token.start, end: token.end, text: escapeRegexLiteral(raw) });
      }
    },
    onComment(_block, _text, start, end) {
      const raw = source.slice(start, end);
      if (nonLatin1Positions(raw).length > 0) {
        edits.push({ start, end, text: escapeComment(raw) });
      }
    },
  });

  let escaped = 0;
  let out = "";
  let cursor = 0;
  for (const edit of edits.sort((a, b) => a.start - b.start)) {
    escaped += nonLatin1Positions(source.slice(edit.start, edit.end)).length;
    out += source.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  out += source.slice(cursor);

  const left = nonLatin1Positions(out);
  if (left.length > 0) {
    const samples = left
      .slice(0, 5)
      .map((i) => `  at ${i}: ${JSON.stringify(out.slice(Math.max(0, i - 60), i + 20))}`)
      .join("\n");
    throw new Error(
      `${left.length} ${left.length === 1 ? "character" : "characters"} above U+00FF ` +
        "are left outside regex literals and " +
        `comments, where escaping them could change behaviour. Each one makes V8 store ` +
        `the whole Worker source as UTF-16, doubling its heap.\n${samples}`
    );
  }
  return { source: out, escaped };
}

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

function main() {
  const budgetMib = Number(process.env.WORKER_SIZE_BUDGET_MIB ?? 62);
  const outDir = path.resolve(".open-next/upload");

  rmSync(outDir, { recursive: true, force: true });
  execFileSync("wrangler", ["deploy", "--dry-run", "--outdir", outDir], {
    stdio: "inherit",
    // Without it wrangler hands an OpenNext project over to `opennextjs-cloudflare deploy`.
    env: { ...process.env, OPEN_NEXT_DEPLOY: "true" },
  });

  const workerPath = path.join(outDir, "worker.js");
  const { source, escaped } = makeLatin1(readFileSync(workerPath, "utf8"));
  writeFileSync(workerPath, source);
  process.stdout.write(
    `\nWorker source is Latin-1: ${escaped} characters escaped in regex literals and comments.\n`
  );

  // Source maps and the README wrangler writes next to the bundle are not Worker code.
  const modules = filesUnder(outDir).filter(
    (file) => !file.endsWith(".map") && path.basename(file) !== "README.md"
  );
  const totalMib = modules.reduce((sum, file) => sum + statSync(file).size, 0) / MIB;
  const largest = modules
    .map((file) => ({ file: path.relative(outDir, file), mib: statSync(file).size / MIB }))
    .sort((a, b) => b.mib - a.mib)
    .slice(0, 5);

  process.stdout.write(
    `Worker code: ${totalMib.toFixed(2)} MiB uncompressed ` +
      `(budget ${budgetMib} MiB, platform limit ${PLATFORM_LIMIT_MIB} MiB)\n`
  );
  for (const { file, mib } of largest) process.stdout.write(`  ${mib.toFixed(2)} MiB  ${file}\n`);

  if (totalMib > budgetMib) {
    process.stderr.write(
      `\nThe Worker is over its ${budgetMib} MiB budget. Keep browser-only libraries out of ` +
        "the server bundle (see docs/cloudflare-opennext-feasibility.md).\n"
    );
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`\n${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
