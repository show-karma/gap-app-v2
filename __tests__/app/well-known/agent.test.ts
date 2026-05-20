import { SITE_URL } from "@/utilities/meta";

describe("/.well-known/agent.json route handler", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns the Karma agent identity with a contact email", async () => {
    const { GET } = await import("@/app/.well-known/agent.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.name).toBe("Karma");
    expect(typeof body.description).toBe("string");
    expect(body.description.length).toBeGreaterThan(0);
    expect(body.contact).toBe("info@karmahq.xyz");
  });

  it("aggregates all other discovery surfaces under .discovery", async () => {
    const { GET } = await import("@/app/.well-known/agent.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.discovery).toEqual({
      openapi: `${SITE_URL}/openapi.json`,
      mcp: `${SITE_URL}/.well-known/mcp.json`,
      mcpServerCard: `${SITE_URL}/.well-known/mcp/server-card.json`,
      aiPlugin: `${SITE_URL}/.well-known/ai-plugin.json`,
      agentCard: `${SITE_URL}/.well-known/agent-card.json`,
      oauthProtectedResource: `${SITE_URL}/.well-known/oauth-protected-resource`,
      llmsTxt: `${SITE_URL}/llms.txt`,
    });
  });

  it("only references URLs on the marketing apex (no indexer URLs)", async () => {
    const { GET } = await import("@/app/.well-known/agent.json/route");
    const res = GET();
    const body = await res.json();
    for (const url of Object.values(body.discovery)) {
      expect(typeof url).toBe("string");
      expect(url).toMatch(new RegExp(`^${SITE_URL}`));
    }
  });

  it("sets wide-open CORS headers", async () => {
    const { GET } = await import("@/app/.well-known/agent.json/route");
    const res = GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("OPTIONS returns 204 with CORS headers", async () => {
    const { OPTIONS } = await import("@/app/.well-known/agent.json/route");
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});
