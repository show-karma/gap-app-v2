import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `proxy.ts` answers every POST to a page with 405 (`isPagePost`), because the
 * app defines no Server Actions and every such POST was a crawler or a probe
 * that crashed a render (Sentry GAP-FRONTEND-27P, GAP-FRONTEND-27R).
 *
 * That guard would silently break the first Server Action anyone adds: the
 * action's POST would never reach Next. This test is the tripwire. If it fails,
 * let POSTs that carry a `next-action` header (and multipart forms, if the
 * action backs a `<form action>`) through `isPagePost` before deleting it.
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
const USE_SERVER_DIRECTIVE = /^\s*(["'])use server\1;?\s*$/m;

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

describe("page POST guard premise", () => {
  it("the app defines no Server Actions", () => {
    const offenders = collectSourceFiles(ROOT)
      .filter((file) => USE_SERVER_DIRECTIVE.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(ROOT, file));

    expect(offenders).toEqual([]);
  });
});
