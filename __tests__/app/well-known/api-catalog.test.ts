import { SITE_URL } from "@/utilities/meta";

const INDEXER_URL = "http://localhost:4000";

describe("/.well-known/api-catalog route handler", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns an RFC 9727-shaped linkset rooted at the apex domain", async () => {
    const { GET } = await import("@/app/.well-known/api-catalog/route");
    const res = GET();
    const body = await res.json();
    expect(Array.isArray(body.linkset)).toBe(true);
    expect(body.linkset).toHaveLength(1);
    expect(body.linkset[0].anchor).toBe(SITE_URL);
  });

  it("links the OpenAPI service description at the apex /openapi.json", async () => {
    const { GET } = await import("@/app/.well-known/api-catalog/route");
    const res = GET();
    const body = await res.json();
    expect(body.linkset[0]["service-desc"]).toEqual([
      { href: `${SITE_URL}/openapi.json`, type: "application/json" },
    ]);
  });

  it("links the human-readable Swagger UI on the indexer", async () => {
    const { GET } = await import("@/app/.well-known/api-catalog/route");
    const res = GET();
    const body = await res.json();
    expect(body.linkset[0]["service-doc"]).toEqual([
      { href: `${INDEXER_URL}/v2/docs`, type: "text/html" },
    ]);
  });

  it("links the AI plugin manifest as additional service metadata", async () => {
    const { GET } = await import("@/app/.well-known/api-catalog/route");
    const res = GET();
    const body = await res.json();
    expect(body.linkset[0]["service-meta"]).toEqual([
      { href: `${SITE_URL}/.well-known/ai-plugin.json`, type: "application/json" },
    ]);
  });

  it("sets wide-open CORS headers", async () => {
    const { GET } = await import("@/app/.well-known/api-catalog/route");
    const res = GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("OPTIONS returns 204 with CORS headers", async () => {
    const { OPTIONS } = await import("@/app/.well-known/api-catalog/route");
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});
