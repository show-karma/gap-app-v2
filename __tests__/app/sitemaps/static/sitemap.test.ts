import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/utilities/meta";

describe("app/sitemaps/static/sitemap.ts", () => {
  it("includes the MCP connect and For AI Agents pages", async () => {
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = staticSitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/mcp/connect`);
    expect(urls).toContain(`${SITE_URL}/for-agents`);
  });

  it("includes the find-funders landing and connect setup pages", async () => {
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = staticSitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/non-profits/find-funders`);
    expect(urls).toContain(`${SITE_URL}/non-profits/find-funders/connect`);
    expect(urls).toContain(`${SITE_URL}/non-profits/find-funders/connect/claude`);
    expect(urls).toContain(`${SITE_URL}/non-profits/find-funders/connect/chatgpt`);
  });

  it("sets homepage priority to 1 and changeFrequency to daily", async () => {
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = staticSitemap();
    const homepage = entries.find((e) => e.url === SITE_URL);
    expect(homepage?.priority).toBe(1);
    expect(homepage?.changeFrequency).toBe("daily");
  });

  it("downgrades privacy/terms/dashboard to yearly low-priority entries", async () => {
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const entries = staticSitemap();
    const lowPriorityUrls = [
      `${SITE_URL}/privacy-policy`,
      `${SITE_URL}/terms-and-conditions`,
      `${SITE_URL}/dashboard`,
    ];
    for (const url of lowPriorityUrls) {
      const entry = entries.find((e) => e.url === url);
      expect(entry?.priority).toBe(0.3);
      expect(entry?.changeFrequency).toBe("yearly");
    }
  });
});
