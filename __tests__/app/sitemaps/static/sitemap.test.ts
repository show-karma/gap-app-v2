import { afterEach, describe, expect, it, vi } from "vitest";
import { SITE_URL } from "@/utilities/meta";

const { getPublishedSlugsMock } = vi.hoisted(() => ({
  getPublishedSlugsMock: vi.fn(),
}));

vi.mock("@/sanity/lib/gateway", () => ({
  getPublishedSlugs: getPublishedSlugsMock,
}));

describe("app/sitemaps/static/sitemap.ts", () => {
  afterEach(() => {
    vi.resetModules();
    getPublishedSlugsMock.mockReset();
  });

  it("includes the MCP connect and For AI Agents pages", async () => {
    getPublishedSlugsMock.mockResolvedValue([]);
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = await staticSitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/mcp/connect`);
    expect(urls).toContain(`${SITE_URL}/for-agents`);
  });

  it("includes the find-funders landing and connect setup pages", async () => {
    getPublishedSlugsMock.mockResolvedValue([]);
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = await staticSitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/nonprofits/find-funders`);
    expect(urls).toContain(`${SITE_URL}/nonprofits/find-funders/connect`);
    expect(urls).toContain(`${SITE_URL}/nonprofits/find-funders/connect/claude`);
    expect(urls).toContain(`${SITE_URL}/nonprofits/find-funders/connect/chatgpt`);
  });

  it("sets homepage priority to 1 and changeFrequency to daily", async () => {
    getPublishedSlugsMock.mockResolvedValue([]);
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = await staticSitemap();
    const homepage = entries.find((e) => e.url === SITE_URL);
    expect(homepage?.priority).toBe(1);
    expect(homepage?.changeFrequency).toBe("daily");
  });

  it("downgrades privacy/terms to yearly low-priority entries", async () => {
    getPublishedSlugsMock.mockResolvedValue([]);
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = await staticSitemap();
    const lowPriorityUrls = [`${SITE_URL}/privacy-policy`, `${SITE_URL}/terms-and-conditions`];
    for (const url of lowPriorityUrls) {
      const entry = entries.find((e) => e.url === url);
      expect(entry?.priority).toBe(0.3);
      expect(entry?.changeFrequency).toBe("yearly");
    }
  });

  it("includes the static /blog index page", async () => {
    getPublishedSlugsMock.mockResolvedValue([]);
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = await staticSitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/blog`);
  });

  it("appends published blog posts with lastModified set to publishedAt", async () => {
    getPublishedSlugsMock.mockResolvedValue([
      { slug: "hello-world", publishedAt: "2026-01-15T00:00:00.000Z" },
      { slug: "second-post", publishedAt: "2026-02-01T00:00:00.000Z" },
    ]);
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = await staticSitemap();

    const first = entries.find((e) => e.url === `${SITE_URL}/blog/hello-world`);
    expect(first).toBeDefined();
    expect(first?.lastModified).toBe("2026-01-15T00:00:00.000Z");

    const second = entries.find((e) => e.url === `${SITE_URL}/blog/second-post`);
    expect(second).toBeDefined();
    expect(second?.lastModified).toBe("2026-02-01T00:00:00.000Z");
  });

  it("returns just the static pages when there are no published posts", async () => {
    getPublishedSlugsMock.mockResolvedValue([]);
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = await staticSitemap();

    const blogPostEntries = entries.filter(
      (e) => e.url.startsWith(`${SITE_URL}/blog/`) && e.url !== `${SITE_URL}/blog`
    );
    expect(blogPostEntries).toHaveLength(0);
    expect(entries.some((e) => e.url === `${SITE_URL}/blog`)).toBe(true);
  });

  it("excludes drafts because the gateway only returns published slugs", async () => {
    // The gateway's own contract (verified in sanity/lib/gateway tests) is
    // published-only; this asserts the sitemap trusts that contract as-is
    // and doesn't add any additional draft filtering of its own.
    getPublishedSlugsMock.mockResolvedValue([
      { slug: "published-post", publishedAt: "2026-03-01T00:00:00.000Z" },
    ]);
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = await staticSitemap();

    const urls = entries.map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/blog/published-post`);
    expect(urls).toHaveLength(new Set(urls).size); // no duplicates injected
  });

  it("falls back to just the static pages when the gateway errors", async () => {
    getPublishedSlugsMock.mockRejectedValue(new Error("Sanity unavailable"));

    // The gateway itself never throws in production (it catches internally
    // and returns `[]`); this exercises the sitemap's own defense-in-depth
    // fallback in case that contract is ever violated by a caller mock or a
    // future refactor — the route must still resolve, never 500.
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = await staticSitemap();

    const blogPostEntries = entries.filter(
      (e) => e.url.startsWith(`${SITE_URL}/blog/`) && e.url !== `${SITE_URL}/blog`
    );
    expect(blogPostEntries).toHaveLength(0);
    expect(entries.some((e) => e.url === `${SITE_URL}/blog`)).toBe(true);
  });
});
