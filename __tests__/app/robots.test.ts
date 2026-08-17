import robots from "@/app/robots";
import { CANONICAL_HOST, STAGING_HOST } from "@/utilities/domains";
import { SITE_URL } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

// robots.txt is host-aware: proxy.ts never rewrites it (its matcher skips root
// paths containing a dot), so the same route answers on the canonical host,
// staging, and every whitelabel tenant domain.
const requestHost = vi.hoisted(() => ({ value: "" }));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: requestHost.value }),
}));

async function robotsForHost(host: string) {
  requestHost.value = host;
  return robots();
}

const result = await robotsForHost(CANONICAL_HOST);

const SEARCH_AND_USER_FETCH_BOTS = [
  "Googlebot",
  "Bingbot",
  "DuckDuckBot",
  "OAI-SearchBot",
  "Applebot",
];

const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
  "Bytespider",
];

describe("robots", () => {
  it("should return 13 rule sets", () => {
    expect(result.rules).toHaveLength(13);
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
    const aiCrawlers = AI_CRAWLERS;
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

    it("should block /extended-sitemap.xml", () => {
      expect(disallowed).toContain("/extended-sitemap.xml");
    });

    it("should have exactly 5 disallow entries", () => {
      expect(disallowed).toHaveLength(5);
    });
  });

  describe("AI crawler rules", () => {
    const rules = result.rules as Array<Record<string, unknown>>;
    const aiCrawlers = AI_CRAWLERS;

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

  describe("search and user-fetch bot rules", () => {
    const rules = result.rules as Array<Record<string, unknown>>;
    const wildcard = rules.find((r) => r.userAgent === "*");

    for (const bot of SEARCH_AND_USER_FETCH_BOTS) {
      describe(bot, () => {
        const rule = rules.find((r) => r.userAgent === bot);

        it("should have a dedicated rule", () => {
          expect(rule).toBeDefined();
        });

        it("should allow the root path", () => {
          expect(rule?.allow).toContain("/");
        });

        it("should grant exactly the wildcard allow list", () => {
          expect(rule?.allow).toEqual(wildcard?.allow);
        });

        it("should apply exactly the wildcard disallow list", () => {
          expect(rule?.disallow).toEqual(wildcard?.disallow);
        });
      });
    }
  });

  describe("priority routes stay reachable for search and user-fetch bots", () => {
    const rules = result.rules as Array<Record<string, unknown>>;
    const priorityRoutes = [
      PAGES.HOME,
      PAGES.PROJECTS_EXPLORER,
      PAGES.COMMUNITIES,
      PAGES.PROJECT.OVERVIEW("sample-project"),
      PAGES.COMMUNITY.ALL_GRANTS("sample-community"),
    ];

    for (const bot of SEARCH_AND_USER_FETCH_BOTS) {
      for (const route of priorityRoutes) {
        it(`should keep ${route} crawlable by ${bot}`, () => {
          const rule = rules.find((r) => r.userAgent === bot);
          const disallowed = (rule?.disallow ?? []) as string[];
          const blocking = disallowed.filter((prefix) => route.startsWith(prefix));
          expect(blocking).toEqual([]);
          expect(rule?.allow).toContain("/");
        });
      }
    }
  });

  describe("crawler rule inventory", () => {
    const rules = result.rules as Array<Record<string, unknown>>;

    it("should not block the whole site for any crawler", () => {
      const fullyBlocked = rules
        .filter((r) => (r.disallow as string[] | undefined)?.includes("/"))
        .map((r) => r.userAgent);
      expect(fullyBlocked).toEqual([]);
    });

    it("should declare exactly the expected user agents", () => {
      const userAgents = rules.map((r) => r.userAgent);
      expect(userAgents.slice().sort()).toEqual(
        [
          "*",
          "Applebot",
          "Bingbot",
          "Bytespider",
          "CCBot",
          "ChatGPT-User",
          "ClaudeBot",
          "DuckDuckBot",
          "GPTBot",
          "Google-Extended",
          "Googlebot",
          "OAI-SearchBot",
          "PerplexityBot",
        ].sort()
      );
    });

    it("should keep Googlebot distinct from the Google-Extended training rule", () => {
      const googlebot = rules.find((r) => r.userAgent === "Googlebot");
      const googleExtended = rules.find((r) => r.userAgent === "Google-Extended");
      expect(googlebot).toBeDefined();
      expect(googleExtended).toBeDefined();
      expect(googlebot).not.toBe(googleExtended);
      expect(googleExtended?.allow).toContain("/llms.txt");
      expect(googlebot?.allow).not.toContain("/llms.txt");
    });

    it.each(["CCBot", "Bytespider"])(
      "should grant %s the same access as other AI crawlers",
      (bot) => {
        const rule = rules.find((r) => r.userAgent === bot);
        const gptbot = rules.find((r) => r.userAgent === "GPTBot");
        expect(rule).toBeDefined();
        expect(rule?.allow).toContain("/");
        expect(rule?.allow).toEqual(gptbot?.allow);
        expect(rule?.disallow).toEqual(gptbot?.disallow);
      }
    );

    it("should explicitly list ChatGPT-User as an allowed crawler", () => {
      const rule = rules.find((r) => r.userAgent === "ChatGPT-User");
      expect(rule).toBeDefined();
      expect(rule?.allow).toContain("/");
    });
  });

  describe("sitemaps", () => {
    it("should reference only the fresh sitemap index URL", () => {
      expect(result.sitemap).toEqual([`${SITE_URL}/sitemap_index.xml`]);
    });

    it("should not advertise the stuck legacy index URLs", () => {
      expect(result.sitemap).not.toContain(`${SITE_URL}/sitemap.xml`);
      expect(result.sitemap).not.toContain(`${SITE_URL}/sitemap-index.xml`);
    });
  });

  it("should set the host to the site URL", () => {
    expect(result.host).toBe(SITE_URL);
  });
});

describe("robots on the staging host", () => {
  it("blocks every crawler outright", async () => {
    const staging = await robotsForHost(STAGING_HOST);
    const rules = Array.isArray(staging.rules) ? staging.rules : [staging.rules];

    expect(rules).toHaveLength(1);
    expect(rules[0].userAgent).toBe("*");
    expect(rules[0].disallow).toBe("/");
  });

  it("advertises neither a sitemap nor a host", async () => {
    const staging = await robotsForHost(STAGING_HOST);

    expect(staging.sitemap).toBeUndefined();
    expect(staging.host).toBeUndefined();
  });

  it("does not depend on a canonical hint to stay out of the index", async () => {
    // staging.karmahq.org is new with the .org migration, so it carries none of
    // the "already ignored" history an old host would. A cross-domain canonical
    // is only a hint to Google; the disallow is the directive.
    const staging = await robotsForHost(STAGING_HOST);
    const rules = Array.isArray(staging.rules) ? staging.rules : [staging.rules];

    expect(rules.every((rule) => rule.allow === undefined)).toBe(true);
  });
});

describe("robots on a whitelabel tenant domain", () => {
  const TENANT_HOST = "grantsapp.scroll.io";

  it("never declares the tenant domain a mirror of the canonical host", async () => {
    // A `Host:` directive here would tell crawlers the tenant's branded domain
    // is a duplicate of www.karmahq.org.
    const tenant = await robotsForHost(TENANT_HOST);

    expect(tenant.host).toBeUndefined();
  });

  it("does not advertise a sitemap that contains none of the tenant's URLs", async () => {
    // canonicalizeSitemapUrl rewrites every sitemap entry to the canonical
    // host, so the Karma sitemap is useless to a tenant crawler.
    const tenant = await robotsForHost(TENANT_HOST);

    expect(tenant.sitemap).toBeUndefined();
  });

  it("still serves the full crawl policy", async () => {
    const tenant = await robotsForHost(TENANT_HOST);
    const rules = Array.isArray(tenant.rules) ? tenant.rules : [tenant.rules];

    expect(rules).toHaveLength(13);
    expect(rules[0].allow).toContain("/");
    expect(rules[0].disallow).toContain("/api/");
  });
});
