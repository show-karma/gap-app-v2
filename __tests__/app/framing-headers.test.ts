/**
 * Unit Tests: framing headers
 *
 * The filpgf.io landing site opens /ask-karma in an overlay, which only works
 * because that one route relaxes frame-ancestors. These assertions guard the
 * two halves of that trade: the route stays embeddable by the sites we
 * operate, and nothing else does.
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

describe("framing headers", () => {
  it("lets the landing site frame /ask-karma", async () => {
    const rules = await getHeaderRules();
    const askKarma = rules.find((rule) => rule.source === "/ask-karma");

    expect(askKarma).toBeDefined();
    const csp = cspOf(askKarma as HeaderRule);
    expect(csp).toContain("frame-ancestors 'self' https://filpgf.io https://www.filpgf.io");
  });

  it("drops X-Frame-Options on the embeddable route, since it cannot express an allowlist", async () => {
    const rules = await getHeaderRules();
    const askKarma = rules.find((rule) => rule.source === "/ask-karma") as HeaderRule;

    expect(askKarma.headers.some((header) => header.key === "X-Frame-Options")).toBe(false);
  });

  it("keeps every other route same-origin only", async () => {
    const rules = await getHeaderRules();
    const catchAll = rules.find((rule) => rule.source.startsWith("/((?!"));

    expect(catchAll).toBeDefined();
    expect(cspOf(catchAll as HeaderRule)).toContain("frame-ancestors 'self';");
    expect(cspOf(catchAll as HeaderRule)).not.toContain("filpgf.io");
    expect(
      (catchAll as HeaderRule).headers.find((header) => header.key === "X-Frame-Options")?.value
    ).toBe("SAMEORIGIN");
  });

  it("excludes the embeddable route from the catch-all, so the CSP is not emitted twice", async () => {
    const rules = await getHeaderRules();
    const catchAll = rules.find((rule) => rule.source.startsWith("/((?!")) as HeaderRule;

    // Next compiles `source` with path-to-regexp; the negative lookahead is
    // what keeps /ask-karma out. Two rules setting the same header on one path
    // would emit it twice, and browsers enforce the intersection — which would
    // silently restore the stricter frame-ancestors and break the embed.
    expect(catchAll.source).toContain("ask-karma");
    expect(catchAll.source).toContain("(?!");
  });
});
