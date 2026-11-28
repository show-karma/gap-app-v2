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
// The app is two Workers (wrangler.jsonc, the routing Worker, and
// wrangler.app.jsonc, the Next server Worker). For each:
//  1. `wrangler deploy --dry-run --config <file> --outdir <dir>` bundles it
//     exactly as an upload would, and sends nothing;
//  2. the regex literals of the bundle (<dir>/<entry>.js) are escaped in place;
//  3. the upload is measured against its size budget: 8 MiB for the routing
//     Worker (ROUTING_WORKER_SIZE_BUDGET_MIB), 62 MiB for the Next server
//     (WORKER_SIZE_BUDGET_MIB); the platform limit is 64 MiB.
//
// Upload these files as they are, never bundling again (`pnpm cf:upload`):
//   wrangler versions upload .open-next/upload-app/next-server.js --config wrangler.app.jsonc --no-bundle --no-minify
//   wrangler versions upload .open-next/upload/worker.js --no-bundle --no-minify
// Re-bundling drops both rewrites: without the Latin-1 one the Worker silently
// goes back to a new isolate on every request, and without the function
// wrappers (below) every new isolate parses the Next server twice.
//
// Usage: pnpm cf:size            (after pnpm cf:build)
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

// Why function wrappers. esbuild wraps an ES module that has a top-level await
// (the OpenNext server handler, and with it ~47 MB of Next.js chunks) in an
// `async () => { ... }` passed to its __esm helper, called on the first import.
// V8 preparses that body once when it compiles the script, and for an arrow
// function it throws that work away and parses the whole body again on the
// first call; for a `function` it keeps what the preparse learned and skips
// every inner function. Measured on the Next server Worker body in Node: first
// call 989 ms as an arrow, 7 ms as an async function. On Cloudflare that first
// call is inside the first request of every new isolate.
//
// So every zero-parameter arrow passed to a call that initializes a top-level
// `var` (the shape of the __esm wrappers) becomes a function expression. The
// two only differ in `this`, `arguments`, `super` and `new.target`, which an
// arrow takes from its surroundings; a body that uses any of them where an
// arrow would see the outer one is an error, never rewritten.

/** Child nodes of an acorn node. */
function childNodes(node) {
  const children = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === "type" || key === "start" || key === "end") continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item && typeof item === "object" && typeof item.type === "string") children.push(item);
    }
  }
  return children;
}

/**
 * The first `this`, `arguments`, `super` or `new.target` in `body` that would
 * mean something else once the arrow around it is a function, or null.
 */
function lexicalBinding(body) {
  const stack = [body];
  while (stack.length > 0) {
    const node = stack.pop();
    switch (node.type) {
      case "ThisExpression":
      case "Super":
        return node;
      case "MetaProperty":
        if (node.meta.name === "new") return node;
        continue;
      case "Identifier":
        if (node.name === "arguments") return node;
        continue;
      // Functions bind their own; their computed keys are handled by the parent.
      case "FunctionExpression":
      case "FunctionDeclaration":
      case "StaticBlock":
        continue;
      case "MemberExpression":
        stack.push(node.object);
        if (node.computed) stack.push(node.property);
        continue;
      case "Property":
      case "MethodDefinition":
        if (node.computed) stack.push(node.key);
        stack.push(node.value);
        continue;
      case "PropertyDefinition":
        // A field initializer runs with the instance as `this`.
        if (node.computed) stack.push(node.key);
        continue;
      default:
        stack.push(...childNodes(node));
    }
  }
  return null;
}

/**
 * Rewrites the arrow functions that wrap whole modules (see above) as function
 * expressions, so V8 does not parse them twice. Returns the new source and how
 * many characters of wrapped code changed wrapper.
 */
export function rewriteModuleWrappers(source) {
  const program = Parser.parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
    allowHashBang: true,
  });
  const edits = [];
  let wrappedChars = 0;
  for (const statement of program.body) {
    if (statement.type !== "VariableDeclaration") continue;
    for (const { init } of statement.declarations) {
      if (init?.type !== "CallExpression") continue;
      for (const arrow of init.arguments) {
        if (
          arrow.type !== "ArrowFunctionExpression" ||
          arrow.params.length > 0 ||
          arrow.body.type !== "BlockStatement"
        ) {
          continue;
        }
        const binding = lexicalBinding(arrow.body);
        if (binding) {
          throw new Error(
            `A module wrapper at ${arrow.start} uses ${source.slice(binding.start, binding.end)} ` +
              `at ${binding.start}; it cannot become a function without changing what it means.`
          );
        }
        edits.push({
          start: arrow.start,
          end: arrow.body.start,
          text: arrow.async ? "async function()" : "function()",
        });
        wrappedChars += arrow.body.end - arrow.body.start;
      }
    }
  }
  let out = "";
  let cursor = 0;
  for (const edit of edits) {
    out += source.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  out += source.slice(cursor);
  return { source: out, wrappers: edits.length, wrappedChars };
}

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

/**
 * Bundles one Worker with `wrangler deploy --dry-run`, makes it Latin-1 and checks
 * its size. Returns false when it is over its budget.
 */
function buildWorker({ label, config, outDir, entry, budgetMib }) {
  rmSync(outDir, { recursive: true, force: true });
  execFileSync("wrangler", ["deploy", "--dry-run", "--config", config, "--outdir", outDir], {
    stdio: "inherit",
    // Without it wrangler hands an OpenNext project over to `opennextjs-cloudflare deploy`.
    env: { ...process.env, OPEN_NEXT_DEPLOY: "true" },
  });

  // wrangler names the bundle after the entry file.
  const workerPath = path.join(outDir, entry);
  const { source, escaped } = makeLatin1(readFileSync(workerPath, "utf8"));
  const wrapped = rewriteModuleWrappers(source);
  writeFileSync(workerPath, wrapped.source);
  process.stdout.write(
    `\n${label}: source is Latin-1, ${escaped} characters escaped in regex literals and comments.\n` +
      `${label}: ${wrapped.wrappers} module wrappers are functions, ` +
      `${(wrapped.wrappedChars / MIB).toFixed(2)} MiB of code no longer parsed twice.\n`
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
    `${label} code: ${totalMib.toFixed(2)} MiB uncompressed ` +
      `(budget ${budgetMib} MiB, platform limit ${PLATFORM_LIMIT_MIB} MiB)\n`
  );
  for (const { file, mib } of largest) process.stdout.write(`  ${mib.toFixed(2)} MiB  ${file}\n`);

  if (totalMib > budgetMib) {
    process.stderr.write(`\n${label} is over its ${budgetMib} MiB budget.\n`);
    return false;
  }
  return true;
}

function main() {
  const results = [
    // The routing Worker. Its whole point is to start fast, so a small budget
    // catches anything that pulls the Next server (or a large library) into it.
    buildWorker({
      label: "Routing Worker",
      config: "wrangler.jsonc",
      outDir: path.resolve(".open-next/upload"),
      entry: "worker.js",
      budgetMib: Number(process.env.ROUTING_WORKER_SIZE_BUDGET_MIB ?? 8),
    }),
    // The Next server Worker. Keep browser-only libraries out of the server
    // bundle (see docs/cloudflare-opennext-feasibility.md).
    buildWorker({
      label: "Next server Worker",
      config: "wrangler.app.jsonc",
      outDir: path.resolve(".open-next/upload-app"),
      entry: "next-server.js",
      budgetMib: Number(process.env.WORKER_SIZE_BUDGET_MIB ?? 62),
    }),
  ];
  if (results.includes(false)) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`\n${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
