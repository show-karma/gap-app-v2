import { describe, expect, it } from "vitest";
import { GET } from "@/app/sitemaps/[kind]/sitemap/[chunk]/route";

function call(kind: string, chunk: string) {
  return GET(new Request("https://www.karmahq.xyz/sitemaps/test"), {
    params: Promise.resolve({ kind, chunk }),
  });
}

describe("app/sitemaps/[kind]/sitemap/[chunk] orphaned-chunk fallback", () => {
  it("returns an empty 200 urlset for a known kind with a numeric chunk", async () => {
    const res = await call("grants", "2.xml");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).not.toContain("<url>");
  });

  it.each(["projects", "impacts", "grants", "milestones", "funding-programs"])(
    "serves the %s kind",
    async (kind) => {
      const res = await call(kind, "9.xml");
      expect(res.status).toBe(200);
    }
  );

  it("returns 404 for an unknown kind", async () => {
    const res = await call("unknown", "1.xml");
    expect(res.status).toBe(404);
  });

  it("returns 404 for a non-numeric chunk filename", async () => {
    const res = await call("grants", "sitemap.xml");
    expect(res.status).toBe(404);
  });
});
