/**
 * Unit Tests: framing headers
 *
 * Every route is same-origin only, with one deliberate exception: the token
 * bridge, which a tenant's marketing site frames to be handed a signed-in
 * visitor's access token (`utilities/token-bridge/origins.ts`).
 *
 * These assertions keep the exception that narrow. Reopening `frame-ancestors`
 * is the kind of change that looks like configuration and lands like a
 * clickjacking surface, so widening it — another route, another origin — has
 * to break a test first. The carve-out's mechanics are also pinned: a second
 * rule layered over the catch-all would emit the CSP header twice, and
 * browsers enforce the intersection, silently restoring the stricter policy.
 */

import nextConfig from "@/next.config";
import {
  TOKEN_BRIDGE_ORIGINS,
  TOKEN_BRIDGE_PATH,
  TOKEN_BRIDGE_PREVIEW_FRAME_ORIGINS,
} from "@/utilities/token-bridge/origins";

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

async function getHeaderRules(): Promise<HeaderRule[]> {
  const headers = nextConfig.headers;
  if (!headers) throw new Error("next.config defines no headers()");
  return (await headers()) as HeaderRule[];
}

const cspOf = (rule: HeaderRule) =>
  rule.headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";

const xfoOf = (rule: HeaderRule) =>
  rule.headers.find((header) => header.key === "X-Frame-Options")?.value;

const framingRules = (rules: HeaderRule[]) =>
  rules.filter((rule) => cspOf(rule).includes("frame-ancestors"));

describe("framing headers", () => {
  it("keeps every route but the bridge same-origin only", async () => {
    const rules = await getHeaderRules();
    const catchAll = framingRules(rules).find((rule) => rule.source !== TOKEN_BRIDGE_PATH);

    expect(catchAll).toBeDefined();
    expect(cspOf(catchAll!)).toContain("frame-ancestors 'self';");
    expect(xfoOf(catchAll!)).toBe("SAMEORIGIN");
  });

  it("excludes exactly the bridge path from the catch-all", async () => {
    const rules = await getHeaderRules();
    const catchAll = framingRules(rules).find((rule) => rule.source !== TOKEN_BRIDGE_PATH)!;

    // A negative lookahead on the bridge path alone — not a prefix, not a
    // pattern that could grow to cover a sibling route.
    expect(catchAll.source).toBe(`/((?!${TOKEN_BRIDGE_PATH.slice(1)}$).*)`);
  });

  it("lets only the configured embedders frame the bridge", async () => {
    const rules = await getHeaderRules();
    const bridge = framingRules(rules).find((rule) => rule.source === TOKEN_BRIDGE_PATH);

    expect(bridge).toBeDefined();
    const csp = cspOf(bridge!);
    expect(csp).toContain("frame-ancestors 'self'");
    for (const origin of Object.values(TOKEN_BRIDGE_ORIGINS).flat()) {
      expect(csp).toContain(origin!);
    }
    // X-Frame-Options has no allowlist form; it is dropped here, not faked.
    expect(xfoOf(bridge!)).toBeUndefined();
  });

  it("names no framing origin outside the bridge allowlist", async () => {
    const rules = await getHeaderRules();
    const allowed = new Set([
      "'self'",
      ...Object.values(TOKEN_BRIDGE_ORIGINS).flat(),
      ...TOKEN_BRIDGE_PREVIEW_FRAME_ORIGINS,
    ]);

    for (const rule of framingRules(rules)) {
      const directive = cspOf(rule)
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("frame-ancestors"))!;
      const sources = directive.replace("frame-ancestors", "").trim().split(/\s+/);
      for (const source of sources) {
        expect(allowed.has(source)).toBe(true);
      }
    }
  });

  it("has exactly two framing rules: the catch-all and the bridge", async () => {
    const rules = await getHeaderRules();
    const sources = framingRules(rules).map((rule) => rule.source);

    expect(sources).toHaveLength(2);
    expect(sources).toContain(TOKEN_BRIDGE_PATH);
  });
});

/**
 * The notebook custom-page sandbox has to be in `frame-src`, or tier B does
 * not render anywhere.
 *
 * This is the failure mode worth pinning because it is invisible: with the
 * origin missing the browser makes NO REQUEST AT ALL for the frame — nothing
 * in the network log, no console error worth the name, just a broken frame and
 * a correct-looking iframe element. It cost a browser session to find once.
 *
 * `frame-src` is also the opposite direction from `frame-ancestors` above:
 * that one governs who may frame US, this one what we may frame. Widening this
 * admits a document into our page, so it stays env-driven and empty by
 * default rather than accumulating every environment's host as a literal.
 */
describe("notebook sandbox frame-src", () => {
  const ORIGIN = "https://sandbox.example";

  async function frameSrcWith(origin?: string): Promise<string> {
    const previous = process.env.NEXT_PUBLIC_NOTEBOOK_SANDBOX_ORIGIN;
    if (origin === undefined) delete process.env.NEXT_PUBLIC_NOTEBOOK_SANDBOX_ORIGIN;
    else process.env.NEXT_PUBLIC_NOTEBOOK_SANDBOX_ORIGIN = origin;

    // The config reads the variable at module scope, so it has to be reloaded
    // rather than merely re-invoked.
    vi.resetModules();
    const reloaded = (await import("@/next.config")).default;
    const rules = (await reloaded.headers!()) as HeaderRule[];

    if (previous === undefined) delete process.env.NEXT_PUBLIC_NOTEBOOK_SANDBOX_ORIGIN;
    else process.env.NEXT_PUBLIC_NOTEBOOK_SANDBOX_ORIGIN = previous;

    return rules.map(cspOf).find((csp) => csp.includes("frame-src")) ?? "";
  }

  it("should_allow_the_configured_sandbox_origin_to_be_framed", async () => {
    const csp = await frameSrcWith(ORIGIN);

    expect(csp).toContain(ORIGIN);
  });

  // Fail-closed, exactly as the renderer is: no sandbox configured means the
  // tier is off, and the policy stays precisely as strict as it is today.
  it("should_add_nothing_when_no_sandbox_is_configured", async () => {
    const csp = await frameSrcWith(undefined);

    expect(csp).toContain("frame-src 'self'");
    expect(csp).not.toContain("undefined");
    expect(csp.trim()).not.toMatch(/\s{2,}/);
  });

  // The existing allowances are not this feature's to touch.
  it("should_leave_the_established_frame_sources_alone", async () => {
    const csp = await frameSrcWith(ORIGIN);

    for (const source of ["'self'", "https://auth.privy.io", "https://js.stripe.com"]) {
      expect(csp).toContain(source);
    }
  });
});
