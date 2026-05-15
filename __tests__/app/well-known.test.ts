import { SITE_URL } from "@/utilities/meta";

const INDEXER_URL = "http://localhost:4000";

describe("/.well-known/ai-plugin.json route handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the ChatGPT plugin manifest with name_for_human=Karma", async () => {
    const { GET } = await import("@/app/.well-known/ai-plugin.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.schema_version).toBe("v1");
    expect(body.name_for_human).toBe("Karma");
    expect(body.name_for_model).toBe("karma");
  });

  it("points api.url at the indexer's OpenAPI spec", async () => {
    const { GET } = await import("@/app/.well-known/ai-plugin.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.api.url).toBe(`${INDEXER_URL}/v2/docs/json`);
    expect(body.api.type).toBe("openapi");
  });

  it("points auth.authorization_url at the indexer's OAuth endpoint", async () => {
    const { GET } = await import("@/app/.well-known/ai-plugin.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.auth.type).toBe("oauth");
    expect(body.auth.authorization_url).toBe(`${INDEXER_URL}/v2/oauth/authorize`);
  });

  it("uses the public Karma logo and contact email", async () => {
    const { GET } = await import("@/app/.well-known/ai-plugin.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.logo_url).toBe(`${SITE_URL}/logo/karma-logo.svg`);
    expect(body.contact_email).toBe("info@karmahq.xyz");
    expect(body.legal_info_url).toBe(`${SITE_URL}/terms-and-conditions`);
  });

  it("sets wide-open CORS headers so AI crawlers can read it", async () => {
    const { GET } = await import("@/app/.well-known/ai-plugin.json/route");
    const res = GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });
});

describe("/.well-known/mcp.json route handler", () => {
  it("declares a single 'karma' MCP server with http transport", async () => {
    const { GET } = await import("@/app/.well-known/mcp.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.mcpServers.karma.transport).toBe("http");
    expect(body.mcpServers.karma.url).toBe(`${INDEXER_URL}/v2/mcp`);
  });

  it("advertises oauth2 auth with the indexer's protected-resource metadata", async () => {
    const { GET } = await import("@/app/.well-known/mcp.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.mcpServers.karma.auth.type).toBe("oauth2");
    expect(body.mcpServers.karma.auth.metadata).toBe(
      `${INDEXER_URL}/.well-known/oauth-protected-resource/v2/mcp`
    );
  });

  it("links the human-facing documentation page", async () => {
    const { GET } = await import("@/app/.well-known/mcp.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.mcpServers.karma.documentation).toBe(`${SITE_URL}/mcp/connect`);
  });

  it("sets wide-open CORS headers", async () => {
    const { GET } = await import("@/app/.well-known/mcp.json/route");
    const res = GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("/.well-known/mcp-tools.json route handler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("proxies the upstream /v2/mcp/tools response when it succeeds", async () => {
    const upstream = { tools: [{ name: "get_project_details" }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => upstream }));

    const { GET } = await import("@/app/.well-known/mcp-tools.json/route");
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual(upstream);
  });

  it("returns an empty fallback with status 502 when upstream responds non-OK", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const { GET } = await import("@/app/.well-known/mcp-tools.json/route");
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body).toEqual({ error: "upstream_unavailable", tools: [] });
  });

  it("returns an empty fallback with status 502 when upstream throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const { GET } = await import("@/app/.well-known/mcp-tools.json/route");
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body).toEqual({ error: "upstream_unavailable", tools: [] });
  });

  it("always returns CORS headers, even on upstream failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const { GET } = await import("@/app/.well-known/mcp-tools.json/route");
    const res = await GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
