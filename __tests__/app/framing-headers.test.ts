/**
 * Unit Tests: framing headers
 *
 * /ask-karma was once framable by filpgf.io, which ran sign-in in an overlay on
 * this origin. That is gone — the landing site hands off to this app instead —
 * so the carve-out is gone with it and every route is same-origin only again.
 *
 * These assertions exist to keep it that way. Reopening `frame-ancestors` is
 * the kind of change that looks like configuration and lands like a
 * clickjacking surface, so it should have to break a test first.
 */

import nextConfig from "@/next.config";

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

async function getHeaderRules(): Promise<HeaderRule[]> {
  const headers = nextConfig.headers;
  if (!headers) throw new Error("next.config defines no headers()");
  return (await headers()) as HeaderRule[];
}

const cspOf = (rule: HeaderRule) =>
  rule.headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";

/** The rule carrying the framing headers, whatever its source pattern. */
const framingRule = (rules: HeaderRule[]) =>
  rules.find((rule) => cspOf(rule).includes("frame-ancestors")) as HeaderRule;

describe("framing headers", () => {
  it("keeps every route same-origin only", async () => {
    const rules = await getHeaderRules();
    const rule = framingRule(rules);

    expect(rule).toBeDefined();
    expect(cspOf(rule)).toContain("frame-ancestors 'self';");
    expect(rule.headers.find((header) => header.key === "X-Frame-Options")?.value).toBe(
      "SAMEORIGIN"
    );
  });

  it("names no external framing origin at all", async () => {
    const rules = await getHeaderRules();

    for (const rule of rules) {
      const csp = cspOf(rule);
      if (!csp.includes("frame-ancestors")) continue;
      // The landing site, its previews, and the local dev origins that used to
      // be allowed. Any of them reappearing means the overlay came back.
      expect(csp).not.toContain("filpgf.io");
      expect(csp).not.toContain("vercel.app");
      expect(csp).not.toContain("localhost");
    }
  });

  it("carves no route out of the framing headers", async () => {
    const rules = await getHeaderRules();

    // The carve-out was a negative lookahead excluding /ask-karma from the
    // catch-all so a second, laxer rule could cover it. Nothing should be
    // excluded now, and no route should have framing headers of its own.
    const framingRules = rules.filter((rule) => cspOf(rule).includes("frame-ancestors"));
    expect(framingRules).toHaveLength(1);
    expect(framingRules[0].source).not.toContain("(?!");
  });

  it("leaves no embed apparatus behind in the config", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const source = await readFile(resolve(process.cwd(), "next.config.ts"), "utf8");

    // Dead allowlists are worse than none: they read as though something still
    // depends on them, and invite an origin being added back "while we're here".
    expect(source).not.toContain("EMBEDDING_ORIGINS");
    expect(source).not.toContain("EMBEDDABLE_ROUTES");
    expect(source).not.toContain("allowsPreviewEmbedders");
  });
});
