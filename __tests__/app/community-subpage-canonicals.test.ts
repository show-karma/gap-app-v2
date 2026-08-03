/**
 * Sitemap-membership <-> canonical consistency gate (DEV-586).
 *
 * A URL only belongs in a sitemap if it is the canonical of its own crawlable
 * content. Every community sub-page is a client-rendered shell today — a
 * production crawl (2026-08-03, Googlebot UA, JavaScript disabled) measured
 * funding-opportunities at 406 chars of visible text, updates 475, impact 613,
 * financials 501 and reports 406, while /projects returned 5578 chars that are
 * 99.9% identical to the community root's 5570, with no unique words at all.
 *
 * So the communities sitemap submits roots only, and the sub-pages consolidate
 * onto the community root canonical they inherit from the layout. This file
 * pins both halves of that contract:
 *
 *   1. the sitemap contains community roots and nothing else;
 *   2. no shell sub-page declares a self-canonical.
 *
 * Re-adding a sub-page to the sitemap fails (1) until it also declares a
 * canonical, and adding a canonical fails (2) until it is also submitted — so
 * server-rendered content, canonical and sitemap entry can only move together.
 */
import type { Metadata } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SITE_URL } from "@/utilities/meta";

const { chosenCommunitiesMock, getCommunityDetailsMock, getWhitelabelContextMock, apiGetMock } =
  vi.hoisted(() => ({
    chosenCommunitiesMock: vi.fn(),
    getCommunityDetailsMock: vi.fn(),
    getWhitelabelContextMock: vi.fn(),
    apiGetMock: vi.fn(),
  }));

vi.mock("@/utilities/chosenCommunities", () => ({
  chosenCommunities: chosenCommunitiesMock,
}));

vi.mock("@/utilities/community-flags", () => ({
  FINANCIALS_ENABLED_COMMUNITIES: ["filecoin"],
}));

vi.mock("@/utilities/whitelabel-server", () => ({
  getWhitelabelContext: getWhitelabelContextMock,
}));

vi.mock("@/utilities/queries/v2/getCommunityData", () => ({
  getCommunityDetails: getCommunityDetailsMock,
  getCommunityCategories: vi.fn(async () => []),
  getCommunityProjects: vi.fn(async () => ({ payload: [], pagination: {} })),
}));

vi.mock("@/utilities/queries/v2/community", () => ({
  getCommunityDetails: getCommunityDetailsMock,
}));

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

// Heavy client trees that the metadata path never touches.
vi.mock("@/components/CommunityGrants", () => ({ CommunityGrants: () => null }));
vi.mock("@/components/Pages/Community/PortfolioReports/PublicReportListPage", () => ({
  PublicReportListPage: () => null,
}));
vi.mock("@/components/Pages/Communities/Financials/PublicControlCenter", () => ({
  PublicControlCenter: () => null,
}));
vi.mock("@/components/Pages/Communities/Impact/ImpactTabNavigator", () => ({
  ImpactTabNavigator: () => null,
}));
vi.mock("@/components/Pages/Communities/Impact/FilterRow", () => ({
  CommunityImpactFilterRow: () => null,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: vi.fn(),
}));

const COMMUNITIES = [
  { name: "Celo", slug: "celo", uid: "0xcelo", imageURL: { light: "", dark: "" } },
  { name: "Filecoin", slug: "filecoin", uid: "0xfilecoin", imageURL: { light: "", dark: "" } },
];

type MetadataModule = {
  generateMetadata: (args: { params: Promise<{ communityId: string }> }) => Promise<Metadata>;
};

/**
 * Every sub-page route under /community/<id>/, mapped to the module that owns
 * its metadata. None of these is submitted to the sitemap today.
 */
const SUBPAGE_METADATA_MODULES: Record<string, () => Promise<MetadataModule>> = {
  "funding-opportunities": () =>
    import("@/app/community/[communityId]/(with-header)/funding-opportunities/layout"),
  projects: () => import("@/app/community/[communityId]/(with-header)/projects/page"),
  updates: () => import("@/app/community/[communityId]/(with-header)/updates/layout"),
  impact: () => import("@/app/community/[communityId]/(with-header)/impact/layout"),
  financials: () => import("@/app/community/[communityId]/(with-header)/financials/page"),
  reports: () => import("@/app/community/[communityId]/(with-header)/reports/page"),
};

/**
 * Shells whose canonical must stay inherited. `reports` is deliberately absent:
 * it already declared its own canonical before DEV-586 and that predates this
 * change, so it is left alone — it is still kept out of the sitemap below.
 */
