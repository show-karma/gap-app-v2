import {
  allTokenBridgeOrigins,
  isAllowedBridgeOrigin,
  TOKEN_BRIDGE_ORIGINS,
  TOKEN_BRIDGE_PREVIEW_FRAME_ORIGINS,
  TOKEN_BRIDGE_PREVIEW_ORIGINS,
  tokenBridgeOriginsFor,
} from "@/utilities/token-bridge/origins";

const PATTERNS = [
  "https://www.filpgf.io",
  "https://*.vercel.app",
  "https://filpgf-*.vercel.app",
  "http://localhost:4321",
];

describe("isAllowedBridgeOrigin", () => {
  it("accepts a literal origin exactly", () => {
    expect(isAllowedBridgeOrigin("https://www.filpgf.io", PATTERNS)).toBe(true);
  });

  it("rejects a different subdomain, scheme, or port of a literal", () => {
    expect(isAllowedBridgeOrigin("https://app.filpgf.io", PATTERNS)).toBe(false);
    expect(isAllowedBridgeOrigin("http://www.filpgf.io", PATTERNS)).toBe(false);
    expect(isAllowedBridgeOrigin("https://www.filpgf.io:8443", PATTERNS)).toBe(false);
    expect(isAllowedBridgeOrigin("http://localhost:4322", PATTERNS)).toBe(false);
  });

  it("rejects lookalike hosts that merely contain the allowed one", () => {
    expect(isAllowedBridgeOrigin("https://www.filpgf.io.evil.com", PATTERNS)).toBe(false);
    expect(isAllowedBridgeOrigin("https://evilwww.filpgf.io", PATTERNS)).toBe(false);
  });

  it("matches a wildcard against any subdomain, never the bare domain", () => {
    expect(isAllowedBridgeOrigin("https://filpgf-git-feat-x-karma.vercel.app", PATTERNS)).toBe(
      true
    );
    expect(isAllowedBridgeOrigin("https://a.b.vercel.app", PATTERNS)).toBe(true);
    expect(isAllowedBridgeOrigin("https://vercel.app", PATTERNS)).toBe(false);
    expect(isAllowedBridgeOrigin("https://notvercel.app", PATTERNS)).toBe(false);
    expect(isAllowedBridgeOrigin("http://x.vercel.app", PATTERNS)).toBe(false);
  });

  it("lets an in-label wildcard match one label's worth of characters only", () => {
    const prefixed = ["https://filpgf-*.vercel.app"];
    expect(isAllowedBridgeOrigin("https://filpgf-abc123-karma.vercel.app", prefixed)).toBe(true);
    expect(isAllowedBridgeOrigin("https://filpgf-git-feat-x-karma.vercel.app", prefixed)).toBe(
      true
    );
    // Another project on the same platform.
    expect(isAllowedBridgeOrigin("https://evil-abc123.vercel.app", prefixed)).toBe(false);
    // The prefix somewhere other than the start, or a dot inside the wildcard.
    expect(isAllowedBridgeOrigin("https://evil-filpgf-x.vercel.app", prefixed)).toBe(false);
    expect(isAllowedBridgeOrigin("https://filpgf-x.evil.vercel.app", prefixed)).toBe(false);
    // Nothing after the prefix.
    expect(isAllowedBridgeOrigin("https://filpgf-.vercel.app", prefixed)).toBe(false);
    // Regex metacharacters in the literal part are literal.
    expect(isAllowedBridgeOrigin("https://filpgfXabc.vercel.app", prefixed)).toBe(false);
  });

  it("refuses anything that is not a bare origin", () => {
    expect(isAllowedBridgeOrigin("null", PATTERNS)).toBe(false);
    expect(isAllowedBridgeOrigin("", PATTERNS)).toBe(false);
    expect(isAllowedBridgeOrigin("https://www.filpgf.io/path", PATTERNS)).toBe(false);
    expect(isAllowedBridgeOrigin("www.filpgf.io", PATTERNS)).toBe(false);
  });

  it("matches nothing against an empty allowlist", () => {
    expect(isAllowedBridgeOrigin("https://www.filpgf.io", [])).toBe(false);
  });
});

describe("tenant allowlists", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it("gives filecoin its two landing-site origins", () => {
    expect(TOKEN_BRIDGE_ORIGINS.filecoin).toEqual(["https://filpgf.io", "https://www.filpgf.io"]);
  });

  it("gives a tenant with no embedder nothing — not even the preview hosts", () => {
    process.env.NODE_ENV = "development";
    expect(tokenBridgeOriginsFor("karma")).toEqual([]);
    expect(tokenBridgeOriginsFor(null)).toEqual([]);
  });

  it("adds the preview hosts outside production builds only", () => {
    process.env.NODE_ENV = "development";
    process.env.VERCEL_ENV = undefined;
    process.env.NEXT_PUBLIC_VERCEL_ENV = undefined;
    expect(tokenBridgeOriginsFor("filecoin")).toEqual([
      ...TOKEN_BRIDGE_ORIGINS.filecoin!,
      ...TOKEN_BRIDGE_PREVIEW_ORIGINS,
    ]);

    process.env.NODE_ENV = "production";
    expect(tokenBridgeOriginsFor("filecoin")).toEqual(TOKEN_BRIDGE_ORIGINS.filecoin);
    expect(allTokenBridgeOrigins()).toEqual(TOKEN_BRIDGE_ORIGINS.filecoin);
  });

  it("adds the preview hosts to a Vercel preview even though NODE_ENV is production", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    expect(allTokenBridgeOrigins()).toEqual(
      expect.arrayContaining(TOKEN_BRIDGE_PREVIEW_FRAME_ORIGINS)
    );
  });

  it("never hands the bridge a bare *.vercel.app — only the CSP gets that", () => {
    // Anyone can deploy to vercel.app. The CSP must name the bare wildcard
    // (host-sources cannot express a prefix), but the bridge's own allowlist
    // must carry the project prefix so a stranger's preview is answered with
    // nothing.
    expect(TOKEN_BRIDGE_PREVIEW_ORIGINS).not.toContain("https://*.vercel.app");
    expect(TOKEN_BRIDGE_PREVIEW_ORIGINS).toContain("https://filpgf-*.vercel.app");
    expect(TOKEN_BRIDGE_PREVIEW_FRAME_ORIGINS).toContain("https://*.vercel.app");
    expect(isAllowedBridgeOrigin("https://anyone.vercel.app", TOKEN_BRIDGE_PREVIEW_ORIGINS)).toBe(
      false
    );
  });
});
