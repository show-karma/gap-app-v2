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

import { afterEach, describe, expect, it, vi } from "vitest";
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

/** Routes that carry their own CSP instead of the catch-all's. */
const CARVE_OUT_SOURCES = new Set<string>([TOKEN_BRIDGE_PATH]);

describe("framing headers", () => {
  it("keeps every route but the bridge same-origin only", async () => {
    const rules = await getHeaderRules();
    const catchAll = framingRules(rules).find((rule) => !CARVE_OUT_SOURCES.has(rule.source));

    expect(catchAll).toBeDefined();
    expect(cspOf(catchAll!)).toContain("frame-ancestors 'self';");
    expect(xfoOf(catchAll!)).toBe("SAMEORIGIN");
  });

  it("excludes exactly the bridge path from the catch-all", async () => {
    const rules = await getHeaderRules();
    const catchAll = framingRules(rules).find((rule) => !CARVE_OUT_SOURCES.has(rule.source))!;

    // One carve-out, spelled out as the bridge path exactly (`$`) — not a
    // loose prefix that could grow to cover a sibling route.
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

  /**
   * Notebook bundles are not served by this app at all. They live on their
   * own origin and are framed from there, so the only thing this config says
   * about them is which origin `frame-src` admits — and it says nothing when
   * no origin is configured. The bundle's own CSP (connect-src to the GAP API
   * only, no package hosts) ships with the bundle, from the notebooks repo.
   */
  describe("notebook bundles", () => {
    const ORIGIN = "https://gap-notebooks.vercel.app";

    const frameSrcOf = (csp: string) =>
      csp
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("frame-src"))!;

    async function freshHeaderRules(): Promise<HeaderRule[]> {
      vi.resetModules();
      const fresh = (await import("@/next.config")).default;
      return (await fresh.headers!()) as HeaderRule[];
    }

    afterEach(() => {
      vi.unstubAllEnvs();
      vi.resetModules();
    });

    it("serves no bundle route of its own", async () => {
      const rules = await getHeaderRules();

      expect(rules.map((rule) => rule.source)).not.toContain("/notebooks/:path*");
    });

    it("admits the configured notebooks origin in frame-src, on every framing rule", async () => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", ORIGIN);
      const rules = await freshHeaderRules();

      for (const rule of framingRules(rules)) {
        expect(frameSrcOf(cspOf(rule)).split(/\s+/)).toContain(ORIGIN);
      }
    });

    it("admits no notebook host when none is configured", async () => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", "");
      const rules = await freshHeaderRules();

      for (const rule of framingRules(rules)) {
        expect(frameSrcOf(cspOf(rule))).not.toContain("notebooks");
      }
    });

    it("never widens frame-src to a wildcard for notebooks", async () => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", ORIGIN);
      const rules = await freshHeaderRules();

      for (const rule of framingRules(rules)) {
        const sources = frameSrcOf(cspOf(rule)).split(/\s+/);
        expect(sources).not.toContain("*");
        expect(sources).not.toContain("https:");
        expect(sources.filter((source) => source.includes("vercel.app"))).toEqual([ORIGIN]);
      }
    });
  });
});
