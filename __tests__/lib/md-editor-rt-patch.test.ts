/**
 * @file Guards the md-editor-rt@6.4.1 pnpm patch (Sentry GAP-FRONTEND-1WY).
 * @description The patch (patches/md-editor-rt@6.4.1.patch) guards the
 * `maxLength` overlength check against a null `modelValue` and a null
 * `InputEvent.data`. If a future `pnpm up`/version bump drops or bypasses the
 * patch, the unguarded `modelValue.length + <var>.length` expression will be
 * reinstalled and this test fails, flagging the regression before it reaches
 * users again.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ES_CHUNK = path.resolve(process.cwd(), "node_modules/md-editor-rt/lib/es/chunks/Editor.mjs");
const CJS_CHUNK = path.resolve(
  process.cwd(),
  "node_modules/md-editor-rt/lib/cjs/chunks/Editor.cjs"
);

// The original crashing expression, in both operand orders (input handler:
// `modelValue.length + data.length`; paste handler: `data.length + modelValue.length`).
const UNGUARDED_A = /modelValue\.length\s*\+\s*[$\w]+\.length/;
const UNGUARDED_B = /[$\w]+\.length\s*\+\s*[$\w]*\.?modelValue\.length/;

describe("md-editor-rt@6.4.1 patch (GAP-FRONTEND-1WY)", () => {
  const chunks: Array<[string, string]> = [
    ["es/chunks/Editor.mjs", ES_CHUNK],
    ["cjs/chunks/Editor.cjs", CJS_CHUNK],
  ];

  it.each(chunks)("%s is installed", (_label, file) => {
    expect(existsSync(file)).toBe(true);
  });

  it.each(chunks)("%s has no unguarded modelValue.length + x.length", (_label, file) => {
    const source = readFileSync(file, "utf8");
    expect(source).not.toMatch(UNGUARDED_A);
    expect(source).not.toMatch(UNGUARDED_B);
  });

  it.each(chunks)('%s contains the guarded `?? ""` form', (_label, file) => {
    const source = readFileSync(file, "utf8");
    // Whitespace differs between the es (pretty) and cjs (minified) builds.
    expect(source).toMatch(/modelValue\s*\?\?\s*""/);
  });
});
