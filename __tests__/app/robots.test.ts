import robots from "@/app/robots";
import { SITE_URL } from "@/utilities/meta";

describe("robots", () => {
  const result = robots();

  it("should return 8 rule sets", () => {
    expect(result.rules).toHaveLength(8);
  });

  it("should apply wildcard rule to all user agents", () => {
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.userAgent).toBe("*");
  });

  it("should allow the root path for wildcard rule", () => {
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.allow).toContain("/");
  });

  it("should allow /.well-known/ for wildcard rule", () => {
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.allow).toContain("/.well-known/");
  });

  it("should allow /.well-known/ for every AI crawler rule", () => {
    const rules = result.rules as Array<Record<string, unknown>>;
    const aiCrawlers = ["GPTBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Google-Extended"];
    for (const crawler of aiCrawlers) {
      const rule = rules.find((r) => r.userAgent === crawler);
      expect(rule?.allow).toContain("/.well-known/");
    }
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

  describe("AI crawler rules", () => {
    const rules = result.rules as Array<Record<string, unknown>>;
    const aiCrawlers = ["GPTBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Google-Extended"];

    for (const crawler of aiCrawlers) {
      it(`should have a rule for ${crawler}`, () => {
        const rule = rules.find((r) => r.userAgent === crawler);
        expect(rule).toBeDefined();
        expect(rule?.allow).toContain("/llms.txt");
        expect(rule?.allow).toContain("/llms-full.txt");
        expect(rule?.allow).toContain("/agents.md");
        expect(rule?.disallow).toContain("/api/");
      });
    }
  });

  describe("training-only crawler blocks", () => {
    const rules = result.rules as Array<Record<string, unknown>>;

    it("should disallow the entire site for CCBot", () => {
      const rule = rules.find((r) => r.userAgent === "CCBot");
      expect(rule).toBeDefined();
      expect(rule?.disallow).toContain("/");
    });

    it("should disallow the entire site for Bytespider", () => {
      const rule = rules.find((r) => r.userAgent === "Bytespider");
      expect(rule).toBeDefined();
      expect(rule?.disallow).toContain("/");
    });

    it("should explicitly list ChatGPT-User as an allowed crawler", () => {
      const rule = rules.find((r) => r.userAgent === "ChatGPT-User");
      expect(rule).toBeDefined();
      expect(rule?.allow).toContain("/");
    });
  });

  describe("sitemaps", () => {
    it("should reference the main sitemap index", () => {
      expect(result.sitemap).toContain(`${SITE_URL}/sitemap.xml`);
    });

    it("should reference the sitemap-index alias served at a fresh URL", () => {
      expect(result.sitemap).toContain(`${SITE_URL}/sitemap-index.xml`);
    });

    it("should list exactly 2 sitemap entries (main + alias)", () => {
      expect(result.sitemap).toHaveLength(2);
    });
  });

  it("should set the host to the site URL", () => {
    expect(result.host).toBe(SITE_URL);
  });
});
