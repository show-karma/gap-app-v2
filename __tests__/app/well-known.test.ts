import * as Sentry from "@sentry/nextjs";
import { SITE_URL } from "@/utilities/meta";

const INDEXER_URL = "http://localhost:4000";

describe("/.well-known/ai-plugin.json route handler", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("points api.url at the apex openapi.json proxy", async () => {
    const { GET } = await import("@/app/.well-known/ai-plugin.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.api.url).toBe(`${SITE_URL}/openapi.json`);
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
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("OPTIONS returns 204 with CORS headers", async () => {
    const { OPTIONS } = await import("@/app/.well-known/ai-plugin.json/route");
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});

describe("/.well-known/mcp.json route handler", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("declares a single 'karma' MCP server with http transport", async () => {
    const { GET } = await import("@/app/.well-known/mcp.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.mcpServers.karma.transport).toBe("http");
    expect(body.mcpServers.karma.url).toBe(`${INDEXER_URL}/mcp`);
  });

  it("advertises oauth2 auth with the indexer's protected-resource metadata", async () => {
    const { GET } = await import("@/app/.well-known/mcp.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.mcpServers.karma.auth.type).toBe("oauth2");
    expect(body.mcpServers.karma.auth.metadata).toBe(
      `${INDEXER_URL}/.well-known/oauth-protected-resource/mcp`
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
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("OPTIONS returns 204 with CORS headers", async () => {
    const { OPTIONS } = await import("@/app/.well-known/mcp.json/route");
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});

describe("/.well-known/mcp-tools.json route handler", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("proxies the upstream /mcp/tools response when it succeeds", async () => {
    const upstream = { tools: [{ name: "get_project_details" }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => upstream }));

    const { GET } = await import("@/app/.well-known/mcp-tools.json/route");
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual(upstream);
  });

  it("returns an empty fallback with status 502 when upstream responds non-OK", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

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
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("sets Cache-Control: no-store on 502 from upstream throw", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const { GET } = await import("@/app/.well-known/mcp-tools.json/route");
    const res = await GET();
    expect(res.status).toBe(502);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("sets Cache-Control: no-store on 502 from non-OK upstream", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const { GET } = await import("@/app/.well-known/mcp-tools.json/route");
    const res = await GET();
    expect(res.status).toBe(502);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("sets Cache-Control: public, max-age=3600 on success", async () => {
    const upstream = { tools: [{ name: "get_project_details" }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => upstream }));

    const { GET } = await import("@/app/.well-known/mcp-tools.json/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });

  it("captures the upstream throw to Sentry with the route tag", async () => {
    const fetchError = new Error("ECONNREFUSED");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(fetchError));

    const { GET } = await import("@/app/.well-known/mcp-tools.json/route");
    await GET();

    expect(Sentry.captureException).toHaveBeenCalledWith(fetchError, {
      tags: { route: "well-known/mcp-tools" },
    });
  });

  it("captures non-OK upstream responses to Sentry with the route tag", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const { GET } = await import("@/app/.well-known/mcp-tools.json/route");
    await GET();

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Upstream /mcp/tools returned 503" }),
      expect.objectContaining({
        tags: { route: "well-known/mcp-tools" },
        extra: { status: 503 },
      })
    );
  });

  it("OPTIONS returns 204 with CORS headers", async () => {
    const { OPTIONS } = await import("@/app/.well-known/mcp-tools.json/route");
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});

describe("getIndexerBaseUrl helper", () => {
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

  it("returns the configured indexer URL when set", async () => {
    const { getIndexerBaseUrl } = await import("@/utilities/wellKnown");
    expect(getIndexerBaseUrl()).toBe(INDEXER_URL);
  });

  it("throws when NEXT_PUBLIC_GAP_INDEXER_URL is undefined", async () => {
    vi.doMock("@/utilities/enviromentVars", () => ({
      envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: undefined },
    }));
    const { getIndexerBaseUrl } = await import("@/utilities/wellKnown");
    expect(() => getIndexerBaseUrl()).toThrow(/NEXT_PUBLIC_GAP_INDEXER_URL is not set/);
  });

  it("throws when NEXT_PUBLIC_GAP_INDEXER_URL is an empty string", async () => {
    vi.doMock("@/utilities/enviromentVars", () => ({
      envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: "" },
    }));
    const { getIndexerBaseUrl } = await import("@/utilities/wellKnown");
    expect(() => getIndexerBaseUrl()).toThrow(/NEXT_PUBLIC_GAP_INDEXER_URL is not set/);
  });

  it("throws when NEXT_PUBLIC_GAP_INDEXER_URL is whitespace only", async () => {
    vi.doMock("@/utilities/enviromentVars", () => ({
      envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: "   " },
    }));
    const { getIndexerBaseUrl } = await import("@/utilities/wellKnown");
    expect(() => getIndexerBaseUrl()).toThrow(/NEXT_PUBLIC_GAP_INDEXER_URL is not set/);
  });

  it("throws when NEXT_PUBLIC_GAP_INDEXER_URL has no scheme", async () => {
    vi.doMock("@/utilities/enviromentVars", () => ({
      envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: "gapapi.karmahq.xyz" },
    }));
    const { getIndexerBaseUrl } = await import("@/utilities/wellKnown");
    expect(() => getIndexerBaseUrl()).toThrow(/is not a valid URL/);
  });

  it("throws when NEXT_PUBLIC_GAP_INDEXER_URL is structurally malformed", async () => {
    vi.doMock("@/utilities/enviromentVars", () => ({
      envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: "https://" },
    }));
    const { getIndexerBaseUrl } = await import("@/utilities/wellKnown");
    expect(() => getIndexerBaseUrl()).toThrow(/is not a valid URL/);
  });

  it("strips a trailing slash so downstream /mcp URLs don't get a double slash", async () => {
    vi.doMock("@/utilities/enviromentVars", () => ({
      envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: "https://gapapi.karmahq.xyz/" },
    }));
    const { getIndexerBaseUrl } = await import("@/utilities/wellKnown");
    expect(getIndexerBaseUrl()).toBe("https://gapapi.karmahq.xyz");
    expect(`${getIndexerBaseUrl()}/mcp`).toBe("https://gapapi.karmahq.xyz/mcp");
  });

  it("strips multiple trailing slashes", async () => {
    vi.doMock("@/utilities/enviromentVars", () => ({
      envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: "https://gapapi.karmahq.xyz///" },
    }));
    const { getIndexerBaseUrl } = await import("@/utilities/wellKnown");
    expect(getIndexerBaseUrl()).toBe("https://gapapi.karmahq.xyz");
  });
});

describe("/.well-known/mcp.json route handler with a trailing slash in the env var", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.doUnmock("@/utilities/enviromentVars");
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("normalizes NEXT_PUBLIC_GAP_INDEXER_URL to a single slash before /mcp", async () => {
    vi.doMock("@/utilities/enviromentVars", () => ({
      envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: "https://gapapi.karmahq.xyz/" },
    }));
    const { GET } = await import("@/app/.well-known/mcp.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.mcpServers.karma.url).toBe("https://gapapi.karmahq.xyz/mcp");
    expect(body.mcpServers.karma.url).not.toContain("//mcp");
  });
});

describe("normalizeBaseUrl helper", () => {
  it("strips a single trailing slash", async () => {
    const { normalizeBaseUrl } = await import("@/utilities/wellKnown");
    expect(normalizeBaseUrl("https://gapapi.karmahq.xyz/")).toBe("https://gapapi.karmahq.xyz");
  });

  it("strips multiple trailing slashes", async () => {
    const { normalizeBaseUrl } = await import("@/utilities/wellKnown");
    expect(normalizeBaseUrl("https://gapapi.karmahq.xyz///")).toBe("https://gapapi.karmahq.xyz");
  });

  it("leaves a URL with no trailing slash unchanged", async () => {
    const { normalizeBaseUrl } = await import("@/utilities/wellKnown");
    expect(normalizeBaseUrl("https://gapapi.karmahq.xyz")).toBe("https://gapapi.karmahq.xyz");
  });

  it("does not strip an internal slash, only trailing ones", async () => {
    const { normalizeBaseUrl } = await import("@/utilities/wellKnown");
    expect(normalizeBaseUrl("https://gapapi.karmahq.xyz/mcp/")).toBe(
      "https://gapapi.karmahq.xyz/mcp"
    );
  });

  it("does not throw on a non-string input", async () => {
    const { normalizeBaseUrl } = await import("@/utilities/wellKnown");
    expect(() => normalizeBaseUrl(undefined as unknown as string)).not.toThrow();
  });

  it("strips trailing whitespace", async () => {
    const { normalizeBaseUrl } = await import("@/utilities/wellKnown");
    expect(normalizeBaseUrl("https://gapapi.karmahq.xyz ")).toBe("https://gapapi.karmahq.xyz");
  });

  it("strips trailing whitespace after a trailing slash", async () => {
    const { normalizeBaseUrl } = await import("@/utilities/wellKnown");
    expect(normalizeBaseUrl("https://gapapi.karmahq.xyz/ ")).toBe("https://gapapi.karmahq.xyz");
  });

  it("strips a trailing slash-then-whitespace-then-slash mix", async () => {
    const { normalizeBaseUrl } = await import("@/utilities/wellKnown");
    expect(normalizeBaseUrl("https://gapapi.karmahq.xyz// ")).toBe("https://gapapi.karmahq.xyz");
  });

  it("strips repeated whitespace/slash combinations", async () => {
    const { normalizeBaseUrl } = await import("@/utilities/wellKnown");
    expect(normalizeBaseUrl("https://gapapi.karmahq.xyz /  / ")).toBe("https://gapapi.karmahq.xyz");
  });
});
