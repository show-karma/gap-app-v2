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
import { NOTEBOOK_ASSET_PATH_PREFIX, NOTEBOOK_ASSET_SOURCE } from "@/utilities/notebooks/csp";
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
const CARVE_OUT_SOURCES = new Set<string>([TOKEN_BRIDGE_PATH, NOTEBOOK_ASSET_SOURCE]);

describe("framing headers", () => {
  it("keeps every route but the bridge same-origin only", async () => {
    const rules = await getHeaderRules();
    const catchAll = framingRules(rules).find((rule) => !CARVE_OUT_SOURCES.has(rule.source));

    expect(catchAll).toBeDefined();
    expect(cspOf(catchAll!)).toContain("frame-ancestors 'self';");
    expect(xfoOf(catchAll!)).toBe("SAMEORIGIN");
  });

  it("excludes exactly the bridge path and the notebook prefix from the catch-all", async () => {
    const rules = await getHeaderRules();
    const catchAll = framingRules(rules).find((rule) => !CARVE_OUT_SOURCES.has(rule.source))!;

    // Two carve-outs, both spelled out: the bridge path exactly (`$`), and the
    // notebook asset prefix (`/`). Neither is a loose prefix that could grow to
    // cover a sibling route.
    expect(catchAll.source).toBe(
      `/((?!${TOKEN_BRIDGE_PATH.slice(1)}$|${NOTEBOOK_ASSET_PATH_PREFIX.slice(1)}/).*)`
    );
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

  it("has exactly three framing rules: the catch-all, the bridge and the notebooks", async () => {
    const rules = await getHeaderRules();
    const sources = framingRules(rules).map((rule) => rule.source);

    expect(sources).toHaveLength(3);
    expect(sources).toContain(TOKEN_BRIDGE_PATH);
    expect(sources).toContain(NOTEBOOK_ASSET_SOURCE);
  });

  /**
   * The notebook carve-out exists to ADD directives the bundle needs
   * (wasm-unsafe-eval, blob: workers) and to CONSTRAIN where a running notebook
   * may connect — never to widen who may frame this app. Its framing posture
   * must stay identical to the catch-all's.
   */
  describe("notebook bundles", () => {
    it("stays same-origin-only, exactly like every other route", async () => {
      const rules = await getHeaderRules();
      const notebooks = framingRules(rules).find((rule) => rule.source === NOTEBOOK_ASSET_SOURCE);

      expect(notebooks).toBeDefined();
      expect(cspOf(notebooks!)).toContain("frame-ancestors 'self'");
      expect(xfoOf(notebooks!)).toBe("SAMEORIGIN");
    });

    // The directive that makes same-origin hosting survivable: a script inside
    // the frame can reach the GAP API and nothing else. A CDN or package host
    // here would let it fetch and execute arbitrary code on this origin.
    it("confines the frame to self and the GAP API", async () => {
      const rules = await getHeaderRules();
      const csp = cspOf(framingRules(rules).find((rule) => rule.source === NOTEBOOK_ASSET_SOURCE)!);
      const connectSrc = csp
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("connect-src"))!;

      expect(connectSrc).toBeDefined();
      for (const forbidden of [
        "pypi.org",
        "files.pythonhosted.org",
        "cdn.jsdelivr.net",
        "unpkg.com",
        "*",
      ]) {
        expect(connectSrc).not.toContain(forbidden);
      }
    });

    // `default-src 'none'` is the denial: every fetch type the bundle may make
    // is then named explicitly, so framing and plugins are refused by fallback
    // rather than by a directive that could be edited away on its own.
    it("denies everything the contract does not name", async () => {
      const rules = await getHeaderRules();
      const csp = cspOf(framingRules(rules).find((rule) => rule.source === NOTEBOOK_ASSET_SOURCE)!);

      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).not.toContain("frame-src");
    });

    // Sandboxed without allow-same-origin means an opaque origin, so the
    // bundle's own fetches for the vendored runtime and wheels are cross-origin
    // with Origin: null. Without this header the notebook never boots.
    it("lets the opaque-origin frame fetch its own subresources", async () => {
      const rules = await getHeaderRules();
      const notebooks = rules.find((rule) => rule.source === NOTEBOOK_ASSET_SOURCE)!;
      const header = (key: string) => notebooks.headers.find((h) => h.key === key)?.value;

      expect(header("Access-Control-Allow-Origin")).toBe("*");
      expect(header("Access-Control-Allow-Credentials")).toBeUndefined();
      expect(header("X-Content-Type-Options")).toBe("nosniff");
    });
  });
});
