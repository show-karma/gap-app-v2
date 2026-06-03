import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as indexGet } from "@/app/sitemap-index.xml/route";
import { GET as childGet } from "@/app/sitemaps/[kind]/sitemap/[chunk]/route";

const SITE = "https://www.karmahq.xyz";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("child sitemap route", () => {
  it("returns a urlset of canonicalized URLs for a valid kind/chunk", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ urls: ["https://staging.karmahq.xyz/project/a"] }))
    );

    const res = await childGet(
      new Request("https://www.karmahq.xyz/sitemaps/projects/sitemap/1.xml"),
      {
        params: Promise.resolve({ kind: "projects", chunk: "1.xml" }),
      }
    );
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    expect(body).toContain(`<loc>${SITE}/project/a</loc>`);
    expect(body).not.toContain("staging.karmahq.xyz");
  });

  it("404s an unknown kind", async () => {
    const res = await childGet(
      new Request("https://www.karmahq.xyz/sitemaps/bogus/sitemap/1.xml"),
      {
        params: Promise.resolve({ kind: "bogus", chunk: "1.xml" }),
      }
    );
    expect(res.status).toBe(404);
  });

  it("404s a malformed chunk filename", async () => {
    const res = await childGet(
      new Request("https://www.karmahq.xyz/sitemaps/grants/sitemap/0.xml"),
      {
        params: Promise.resolve({ kind: "grants", chunk: "0.xml" }),
      }
    );
    expect(res.status).toBe(404);
  });

  it("404s an out-of-range chunk number without calling the indexer", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await childGet(
      new Request("https://www.karmahq.xyz/sitemaps/projects/sitemap/99999999999999999.xml"),
      {
        params: Promise.resolve({
          kind: "projects",
          chunk: "99999999999999999.xml",
        }),
      }
    );

    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("sitemap index route", () => {
  it("serves a sitemap index sized from the live counts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          projects: 1500,
          impacts: 0,
          grants: 0,
          milestones: 0,
          fundingPrograms: 0,
        })
      )
    );

    const res = await indexGet();
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    expect(body).toContain("<sitemapindex");
    expect(body).toContain(`<loc>${SITE}/sitemaps/projects/sitemap/2.xml</loc>`);
    expect(body).toContain(`<loc>${SITE}/sitemaps/static/sitemap.xml</loc>`);
  });
});
