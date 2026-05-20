import * as Sentry from "@sentry/nextjs";

const INDEXER_URL = "http://localhost:4000";

describe("/.well-known/oauth-protected-resource route handler", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("proxies the upstream OAuth metadata response when it succeeds", async () => {
    const upstream = {
      resource: `${INDEXER_URL}/v2/mcp`,
      authorization_servers: [`${INDEXER_URL}`],
      scopes_supported: ["mcp"],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => upstream }));

    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual(upstream);
  });

  it("calls upstream at /.well-known/oauth-protected-resource/v2/mcp with timeout + ISR", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    await GET();

    expect(fetchMock).toHaveBeenCalledWith(
      `${INDEXER_URL}/.well-known/oauth-protected-resource/v2/mcp`,
      expect.objectContaining({
        next: { revalidate: 3600 },
        signal: expect.any(AbortSignal),
      })
    );
  });

  it("returns 502 + fallback when upstream responds non-OK", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const captureSpy = vi.spyOn(Sentry, "captureException");

    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body).toEqual({ error: "upstream_unavailable" });
    expect(captureSpy).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: { route: "well-known/oauth-protected-resource" },
        extra: { status: 503 },
      })
    );
  });

  it("returns 502 + fallback and captures when upstream throws", async () => {
    const fetchError = new Error("ECONNREFUSED");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(fetchError));
    const captureSpy = vi.spyOn(Sentry, "captureException");

    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body).toEqual({ error: "upstream_unavailable" });
    expect(captureSpy).toHaveBeenCalledWith(fetchError, {
      tags: { route: "well-known/oauth-protected-resource" },
    });
  });

  it("uses no-store Cache-Control on 502 responses so CDNs do not pin failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = await GET();

    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("uses public, max-age=3600 Cache-Control on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = await GET();

    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });

  it("sets wide-open CORS headers so AI crawlers can read it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = await GET();

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("returns CORS headers even on upstream failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const { GET } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = await GET();

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("OPTIONS returns 204 with CORS headers", async () => {
    const { OPTIONS } = await import("@/app/.well-known/oauth-protected-resource/route");
    const res = await OPTIONS();

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});
