import { SITE_URL } from "@/utilities/meta";
import * as sitemapUtils from "@/utilities/sitemap";

vi.mock("@/utilities/sitemap", async (importActual) => {
  const actual = await importActual<typeof sitemapUtils>();
  return {
    ...actual,
    fetchSitemapCounts: vi.fn(),
    fetchSitemapUrls: vi.fn(),
  };
});

const mockFetchSitemapCounts = vi.mocked(sitemapUtils.fetchSitemapCounts);
const mockFetchSitemapUrls = vi.mocked(sitemapUtils.fetchSitemapUrls);

// ---------------------------------------------------------------------------
// app/sitemap.xml/route.ts — sitemap index
// ---------------------------------------------------------------------------
describe("app/sitemap.xml/route.ts — sitemap index GET handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("always includes the static and communities child sitemaps", async () => {
    mockFetchSitemapCounts.mockResolvedValue({
      projects: 0,
      impacts: 0,
      grants: 0,
      milestones: 0,
      fundingPrograms: 0,
    });

    const { GET } = await import("@/app/sitemap.xml/route");
    const res = await GET();
    const xml = await res.text();

    expect(xml).toContain(`${SITE_URL}/sitemaps/static/sitemap.xml`);
    expect(xml).toContain(`${SITE_URL}/sitemaps/communities/sitemap.xml`);
  });

  it("returns a valid sitemapindex XML document", async () => {
    mockFetchSitemapCounts.mockResolvedValue({
      projects: 0,
      impacts: 0,
      grants: 0,
      milestones: 0,
      fundingPrograms: 0,
    });

    const { GET } = await import("@/app/sitemap.xml/route");
    const res = await GET();
    const xml = await res.text();
    const contentType = res.headers.get("Content-Type");

    expect(xml).toMatch(/^<\?xml/);
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("</sitemapindex>");
    expect(contentType).toContain("application/xml");
  });

  it("generates the correct number of project chunk URLs from counts", async () => {
    // 12 500 projects → 3 chunks of 5 000
    mockFetchSitemapCounts.mockResolvedValue({
      projects: 12500,
      impacts: 0,
      grants: 0,
      milestones: 0,
      fundingPrograms: 0,
    });

    const { GET } = await import("@/app/sitemap.xml/route");
    const res = await GET();
    const xml = await res.text();

    expect(xml).toContain(`${SITE_URL}/sitemaps/projects/sitemap/1.xml`);
    expect(xml).toContain(`${SITE_URL}/sitemaps/projects/sitemap/2.xml`);
    expect(xml).toContain(`${SITE_URL}/sitemaps/projects/sitemap/3.xml`);
    expect(xml).not.toContain(`${SITE_URL}/sitemaps/projects/sitemap/4.xml`);
  });

  it("generates child URLs for impacts, grants, milestones, and funding-programs", async () => {
    mockFetchSitemapCounts.mockResolvedValue({
      projects: 1,
      impacts: 1,
      grants: 1,
      milestones: 1,
      fundingPrograms: 1,
    });

    const { GET } = await import("@/app/sitemap.xml/route");
    const res = await GET();
    const xml = await res.text();

    expect(xml).toContain(`${SITE_URL}/sitemaps/impacts/sitemap/1.xml`);
    expect(xml).toContain(`${SITE_URL}/sitemaps/grants/sitemap/1.xml`);
    expect(xml).toContain(`${SITE_URL}/sitemaps/milestones/sitemap/1.xml`);
    expect(xml).toContain(`${SITE_URL}/sitemaps/funding-programs/sitemap/1.xml`);
  });

  it("emits <lastmod> values without fractional seconds (Google parser strictness)", async () => {
    mockFetchSitemapCounts.mockResolvedValue(null);

    const { GET } = await import("@/app/sitemap.xml/route");
    const res = await GET();
    const xml = await res.text();

    const lastmodMatches = xml.match(/<lastmod>([^<]+)<\/lastmod>/g) ?? [];
    expect(lastmodMatches.length).toBeGreaterThan(0);
    for (const tag of lastmodMatches) {
      expect(tag).not.toMatch(/\.\d{3}Z/);
      expect(tag).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z<\/lastmod>/);
    }
  });

  it("sets Content-Type, Content-Disposition, and Cache-Control matching child sitemaps", async () => {
    mockFetchSitemapCounts.mockResolvedValue(null);

    const { GET } = await import("@/app/sitemap.xml/route");
    const res = await GET();

    expect(res.headers.get("Content-Type")).toBe("application/xml");
    expect(res.headers.get("Content-Disposition")).toBe("inline");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");
  });

  it("falls back to 1 chunk per kind when fetchSitemapCounts returns null", async () => {
    mockFetchSitemapCounts.mockResolvedValue(null);

    const { GET } = await import("@/app/sitemap.xml/route");
    const res = await GET();
    const xml = await res.text();

    expect(xml).toContain(`${SITE_URL}/sitemaps/projects/sitemap/1.xml`);
    expect(xml).toContain(`${SITE_URL}/sitemaps/impacts/sitemap/1.xml`);
    expect(xml).toContain(`${SITE_URL}/sitemaps/grants/sitemap/1.xml`);
    expect(xml).toContain(`${SITE_URL}/sitemaps/milestones/sitemap/1.xml`);
    expect(xml).toContain(`${SITE_URL}/sitemaps/funding-programs/sitemap/1.xml`);
  });
});

