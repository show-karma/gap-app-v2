import { SITE_URL } from "@/utilities/meta";

describe("/.well-known/agent-card.json route handler", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns an A2A agent card under the top-level 'agent' envelope", async () => {
    const { GET } = await import("@/app/.well-known/agent-card.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.agent).toBeDefined();
    expect(body.agent.name).toBe("Karma");
    expect(body.agent.version).toBe("1.0.0");
    expect(typeof body.agent.description).toBe("string");
    expect(body.agent.description.length).toBeGreaterThan(0);
  });

  it("points url and documentationUrl at the apex marketing domain", async () => {
    const { GET } = await import("@/app/.well-known/agent-card.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.agent.url).toBe(SITE_URL);
    expect(body.agent.documentationUrl).toBe(`${SITE_URL}/mcp/connect`);
    expect(body.agent.provider.name).toBe("Karma");
    expect(body.agent.provider.url).toBe(SITE_URL);
  });

  it("advertises capability flags as explicit booleans (no streaming yet)", async () => {
    const { GET } = await import("@/app/.well-known/agent-card.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.agent.capabilities).toEqual({
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
    });
  });

  it("supports both oauth2 and apiKey authentication schemes", async () => {
    const { GET } = await import("@/app/.well-known/agent-card.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.agent.authentication.schemes).toEqual(expect.arrayContaining(["oauth2", "apiKey"]));
  });

  it("points skillsDiscovery at the live mcp-tools.json catalog (no hardcoded skills)", async () => {
    const { GET } = await import("@/app/.well-known/agent-card.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.agent.skillsDiscovery).toBeDefined();
    expect(body.agent.skillsDiscovery.url).toBe(`${SITE_URL}/.well-known/mcp-tools.json`);
    expect(body.agent.skillsDiscovery.format).toBe("mcp-public-tool-list");
    expect(typeof body.agent.skillsDiscovery.description).toBe("string");
  });

  it("does NOT enumerate a static skills array (single source of truth is the indexer)", async () => {
    const { GET } = await import("@/app/.well-known/agent-card.json/route");
    const res = GET();
    const body = await res.json();
    expect(body.agent.skills).toBeUndefined();
  });

  it("sets wide-open CORS headers so agent crawlers can read it", async () => {
    const { GET } = await import("@/app/.well-known/agent-card.json/route");
    const res = GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("OPTIONS returns 204 with CORS headers", async () => {
    const { OPTIONS } = await import("@/app/.well-known/agent-card.json/route");
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});
