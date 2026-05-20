const INDEXER_URL = "http://localhost:4000";
const OAUTH_ISSUER = "https://oauth.test.karmahq.xyz";

describe("/.well-known/oauth-protected-resource route handler", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns 200 with a static RFC 9728 metadata document", async () => {
    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
  });

  it("sets resource to the indexer's MCP endpoint", async () => {
    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = GET();
    const body = await res.json();
    expect(body.resource).toBe(`${INDEXER_URL}/v2/mcp`);
  });

  it("advertises NEXT_PUBLIC_GAP_OAUTH_URL as the authorization server", async () => {
    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = GET();
    const body = await res.json();
    expect(body.authorization_servers).toEqual([OAUTH_ISSUER]);
  });

  it("advertises the mcp scope", async () => {
    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = GET();
    const body = await res.json();
    expect(body.scopes_supported).toEqual(["mcp"]);
  });

  it("advertises header-based bearer auth", async () => {
    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = GET();
    const body = await res.json();
    expect(body.bearer_methods_supported).toEqual(["header"]);
  });

  it("advertises RS256 signing algorithm", async () => {
    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = GET();
    const body = await res.json();
    expect(body.resource_signing_alg_values_supported).toEqual(["RS256"]);
  });

  it("points resource_documentation at the authorization-server metadata path", async () => {
    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = GET();
    const body = await res.json();
    expect(body.resource_documentation).toBe(
      `${OAUTH_ISSUER}/.well-known/oauth-authorization-server`
    );
  });

  it("sets wide-open CORS headers so agent crawlers can read it", async () => {
    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("sets long-lived Cache-Control on success", async () => {
    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = GET();
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });

  it("OPTIONS returns 204 with CORS headers", async () => {
    const { OPTIONS } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  // Placed last so the per-test doMock can't leak into other tests that
  // rely on the global setup-mocks env (vi.doMock persists module cache
  // overrides even when vi.resetModules() runs in beforeEach).
  it("throws when NEXT_PUBLIC_GAP_OAUTH_URL is unset", async () => {
    vi.doMock("@/utilities/enviromentVars", () => ({
      envVars: {
        NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
        NEXT_PUBLIC_GAP_OAUTH_URL: "",
      },
    }));
    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    expect(() => GET()).toThrow(/NEXT_PUBLIC_GAP_OAUTH_URL is not set/);
    vi.doUnmock("@/utilities/enviromentVars");
  });
});
