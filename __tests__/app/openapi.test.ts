import * as Sentry from "@sentry/nextjs";

const INDEXER_URL = "http://localhost:4000";

describe("/openapi.json route handler", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("proxies the upstream /v2/docs/json response when it succeeds", async () => {
    const upstream = {
      openapi: "3.0.0",
      info: { title: "Karma API", version: "2.0.0" },
      paths: { "/v2/projects": {} },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => upstream }));

    const { GET } = await import("@/app/openapi.json/route");
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual(upstream);
  });

  it("calls upstream with a 5s timeout and ISR revalidate hint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ paths: {} }) });
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/openapi.json/route");
    await GET();

    expect(fetchMock).toHaveBeenCalledWith(
      `${INDEXER_URL}/v2/docs/json`,
      expect.objectContaining({
        next: { revalidate: 3600 },
        signal: expect.any(AbortSignal),
      })
    );
  });

  it("returns 502 + minimal fallback when upstream responds non-OK", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const captureSpy = vi.spyOn(Sentry, "captureException");

    const { GET } = await import("@/app/openapi.json/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBe("upstream_unavailable");
    expect(body.openapi).toBe("3.0.0");
    expect(body.paths).toEqual({});
    expect(captureSpy).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: { route: "openapi" } })
    );
  });

  it("returns 502 + fallback and captures the error when upstream throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const captureSpy = vi.spyOn(Sentry, "captureException");

    const { GET } = await import("@/app/openapi.json/route");
    const res = await GET();

    expect(res.status).toBe(502);
    expect(captureSpy).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: { route: "openapi" } })
    );
  });

  it("uses no-store Cache-Control on 502 responses so CDNs do not pin failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { GET } = await import("@/app/openapi.json/route");
    const res = await GET();

    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("uses public, max-age=3600 Cache-Control on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    const { GET } = await import("@/app/openapi.json/route");
    const res = await GET();

    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });

  it("sets wide-open CORS headers so AI crawlers can read it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    const { GET } = await import("@/app/openapi.json/route");
    const res = await GET();

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("OPTIONS returns 204 with CORS headers", async () => {
    const { OPTIONS } = await import("@/app/openapi.json/route");
    const res = await OPTIONS();

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});
