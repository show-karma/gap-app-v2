import robots from "@/app/robots";
import { SITE_URL } from "@/utilities/meta";

describe("robots", () => {
  const result = robots();

  it("should return a single rule set", () => {
    expect(result.rules).toHaveLength(1);
  });

  it("should apply to all user agents", () => {
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.userAgent).toBe("*");
  });

  it("should allow the root path", () => {
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.allow).toBe("/");
  });

  describe("disallow rules", () => {
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallowed = rule.disallow as string[];

    it("should block /api/", () => {
      expect(disallowed).toContain("/api/");
    });

    it("should block /admin/", () => {
      expect(disallowed).toContain("/admin/");
    });

    it("should block /super-admin/", () => {
      expect(disallowed).toContain("/super-admin/");
    });

    it("should block /safe/", () => {
      expect(disallowed).toContain("/safe/");
    });

    it("should have exactly 4 disallow entries", () => {
      expect(disallowed).toHaveLength(4);
    });
  });

  describe("sitemaps", () => {
    it("should reference the main sitemap", () => {
      expect(result.sitemap).toContain(`${SITE_URL}/sitemap.xml`);
    });

    it("should reference the projects sitemap", () => {
      expect(result.sitemap).toContain(`${SITE_URL}/sitemaps/projects/sitemap.xml`);
    });

    it("should reference the communities sitemap", () => {
      expect(result.sitemap).toContain(`${SITE_URL}/sitemaps/communities/sitemap.xml`);
    });

    it("should list exactly 3 sitemaps", () => {
      expect(result.sitemap).toHaveLength(3);
    });
  });

  it("should set the host to the site URL", () => {
    expect(result.host).toBe(SITE_URL);
  });
});
