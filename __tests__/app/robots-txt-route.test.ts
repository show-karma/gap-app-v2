import { SITE_URL } from "@/utilities/meta";

describe("/robots.txt route handler", () => {
  it("returns 200 with text/plain", async () => {
    const { GET } = await import("@/app/robots.txt/route");
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });

  it("serialises the wildcard rule with allow and disallow directives", async () => {
    const { GET } = await import("@/app/robots.txt/route");
    const res = GET();
    const body = await res.text();
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Allow: /");
    expect(body).toContain("Disallow: /api/");
    expect(body).toContain("Disallow: /admin/");
  });

  it("allows /api/llms.txt even though /api/ is blocked", async () => {
    const { GET } = await import("@/app/robots.txt/route");
    const res = GET();
    const body = await res.text();
    expect(body).toContain("Allow: /api/llms.txt");
  });

  it("includes the Sitemap and Host directives", async () => {
    const { GET } = await import("@/app/robots.txt/route");
    const res = GET();
    const body = await res.text();
    expect(body).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
    expect(body).toContain(`Host: ${SITE_URL}`);
  });

  it("includes the NLWeb Schemamap directive pointing at /schema-map.xml", async () => {
    const { GET } = await import("@/app/robots.txt/route");
    const res = GET();
    const body = await res.text();
    expect(body).toContain(`Schemamap: ${SITE_URL}/schema-map.xml`);
  });
});

describe("/schema-map.xml route handler", () => {
  it("returns 200 with application/xml", async () => {
    const { GET } = await import("@/app/schema-map.xml/route");
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
  });

  it("declares the NLWeb schemaMap root element", async () => {
    const { GET } = await import("@/app/schema-map.xml/route");
    const res = GET();
    const body = await res.text();
    expect(body).toContain("<schemaMap");
    expect(body).toContain('xmlns="https://nlweb.github.io/schema-feeds/1.0"');
  });

  it("references the sitemap, llms.txt files, and openapi spec", async () => {
    const { GET } = await import("@/app/schema-map.xml/route");
    const res = GET();
    const body = await res.text();
    expect(body).toContain(`${SITE_URL}/sitemap.xml`);
    expect(body).toContain(`${SITE_URL}/llms.txt`);
    expect(body).toContain(`${SITE_URL}/llms-full.txt`);
    expect(body).toContain(`${SITE_URL}/docs/llms.txt`);
    expect(body).toContain(`${SITE_URL}/api/llms.txt`);
    expect(body).toContain(`${SITE_URL}/developers/llms.txt`);
    expect(body).toContain(`${SITE_URL}/openapi.json`);
  });

  it("sets wide-open CORS", async () => {
    const { GET } = await import("@/app/schema-map.xml/route");
    const res = GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("OPTIONS returns 204", async () => {
    const { OPTIONS } = await import("@/app/schema-map.xml/route");
    const res = OPTIONS();
    expect(res.status).toBe(204);
  });
});
