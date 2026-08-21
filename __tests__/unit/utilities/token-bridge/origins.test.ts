import {
  allTokenBridgeOrigins,
  isAllowedBridgeOrigin,
  TOKEN_BRIDGE_ORIGINS,
  TOKEN_BRIDGE_PREVIEW_ORIGINS,
  tokenBridgeOriginsFor,
} from "@/utilities/token-bridge/origins";

const PATTERNS = ["https://www.filpgf.io", "https://*.vercel.app", "http://localhost:4321"];

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
    expect(allTokenBridgeOrigins()).toEqual(expect.arrayContaining(TOKEN_BRIDGE_PREVIEW_ORIGINS));
  });
});
