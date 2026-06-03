import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSitemapIndexBody,
  buildSitemapIndexXml,
  buildUrlsetXml,
  canonicalizeSitemapUrl,
  chunkCountFromTotal,
  countForKind,
  fetchSitemapKindPage,
  formatSitemapLastmod,
  type SitemapCounts,
} from "@/utilities/sitemap";

const SITE = "https://www.karmahq.xyz";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("formatSitemapLastmod", () => {
  it("strips fractional seconds from ISO timestamps (Google parser strictness)", () => {
    const fixed = new Date("2026-05-20T14:43:55.227Z");
    expect(formatSitemapLastmod(fixed)).toBe("2026-05-20T14:43:55Z");
  });

  it("leaves whole-second timestamps unchanged", () => {
    const fixed = new Date("2026-05-20T14:43:55.000Z");
    expect(formatSitemapLastmod(fixed)).toBe("2026-05-20T14:43:55Z");
  });

  it("defaults to now with second precision", () => {
    expect(formatSitemapLastmod()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });
});

describe("chunkCountFromTotal", () => {
  it("returns one chunk for an empty kind", () => {
    expect(chunkCountFromTotal(0)).toBe(1);
  });

  it("returns one chunk for a single short page", () => {
    expect(chunkCountFromTotal(1)).toBe(1);
    expect(chunkCountFromTotal(1000)).toBe(1);
  });

  it("rolls over to a second chunk past the page size", () => {
    expect(chunkCountFromTotal(1001)).toBe(2);
  });

  it("matches the production project shape (7678 -> 8 chunks)", () => {
    expect(chunkCountFromTotal(7678)).toBe(8);
  });

  it("never returns fewer than one chunk for malformed totals", () => {
    expect(chunkCountFromTotal(-5)).toBe(1);
    expect(chunkCountFromTotal(Number.NaN)).toBe(1);
  });
});

describe("canonicalizeSitemapUrl", () => {
  it("rewrites the origin to the canonical production host", () => {
    expect(canonicalizeSitemapUrl("https://staging.karmahq.xyz/project/x")).toBe(
      `${SITE}/project/x`
    );
  });

  it("preserves path, query, and hash", () => {
    expect(canonicalizeSitemapUrl("http://localhost:4000/p?a=1#h")).toBe(`${SITE}/p?a=1#h`);
  });

  it("returns the input unchanged when it is not a valid URL", () => {
    expect(canonicalizeSitemapUrl("not a url")).toBe("not a url");
  });
});

describe("buildUrlsetXml", () => {
  it("emits a urlset entry per URL with second-precision lastmod", () => {
    const xml = buildUrlsetXml(["https://staging.karmahq.xyz/a"], 0.8, "daily");
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${SITE}/a</loc>`);
    expect(xml).toContain("<changefreq>daily</changefreq>");
    expect(xml).toContain("<priority>0.8</priority>");
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z<\/lastmod>/);
    expect(xml).not.toContain("staging.karmahq.xyz");
  });

  it("escapes XML-significant characters in URLs", () => {
    const xml = buildUrlsetXml(["https://www.karmahq.xyz/a?x=1&y=2"], 0.5, "weekly");
    expect(xml).toContain("x=1&amp;y=2");
  });

  it("produces a valid empty urlset for zero URLs", () => {
    const xml = buildUrlsetXml([], 0.5, "weekly");
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<url>");
  });
});

describe("buildSitemapIndexXml", () => {
  it("lists each loc as a sitemap entry", () => {
    const xml = buildSitemapIndexXml([`${SITE}/sitemaps/grants/sitemap/1.xml`]);
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${SITE}/sitemaps/grants/sitemap/1.xml</loc>`);
  });
});

describe("countForKind", () => {
  it("maps the hyphenated funding-programs kind to its camelCase count field", () => {
    const counts: SitemapCounts = {
      projects: 1,
      impacts: 2,
      grants: 3,
      milestones: 4,
      fundingPrograms: 5,
    };
    expect(countForKind(counts, "funding-programs")).toBe(5);
    expect(countForKind(counts, "projects")).toBe(1);
  });
});

describe("fetchSitemapKindPage", () => {
  it("requests the right kind/page and canonicalizes the returned URLs", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ urls: ["https://staging.karmahq.xyz/project/a"] })
    );
    vi.stubGlobal("fetch", fetchMock);

    const urls = await fetchSitemapKindPage("projects", 2);

    expect(urls).toEqual([`${SITE}/project/a`]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/v2/sitemap?kind=projects&page=2&pageSize=1000",
      expect.objectContaining({ next: { revalidate: 86400 } })
    );
  });

  it("throws on a non-ok response so SWR keeps the last good chunk", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({}, false, 503))
    );
    await expect(fetchSitemapKindPage("grants", 1)).rejects.toThrow("HTTP 503");
  });
});

describe("buildSitemapIndexBody", () => {
  it("sizes per-kind chunks from the live counts and includes the local children", async () => {
    const counts: SitemapCounts = {
      projects: 7678, // 8 chunks
      impacts: 0, // 1 chunk (empty)
      grants: 1000, // 1 chunk
      milestones: 2001, // 3 chunks
      fundingPrograms: 77, // 1 chunk
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(counts))
    );

    const xml = await buildSitemapIndexBody();

    expect(xml).toContain(`<loc>${SITE}/sitemaps/static/sitemap.xml</loc>`);
    expect(xml).toContain(`<loc>${SITE}/sitemaps/communities/sitemap.xml</loc>`);
    expect(xml).toContain(`<loc>${SITE}/sitemaps/projects/sitemap/8.xml</loc>`);
    expect(xml).not.toContain(`<loc>${SITE}/sitemaps/projects/sitemap/9.xml</loc>`);
    expect(xml).toContain(`<loc>${SITE}/sitemaps/milestones/sitemap/3.xml</loc>`);
    expect(xml).toContain(`<loc>${SITE}/sitemaps/impacts/sitemap/1.xml</loc>`);
    expect(xml).not.toContain(`<loc>${SITE}/sitemaps/impacts/sitemap/2.xml</loc>`);
    // static + communities + projects 8 + impacts 1 + grants 1 + milestones 3 + funding-programs 1 = 16
    expect((xml.match(/<sitemap>/g) ?? []).length).toBe(16);
  });

  it("throws when counts is unreachable so SWR keeps the last good index", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({}, false, 500))
    );
    await expect(buildSitemapIndexBody()).rejects.toThrow("HTTP 500");
  });

  it("falls back to one chunk for a kind missing from a partial counts payload", async () => {
    // A malformed/partial counts response must not drop a kind or crash — each
    // missing kind still lists exactly one chunk.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ projects: 1500 }))
    );

    const xml = await buildSitemapIndexBody();

    expect(xml).toContain(`<loc>${SITE}/sitemaps/projects/sitemap/2.xml</loc>`);
    expect(xml).toContain(`<loc>${SITE}/sitemaps/grants/sitemap/1.xml</loc>`);
    expect(xml).not.toContain(`<loc>${SITE}/sitemaps/grants/sitemap/2.xml</loc>`);
  });
});
