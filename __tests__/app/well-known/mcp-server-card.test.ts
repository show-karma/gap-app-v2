import { SITE_URL } from "@/utilities/meta";

const INDEXER_URL = "http://localhost:4000";

describe("/.well-known/mcp/server-card.json route handler", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("declares a stable name with the canonical indexer URL and HTTP transport", async () => {
    const { GET } = await import("@/app/.well-known/mcp/server-card.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.name).toBe("gap-tools");
    expect(body.alternateNames).toEqual(expect.arrayContaining(["karma-gap-tools"]));
    expect(body.transport).toBe("http");
    expect(body.url).toBe(`${INDEXER_URL}/v2/mcp`);
    expect(body.protocolVersion).toBe("2025-11-25");
    expect(body.version).toBe("1.0.0");
  });

  it("exposes a top-level description so AEO crawlers (Ora) can index it", async () => {
    const { GET } = await import("@/app/.well-known/mcp/server-card.json/route");
    const res = GET();
    const body = await res.json();
    expect(typeof body.description).toBe("string");
    expect(body.description.length).toBeGreaterThan(0);
  });

  it("references human docs and OpenAPI on the apex marketing domain", async () => {
    const { GET } = await import("@/app/.well-known/mcp/server-card.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.documentation).toBe(`${SITE_URL}/mcp/connect`);
    expect(body.openapi).toBe(`${SITE_URL}/openapi.json`);
  });

  it("advertises oauth2 metadata at the apex protected-resource path and apiKey via x-api-key", async () => {
    const { GET } = await import("@/app/.well-known/mcp/server-card.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.authentication.oauth2.metadata).toBe(
      `${SITE_URL}/.well-known/oauth-protected-resource`
    );
    expect(body.authentication.apiKey.header).toBe("x-api-key");
  });

  it("includes a publisher block with name, url, and contact email", async () => {
    const { GET } = await import("@/app/.well-known/mcp/server-card.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.publisher.name).toBe("Karma");
    expect(body.publisher.url).toBe(SITE_URL);
    expect(body.publisher.email).toBe("info@karmahq.xyz");
  });

  it("sets wide-open CORS headers", async () => {
    const { GET } = await import("@/app/.well-known/mcp/server-card.json/route");
    const res = GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("OPTIONS returns 204 with CORS headers", async () => {
    const { OPTIONS } = await import("@/app/.well-known/mcp/server-card.json/route");
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});
