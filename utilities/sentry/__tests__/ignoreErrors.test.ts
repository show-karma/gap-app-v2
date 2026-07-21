import { describe, expect, it } from "vitest";
import { sentryIgnoreErrors } from "../ignoreErrors";

/**
 * Returns true when at least one entry in the ignore list matches `message`,
 * mirroring how Sentry evaluates `ignoreErrors` (substring match for strings,
 * `.test()` for regexes).
 */
function isIgnored(message: string): boolean {
  return sentryIgnoreErrors.some((pattern) =>
    typeof pattern === "string" ? message.includes(pattern) : pattern.test(message)
  );
}

describe("sentryIgnoreErrors — chunk load errors", () => {
  // ChunkLoadError must NOT be in the ignore list. Sentry's `ignoreErrors`
  // filters every event, including the manual `Sentry.captureException` the
  // error boundaries fire on a non-recoverable second attempt. Suppressing the
  // signature here would silently drop the genuinely-broken cases we want to
  // see. Recovery is gated by the boundaries (see utilities/isChunkLoadError.ts),
  // not here.
  it("does not ignore the Turbopack 'Failed to load chunk' signature", () => {
    expect(
      isIgnored("Error: Failed to load chunk /_next/static/chunks/abc.js from module 12")
    ).toBe(false);
  });

  it("does not ignore the webpack 'Loading chunk … failed' signature", () => {
    expect(isIgnored("Loading chunk app-pages-internals failed")).toBe(false);
  });

  it("does not ignore the bare ChunkLoadError name", () => {
    expect(isIgnored("ChunkLoadError")).toBe(false);
  });

  it("does not ignore unrelated runtime errors", () => {
    expect(isIgnored("Cannot read property 'map' of undefined")).toBe(false);
  });
});

describe("sentryIgnoreErrors — obfuscated injected-script errors", () => {
  it("ignores Safari's 'Can't find variable: _0x…' ReferenceError", () => {
    expect(isIgnored("ReferenceError: Can't find variable: _0x4761")).toBe(true);
  });

  it("ignores V8's '_0x… is not defined' ReferenceError", () => {
    expect(isIgnored("_0x1ad251 is not defined")).toBe(true);
  });

  it("does NOT ignore a genuine application ReferenceError", () => {
    expect(isIgnored("Can't find variable: fetchApplication")).toBe(false);
    expect(isIgnored("myLocalVar is not defined")).toBe(false);
  });
});
