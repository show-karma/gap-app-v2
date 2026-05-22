import { SITE_URL } from "@/utilities/meta";

describe("/index.md route handler", () => {
  it("returns 200 with a text/markdown content type", async () => {
    const { GET } = await import("@/app/index.md/route");
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
  });

  it("starts with the canonical # Karma H1", async () => {
    const { GET } = await import("@/app/index.md/route");
    const res = GET();
    const body = await res.text();
    expect(body.startsWith("# Karma")).toBe(true);
  });

  it("links to the primary landing pages and discovery surfaces", async () => {
    const { GET } = await import("@/app/index.md/route");
    const res = GET();
    const body = await res.text();
    for (const path of [
      "/",
      "/projects",
      "/communities",
      "/funders",
      "/funding-map",
      "/knowledge",
      "/mcp/connect",
      "/for-agents",
      "/openapi.json",
      "/llms.txt",
    ]) {
      expect(body).toContain(`${SITE_URL}${path}`);
    }
  });

  it("sets wide-open CORS so AEO crawlers can fetch it cross-origin", async () => {
    const { GET } = await import("@/app/index.md/route");
    const res = GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("sets long-lived Cache-Control on the markdown body", async () => {
    const { GET } = await import("@/app/index.md/route");
    const res = GET();
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });

  it("OPTIONS returns 204 with CORS headers", async () => {
    const { OPTIONS } = await import("@/app/index.md/route");
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