// ---------------------------------------------------------------------------
// app/sitemaps/static/sitemap.ts
// ---------------------------------------------------------------------------
describe("app/sitemaps/static/sitemap.ts", () => {
  it("returns an array of sitemap entries", async () => {
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = staticSitemap();
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  it("has all URLs under the site domain", async () => {
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = staticSitemap();
    for (const entry of entries) {
      expect(entry.url).toMatch(new RegExp(`^${SITE_URL}`));
    }
  });

  it("includes the homepage", async () => {
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = staticSitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(SITE_URL);
  });

  it("includes key static pages", async () => {
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = staticSitemap();
    const urls = entries.map((e) => e.url);
    for (const page of ["/projects", "/communities", "/funders", "/knowledge"]) {
      expect(urls).toContain(`${SITE_URL}${page}`);
    }
  });

  it("sets homepage priority to 1 and changeFrequency to daily", async () => {
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = staticSitemap();
    const homepage = entries.find((e) => e.url === SITE_URL);
    expect(homepage?.priority).toBe(1);
    expect(homepage?.changeFrequency).toBe("daily");
  });

  it("does not have duplicate URLs", async () => {
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = staticSitemap();
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

// ---------------------------------------------------------------------------
// Chunked kind sitemaps — test via utility functions directly
// ---------------------------------------------------------------------------
describe("chunked kind sitemaps — projects sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sitemap() maps urls to entries with correct priority and changeFrequency", async () => {
    const testUrl = "https://www.karmahq.xyz/project/test";
    mockFetchSitemapUrls.mockResolvedValue([testUrl]);

    const { buildSitemapEntries, fetchSitemapUrls } = await import("@/utilities/sitemap");
    const urls = await fetchSitemapUrls("projects", 1, sitemapUtils.SITEMAP_PAGE_SIZE);
    const entries = buildSitemapEntries(urls, { priority: 0.8, changeFrequency: "daily" });

    expect(mockFetchSitemapUrls).toHaveBeenCalledWith(
      "projects",
      1,
      sitemapUtils.SITEMAP_PAGE_SIZE
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].priority).toBe(0.8);
    expect(entries[0].changeFrequency).toBe("daily");
    expect(entries[0].url).toBe(testUrl);
  });

  it("sitemap() returns [] when fetchSitemapUrls returns empty array", async () => {
    mockFetchSitemapUrls.mockResolvedValue([]);
    const { buildSitemapEntries, fetchSitemapUrls } = await import("@/utilities/sitemap");
    const urls = await fetchSitemapUrls("projects", 1, sitemapUtils.SITEMAP_PAGE_SIZE);
    const entries = buildSitemapEntries(urls, { priority: 0.8, changeFrequency: "daily" });
    expect(entries).toHaveLength(0);
  });

  it("generateSitemaps() returns correct chunk count from counts (12 000 → 3 chunks)", async () => {
    mockFetchSitemapCounts.mockResolvedValue({
      projects: 12000,
      impacts: 0,
      grants: 0,
      milestones: 0,
      fundingPrograms: 0,
    });

    const { computeChunkCount, fetchSitemapCounts, SITEMAP_PAGE_SIZE } = await import(
      "@/utilities/sitemap"
    );
    const counts = await fetchSitemapCounts();
    const chunkCount = computeChunkCount(counts?.projects ?? 0, SITEMAP_PAGE_SIZE);
    const chunks = Array.from({ length: chunkCount }, (_, i) => ({ id: i + 1 }));

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toEqual({ id: 1 });
    expect(chunks[2]).toEqual({ id: 3 });
  });
});

describe("chunked kind sitemaps — impacts sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sitemap() maps urls to entries with correct priority (0.7) and changeFrequency weekly", async () => {
    const testUrl = "https://www.karmahq.xyz/project/test/impacts/i1";
    mockFetchSitemapUrls.mockResolvedValue([testUrl]);

    const { buildSitemapEntries, fetchSitemapUrls } = await import("@/utilities/sitemap");
    const urls = await fetchSitemapUrls("impacts", 1, sitemapUtils.SITEMAP_PAGE_SIZE);
    const entries = buildSitemapEntries(urls, { priority: 0.7, changeFrequency: "weekly" });

    expect(entries[0].priority).toBe(0.7);
    expect(entries[0].changeFrequency).toBe("weekly");
  });
});

describe("chunked kind sitemaps — grants sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sitemap() maps urls to entries with correct priority (0.6) and changeFrequency weekly", async () => {
    const testUrl = "https://www.karmahq.xyz/project/test/grants/g1";
    mockFetchSitemapUrls.mockResolvedValue([testUrl]);

    const { buildSitemapEntries, fetchSitemapUrls } = await import("@/utilities/sitemap");
    const urls = await fetchSitemapUrls("grants", 1, sitemapUtils.SITEMAP_PAGE_SIZE);
    const entries = buildSitemapEntries(urls, { priority: 0.6, changeFrequency: "weekly" });

    expect(entries[0].priority).toBe(0.6);
    expect(entries[0].changeFrequency).toBe("weekly");
  });
});

