import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PAGES } from "@/utilities/pages";

/**
 * Issue #1312: bare `/community` 404'd because nothing handled it — the listing
 * lives at `/communities`. The fix declares a permanent redirect in next.config.ts
 * from `/community` to the community listing, so the bare path redirects at the edge
 * instead of dead-ending on a 404 (cleaner than shipping a client route that only
 * calls `permanentRedirect`).
 */
describe("issue #1312 — bare /community redirects to the community listing", () => {
  const configPath = path.resolve(__dirname, "..", "..", "next.config.ts");

  it("next.config.ts exists", () => {
    expect(existsSync(configPath)).toBe(true);
  });

  it("permanently redirects /community to the community listing", () => {
    const source = readFileSync(configPath, "utf8");
    // Match the redirect entry whose source is exactly "/community" (not a sub-path
    // like "/community/:communityId/..."). `\s*` tolerates formatting/line breaks.
    const blockRe =
      /\{\s*source:\s*["']\/community["']\s*,\s*destination:\s*["']([^"']+)["']\s*,\s*permanent:\s*(true|false)\s*,?\s*\}/;
    const match = source.match(blockRe);
    expect(match, "a redirect with source exactly '/community' should exist").not.toBeNull();
    expect(match?.[1]).toBe(PAGES.COMMUNITIES);
    expect(match?.[2]).toBe("true");
    expect(PAGES.COMMUNITIES).toBe("/communities");
  });
});
