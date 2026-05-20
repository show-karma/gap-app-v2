import { SITE_URL } from "@/utilities/meta";

const INDEXER_URL = "http://localhost:4000";

describe("/docs/llms.txt route handler", () => {
  it("returns 200 with text/plain", async () => {
    const { GET } = await import("@/app/docs/llms.txt/route");
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });

  it("links to the docs subdomain", async () => {
    const { GET } = await import("@/app/docs/llms.txt/route");
    const res = GET();
    const body = await res.text();
    expect(body).toContain("https://docs.gap.karmahq.xyz");
  });

  it("points back at the apex llms.txt", async () => {
    const { GET } = await import("@/app/docs/llms.txt/route");
    const res = GET();
    const body = await res.text();
    expect(body).toContain(`${SITE_URL}/llms.txt`);
  });

  it("sets wide-open CORS", async () => {
    const { GET } = await import("@/app/docs/llms.txt/route");
    const res = GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("/api/llms.txt route handler", () => {
  it("returns 200 with text/plain", async () => {
    const { GET } = await import("@/app/api/llms.txt/route");
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });

  it("links to the OpenAPI spec, Swagger UI, MCP endpoint, and OAuth metadata", async () => {
    const { GET } = await import("@/app/api/llms.txt/route");
    const res = GET();
    const body = await res.text();
    expect(body).toContain(`${SITE_URL}/openapi.json`);
    expect(body).toContain(`${INDEXER_URL}/v2/docs`);
    expect(body).toContain(`${INDEXER_URL}/v2/mcp`);
    expect(body).toContain(`${SITE_URL}/.well-known/oauth-protected-resource`);
  });

  it("documents the x-api-key auth header", async () => {
    const { GET } = await import("@/app/api/llms.txt/route");
    const res = GET();
    const body = await res.text();
    expect(body).toContain("x-api-key");
  });

  it("sets wide-open CORS", async () => {
    const { GET } = await import("@/app/api/llms.txt/route");
    const res = GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("/developers/llms.txt route handler", () => {
  it("returns 200 with text/plain", async () => {
    const { GET } = await import("@/app/developers/llms.txt/route");
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });

  it("links to all the dev entry points", async () => {
    const { GET } = await import("@/app/developers/llms.txt/route");
    const res = GET();
    const body = await res.text();
    expect(body).toContain(`${SITE_URL}/mcp/connect`);
    expect(body).toContain(`${SITE_URL}/for-agents`);
    expect(body).toContain(`${SITE_URL}/openapi.json`);
    expect(body).toContain(`${SITE_URL}/llms-full.txt`);
    expect(body).toContain(`${SITE_URL}/agents.md`);
    expect(body).toContain(`${SITE_URL}/.well-known/agent-card.json`);
    expect(body).toContain(`${SITE_URL}/.well-known/mcp/server-card.json`);
  });

  it("sets wide-open CORS", async () => {
    const { GET } = await import("@/app/developers/llms.txt/route");
    const res = GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
