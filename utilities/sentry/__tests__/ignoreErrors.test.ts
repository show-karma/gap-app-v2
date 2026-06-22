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
  it("ignores the Turbopack 'Failed to load chunk' signature", () => {
    expect(
      isIgnored("Error: Failed to load chunk /_next/static/chunks/abc.js from module 12")
    ).toBe(true);
  });

  it("ignores the webpack 'Loading chunk … failed' signature", () => {
    expect(isIgnored("Loading chunk app-pages-internals failed")).toBe(true);
  });

  it("ignores the bare ChunkLoadError name", () => {
    expect(isIgnored("ChunkLoadError")).toBe(true);
  });

  it("does not ignore unrelated runtime errors", () => {
    expect(isIgnored("Cannot read property 'map' of undefined")).toBe(false);
  });
});