const SHELL_SUBPAGES = ["funding-opportunities", "projects", "updates", "impact", "financials"];

/** Sub-pages that always return a title (financials returns {} when unflagged). */
const TITLED_SUBPAGES = ["funding-opportunities", "projects", "updates", "impact"];

async function sitemapUrls(): Promise<string[]> {
  const { default: communitiesSitemap } = await import("@/app/sitemaps/communities/sitemap");
  const entries = await communitiesSitemap();
  return entries.map((entry) => entry.url);
}

async function metadataFor(subpath: string, communityId: string): Promise<Metadata> {
  const mod = await SUBPAGE_METADATA_MODULES[subpath]();
  return mod.generateMetadata({ params: Promise.resolve({ communityId }) });
}

describe("community sitemap membership and canonicals", () => {
  beforeEach(() => {
    vi.resetModules();
    chosenCommunitiesMock.mockReturnValue(COMMUNITIES);
    getCommunityDetailsMock.mockResolvedValue({ details: { name: "Celo" } });
    getWhitelabelContextMock.mockResolvedValue({ isWhitelabel: false, config: null });
    apiGetMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("the sitemap submits community roots only", () => {
    it("emits exactly one entry per chosen community", async () => {
      expect(await sitemapUrls()).toEqual([
        `${SITE_URL}/community/celo`,
        `${SITE_URL}/community/filecoin`,
      ]);
    });

    it("submits no sub-page URLs at all", async () => {
      const subPageUrls = (await sitemapUrls()).filter((url) => /\/community\/[^/]+\/.+/.test(url));
      expect(subPageUrls).toEqual([]);
    });

    // Named one by one so re-adding any of them is a deliberate, reviewed act
    // rather than a silent regression.
    it.each(Object.keys(SUBPAGE_METADATA_MODULES))(
      "does not submit /%s while it is a client-rendered shell",
      async (subPage) => {
        expect(await sitemapUrls()).not.toContain(`${SITE_URL}/community/celo/${subPage}`);
      }
    );

    it("still submits the community root, which carries the real content", async () => {
      expect(await sitemapUrls()).toContain(`${SITE_URL}/community/celo`);
    });

    it("falls back to uid when a community has no slug", async () => {
      chosenCommunitiesMock.mockReturnValue([{ name: "X", slug: undefined, uid: "uid-only" }]);
      expect(await sitemapUrls()).toEqual([`${SITE_URL}/community/uid-only`]);
    });

    it("emits no query strings and no duplicate URLs", async () => {
      const urls = await sitemapUrls();
      expect(urls.every((url) => !url.includes("?"))).toBe(true);
      expect(new Set(urls).size).toBe(urls.length);
    });

    it("omits lastModified rather than fabricating one", async () => {
      const { default: communitiesSitemap } = await import("@/app/sitemaps/communities/sitemap");
      const entries = await communitiesSitemap();
      expect(entries.every((entry) => entry.lastModified === undefined)).toBe(true);
    });
  });

  describe("shell sub-pages consolidate onto the community root", () => {
    it.each(SHELL_SUBPAGES)("%s declares no canonical of its own", async (subPage) => {
      const metadata = await metadataFor(subPage, "celo");
      expect(metadata.alternates?.canonical).toBeUndefined();
    });

    it("financials declares no canonical even for a flagged community", async () => {
      const metadata = await metadataFor("financials", "filecoin");
      expect(metadata.alternates?.canonical).toBeUndefined();
    });

    it.each(TITLED_SUBPAGES)(
      "%s still sets a distinct title, so the copy is ready when it earns a canonical",
      async (subPage) => {
        const metadata = await metadataFor(subPage, "celo");
        expect(typeof metadata.title).toBe("string");
        expect(String(metadata.title).length).toBeGreaterThan(0);
      }
    );

    it("sub-page titles are unique across routes", async () => {
      const titles = await Promise.all(
        TITLED_SUBPAGES.map(async (subPage) => (await metadataFor(subPage, "celo")).title)
      );
      expect(new Set(titles).size).toBe(titles.length);
    });

    // Production served "Celo Community Grants | Karma | Karma" on several of
    // these before DEV-586, from a title that already carried the brand suffix
    // being wrapped by the layout template.
    it.each(TITLED_SUBPAGES)("%s title carries no doubled brand suffix", async (subPage) => {
      const metadata = await metadataFor(subPage, "celo");
      expect(String(metadata.title)).not.toMatch(/\|\s*Karma\s*\|\s*Karma/);
    });
  });
});
