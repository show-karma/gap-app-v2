import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `proxy.ts` answers every POST to a page with 405 (`isPagePost`), because no
 * POST to a page is serveable today and every one observed was a crawler or a
 * probe that crashed a render (Sentry GAP-FRONTEND-27P, GAP-FRONTEND-27R).
 *
 * That guard would silently swallow the first request a page is ever meant to
 * answer: the POST would never reach Next, and nothing would log. These are the
 * tripwires. If one fails, widen `isPagePost` to let that POST through (a fetch
 * Server Action carries a `next-action` header; a no-JS `<form action>` posts
 * multipart) BEFORE landing the change that tripped it.
 *
 * Deliberately blunt: a match is a prompt to re-read the guard, not an
 * accusation. Three ways a callable server function appears, none of which the
 * others catch:
 *
 *   1. A `"use server"` directive in this repo's own source.
 *   2. A dependency that ships actions — importing next-sanity's `SanityLive`
 *      or `VisualEditing` adds `revalidateSyncTags` / `revalidateRootLayout`
 *      with no directive anywhere in `app/`.
 *   3. A function bound to `<form action={…}>`. A `"use cache"` function can be
 *      bound that way with no `"use server"` in sight, so the build's
 *      server-reference manifest holding only `$$RSC_SERVER_CACHE_*` entries
 *      does NOT prove no function is callable — Next's own `hasServerActions()`
 *      counts cache entries too (`next/dist/server/app-render/action-handler.js`).
 */

const ROOT = path.resolve(__dirname, "..");
const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".vercel",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "public",
  "storybook-static",
  "test-results",
]);
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;

// Every spelling of the directive, wherever it sits: on its own line, after a
// comment, inline in a function body, or sharing a line with the export. Line
// anchoring missed all but the first, which is how a real action would slip
// past a tripwire that looked like it was working.
const USE_SERVER_DIRECTIVE = /(["'])use server\1/;

// Dependency entrypoints that bring Server Actions with them.
const ACTION_SHIPPING_IMPORTS =
  /from\s+["'](?:next-sanity\/(?:live|visual-editing)(?:\/[^"']*)?)["']|\b(?:SanityLive|VisualEditing|defineLive)\b/;

// A function bound to a form's action prop — the one way a `"use cache"`
// function becomes browser-callable without any `"use server"`.
const FORM_ACTION_BINDING = /<form[^>]*\saction=\{/;

// This file names the directive to describe it, and is not a route.
const SELF = path.relative(ROOT, __filename);

function collectSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        collectSourceFiles(path.join(dir, entry.name), files);
      }
    } else if (SOURCE_FILE.test(entry.name)) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function filesMatching(pattern: RegExp): string[] {
  return collectSourceFiles(ROOT)
    .map((file) => ({ file, relative: path.relative(ROOT, file) }))
    .filter(({ relative }) => relative !== SELF)
    .filter(({ file }) => pattern.test(fs.readFileSync(file, "utf8")))
    .map(({ relative }) => relative);
}

describe("page POST guard premise", () => {
  it("no source file declares a Server Action", () => {
    expect(filesMatching(USE_SERVER_DIRECTIVE)).toEqual([]);
  });

  it("no source file imports a dependency that ships Server Actions", () => {
    expect(filesMatching(ACTION_SHIPPING_IMPORTS)).toEqual([]);
  });

  it("no form binds a server function to its action prop", () => {
    expect(filesMatching(FORM_ACTION_BINDING)).toEqual([]);
  });
});
