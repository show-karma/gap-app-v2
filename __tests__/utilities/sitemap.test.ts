import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSitemapIndexBody,
  buildSitemapIndexXml,
  buildUrlsetXml,
  canonicalizeSitemapUrl,
  chunkCountFromTotal,
  countForKind,
  fetchAllSitemapKindUrls,
  fetchSitemapKindPage,
  formatSitemapLastmod,
  INDEXER_FETCH_PAGE_SIZE,
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
  it("emits a urlset entry per URL and canonicalizes the host", () => {
    const xml = buildUrlsetXml(["https://staging.karmahq.xyz/a"], 0.8, "daily");
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${SITE}/a</loc>`);
    expect(xml).toContain("<changefreq>daily</changefreq>");
    expect(xml).toContain("<priority>0.8</priority>");
    expect(xml).not.toContain("staging.karmahq.xyz");
  });

  it("omits lastmod (no accurate per-URL modified date to emit)", () => {
    const xml = buildUrlsetXml(["https://www.karmahq.xyz/a"], 0.8, "daily");
    expect(xml).not.toContain("<lastmod>");
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

  it("omits lastmod on child entries", () => {
    const xml = buildSitemapIndexXml([`${SITE}/sitemaps/grants/sitemap/1.xml`]);
    expect(xml).not.toContain("<lastmod>");
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
  it("advertises only the high-value canonical kinds plus the local children", async () => {
    const counts: SitemapCounts = {
      projects: 7678,
      impacts: 0,
      grants: 1000,
      milestones: 2001,
      fundingPrograms: 77,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(counts))
    );

    const xml = await buildSitemapIndexBody();

    expect(xml).toContain(`<loc>${SITE}/sitemaps/static/sitemap.xml</loc>`);
    expect(xml).toContain(`<loc>${SITE}/sitemaps/communities/sitemap.xml</loc>`);
    expect(xml).toContain(`<loc>${SITE}/sitemaps/projects/sitemap.xml</loc>`);
    expect(xml).toContain(`<loc>${SITE}/sitemaps/funding-programs/sitemap.xml</loc>`);
    // The thin tab kinds are noindexed and no longer advertised by the index.
    expect(xml).not.toContain(`<loc>${SITE}/sitemaps/impacts/sitemap.xml</loc>`);
    expect(xml).not.toContain(`<loc>${SITE}/sitemaps/grants/sitemap.xml</loc>`);
    expect(xml).not.toContain(`<loc>${SITE}/sitemaps/milestones/sitemap.xml</loc>`);
    expect(xml).not.toContain("/sitemap/1.xml");
    // static + communities + projects + funding-programs = 4
    expect((xml.match(/<sitemap>/g) ?? []).length).toBe(4);
  });

  it("falls back to chunked children for a kind past the per-file URL limit", async () => {
    const counts: SitemapCounts = {
      projects: 46_000, // > MAX_URLS_PER_SITEMAP -> 46 chunks
      impacts: 10,
      grants: 10,
      milestones: 10,
      fundingPrograms: 10,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(counts))
    );

    const xml = await buildSitemapIndexBody();

    expect(xml).not.toContain(`<loc>${SITE}/sitemaps/projects/sitemap.xml</loc>`);
    expect(xml).toContain(`<loc>${SITE}/sitemaps/projects/sitemap/1.xml</loc>`);
    expect(xml).toContain(`<loc>${SITE}/sitemaps/projects/sitemap/46.xml</loc>`);
    expect(xml).toContain(`<loc>${SITE}/sitemaps/funding-programs/sitemap.xml</loc>`);
    expect(xml).not.toContain(`<loc>${SITE}/sitemaps/grants/sitemap.xml</loc>`);
    // static + communities + projects 46 chunks + funding-programs = 49
    expect((xml.match(/<sitemap>/g) ?? []).length).toBe(49);
  });

  it("falls back to chunked children for a kind exactly at the per-file URL limit", async () => {
    // At exactly MAX_URLS_PER_SITEMAP the consolidated route 404s (it can't
    // prove the list isn't truncated), so the index must list chunks here —
    // never a consolidated child that would 404. 45_000 / 1_000 = 45 chunks.
    const counts: SitemapCounts = {
      projects: 45_000,
      impacts: 10,
      grants: 10,
      milestones: 10,
      fundingPrograms: 10,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(counts))
    );

    const xml = await buildSitemapIndexBody();

    expect(xml).not.toContain(`<loc>${SITE}/sitemaps/projects/sitemap.xml</loc>`);
    expect(xml).toContain(`<loc>${SITE}/sitemaps/projects/sitemap/1.xml</loc>`);
    expect(xml).toContain(`<loc>${SITE}/sitemaps/projects/sitemap/45.xml</loc>`);
    expect(xml).not.toContain(`<loc>${SITE}/sitemaps/projects/sitemap/46.xml</loc>`);
    expect(xml).toContain(`<loc>${SITE}/sitemaps/funding-programs/sitemap.xml</loc>`);
  });

  it("throws when counts is unreachable so SWR keeps the last good index", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({}, false, 500))
    );
    await expect(buildSitemapIndexBody()).rejects.toThrow("HTTP 500");
  });

  it("still lists the consolidated child for a kind missing from a partial counts payload", async () => {
    // A malformed/partial counts response must not drop a kind or crash — the
    // consolidated child derives completeness from page data, not this count.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ projects: 1500 }))
    );

    const xml = await buildSitemapIndexBody();

    expect(xml).toContain(`<loc>${SITE}/sitemaps/projects/sitemap.xml</loc>`);
    expect(xml).toContain(`<loc>${SITE}/sitemaps/funding-programs/sitemap.xml</loc>`);
    expect(xml).not.toContain(`<loc>${SITE}/sitemaps/grants/sitemap.xml</loc>`);
    expect((xml.match(/<sitemap>/g) ?? []).length).toBe(4);
  });
});

describe("fetchAllSitemapKindUrls", () => {
  const pageOf = (count: number, prefix: string): string[] =>
    Array.from({ length: count }, (_, i) => `https://staging.karmahq.xyz/${prefix}/${i}`);

  it("pages until a short page and merges the results in order", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const page = new URL(url).searchParams.get("page");
      return page === "1"
        ? jsonResponse({ urls: pageOf(INDEXER_FETCH_PAGE_SIZE, "a") })
        : jsonResponse({ urls: pageOf(2, "b") });
    });
    vi.stubGlobal("fetch", fetchMock);

    const urls = await fetchAllSitemapKindUrls("projects");

    expect(urls).toHaveLength(INDEXER_FETCH_PAGE_SIZE + 2);
    expect(urls[0]).toBe(`${SITE}/a/0`);
    expect(urls[urls.length - 1]).toBe(`${SITE}/b/1`);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain(`pageSize=${INDEXER_FETCH_PAGE_SIZE}`);
  });

  it("stops after one fetch when the first page is already short", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ urls: pageOf(3, "p") }));
    vi.stubGlobal("fetch", fetchMock);

    const urls = await fetchAllSitemapKindUrls("funding-programs");

    expect(urls).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when any page fails so a partial list is never served as complete", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const page = new URL(url).searchParams.get("page");
      return page === "1"
        ? jsonResponse({ urls: pageOf(INDEXER_FETCH_PAGE_SIZE, "a") })
        : jsonResponse({}, false, 503);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAllSitemapKindUrls("projects")).rejects.toThrow("HTTP 503");
  });
});
