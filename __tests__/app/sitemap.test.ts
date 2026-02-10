import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/utilities/meta";

describe("sitemap", () => {
  const entries = sitemap();

  it("should return an array of sitemap entries", () => {
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  it("should have all URLs under the site domain", () => {
    for (const entry of entries) {
      expect(entry.url).toMatch(new RegExp(`^${SITE_URL}`));
    }
  });

  it("should include the homepage", () => {
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(SITE_URL);
  });

  describe("static pages", () => {
    const expectedPages = [
      "/projects",
      "/communities",
      "/funders",
      "/funding-map",
      "/create-project-profile",
      "/knowledge",
      "/privacy-policy",
      "/terms-and-conditions",
    ];

    for (const page of expectedPages) {
      it(`should include ${page}`, () => {
        const urls = entries.map((e) => e.url);
        expect(urls).toContain(`${SITE_URL}${page}`);
      });
    }
  });

  describe("knowledge articles", () => {
    const knowledgeEntries = entries.filter((e) => e.url.includes("/knowledge/"));

    it("should include multiple knowledge articles", () => {
      expect(knowledgeEntries.length).toBeGreaterThanOrEqual(15);
    });

    it("should include key knowledge articles", () => {
      const urls = entries.map((e) => e.url);
      expect(urls).toContain(`${SITE_URL}/knowledge/grant-accountability`);
      expect(urls).toContain(`${SITE_URL}/knowledge/grant-lifecycle`);
      expect(urls).toContain(`${SITE_URL}/knowledge/onchain-reputation`);
    });
  });

  describe("changeFrequency", () => {
    it("should set homepage to daily", () => {
      const homepage = entries.find((e) => e.url === SITE_URL);
      expect(homepage?.changeFrequency).toBe("daily");
    });

    it("should set non-homepage pages to weekly", () => {
      const nonHomepageEntries = entries.filter((e) => e.url !== SITE_URL);
      for (const entry of nonHomepageEntries) {
        expect(entry.changeFrequency).toBe("weekly");
      }
    });
  });

  describe("priority", () => {
    it("should give homepage highest priority (1)", () => {
      const homepage = entries.find((e) => e.url === SITE_URL);
      expect(homepage?.priority).toBe(1);
    });

    it("should give knowledge articles priority 0.7", () => {
      const knowledgeEntries = entries.filter((e) => e.url.includes("/knowledge"));
      for (const entry of knowledgeEntries) {
        expect(entry.priority).toBe(0.7);
      }
    });

    it("should give other pages priority 0.8", () => {
      const otherEntries = entries.filter(
        (e) => e.url !== SITE_URL && !e.url.includes("/knowledge")
      );
      for (const entry of otherEntries) {
        expect(entry.priority).toBe(0.8);
      }
    });
  });

  describe("lastModified", () => {
    it("should have lastModified as a valid ISO date string", () => {
      for (const entry of entries) {
        expect(() => new Date(entry.lastModified as string)).not.toThrow();
        expect(new Date(entry.lastModified as string).toISOString()).toBe(entry.lastModified);
      }
    });
  });

  it("should not have duplicate URLs", () => {
    const urls = entries.map((e) => e.url);
    const unique = new Set(urls);
    expect(unique.size).toBe(urls.length);
  });
});