describe("chunked kind sitemaps — milestones sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sitemap() maps urls to entries with correct priority (0.5) and changeFrequency weekly", async () => {
    const testUrl = "https://www.karmahq.xyz/project/test/milestones/m1";
    mockFetchSitemapUrls.mockResolvedValue([testUrl]);

    const { buildSitemapEntries, fetchSitemapUrls } = await import("@/utilities/sitemap");
    const urls = await fetchSitemapUrls("milestones", 1, sitemapUtils.SITEMAP_PAGE_SIZE);
    const entries = buildSitemapEntries(urls, { priority: 0.5, changeFrequency: "weekly" });

    expect(entries[0].priority).toBe(0.5);
    expect(entries[0].changeFrequency).toBe("weekly");
  });
});

describe("chunked kind sitemaps — funding-programs sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sitemap() maps urls to entries with correct priority (0.6) and changeFrequency weekly", async () => {
    const testUrl = "https://www.karmahq.xyz/funding-programs/fp1";
    mockFetchSitemapUrls.mockResolvedValue([testUrl]);

    const { buildSitemapEntries, fetchSitemapUrls } = await import("@/utilities/sitemap");
    const urls = await fetchSitemapUrls("funding-programs", 1, sitemapUtils.SITEMAP_PAGE_SIZE);
    const entries = buildSitemapEntries(urls, { priority: 0.6, changeFrequency: "weekly" });

    expect(entries[0].priority).toBe(0.6);
    expect(entries[0].changeFrequency).toBe("weekly");
    expect(entries[0].url).toBe(testUrl);
  });

  it("returns [] on empty urls", async () => {
    mockFetchSitemapUrls.mockResolvedValue([]);
    const { buildSitemapEntries, fetchSitemapUrls } = await import("@/utilities/sitemap");
    const urls = await fetchSitemapUrls("funding-programs", 1, sitemapUtils.SITEMAP_PAGE_SIZE);
    const entries = buildSitemapEntries(urls, { priority: 0.6, changeFrequency: "weekly" });
    expect(entries).toHaveLength(0);
  });

  it("generateSitemaps() produces correct chunk IDs for funding-programs (6 000 → 2 chunks)", async () => {
    mockFetchSitemapCounts.mockResolvedValue({
      projects: 0,
      impacts: 0,
      grants: 0,
      milestones: 0,
      fundingPrograms: 6000,
    });

    const { computeChunkCount, fetchSitemapCounts, SITEMAP_PAGE_SIZE } = await import(
      "@/utilities/sitemap"
    );
    const counts = await fetchSitemapCounts();
    const chunkCount = computeChunkCount(counts?.fundingPrograms ?? 0, SITEMAP_PAGE_SIZE);
    const chunks = Array.from({ length: chunkCount }, (_, i) => ({ id: i + 1 }));

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual({ id: 1 });
    expect(chunks[1]).toEqual({ id: 2 });
  });
});
