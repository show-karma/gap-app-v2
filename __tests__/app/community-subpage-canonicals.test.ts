/**
 * Sitemap-membership <-> canonical consistency gate (DEV-586).
 *
 * A URL only belongs in a sitemap if it is the canonical of its own crawlable
 * content. Most community sub-pages are client-rendered shells — a production
 * crawl (2026-08-03, Googlebot UA, JavaScript disabled) measured updates at
 * 475 chars of visible text, impact 613, financials 501 and reports 406, while
 * /projects returned 5578 chars that are 99.9% identical to the community
 * root's 5570, with no unique words at all.
 *
 * So the communities sitemap submits community roots plus only the sub-pages
 * that server-render their own content, and the remaining shells consolidate
 * onto the community root canonical they inherit from the layout. This file
 * pins both halves of that contract:
 *
 *   1. the sitemap contains community roots and self-canonical sub-pages only;
 *   2. no shell sub-page declares a self-canonical, and every submitted
 *      sub-page does.
 *
 * `funding-opportunities` crossed over in DEV-611: the program directory is
 * prefetched server-side into the initial HTML (see
 * funding-opportunities-ssr.test.tsx), so it declares a whitelabel-aware
 * self-canonical and ships in the sitemap again — both halves moved together.
 *
 * Re-adding a shell sub-page to the sitemap fails (1) until it also declares a
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
  EXPLORER_NAV_OVERRIDES: {},
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
 * its metadata.
 */
const SUBPAGE_METADATA_MODULES: Record<string, () => Promise<MetadataModule>> = {
  "funding-opportunities": () =>
    import(
      "@/app/t/[tenant]/(chrome)/community/[communityId]/(with-header)/funding-opportunities/layout"
    ),
  projects: () =>
    import("@/app/t/[tenant]/(chrome)/community/[communityId]/(with-header)/projects/page"),
  updates: () =>
    import("@/app/t/[tenant]/(chrome)/community/[communityId]/(with-header)/updates/layout"),
  impact: () =>
    import("@/app/t/[tenant]/(chrome)/community/[communityId]/(with-header)/impact/layout"),
  financials: () =>
    import("@/app/t/[tenant]/(chrome)/community/[communityId]/(cover)/financials/page"),
  reports: () => import("@/app/t/[tenant]/(chrome)/community/[communityId]/(cover)/reports/page"),
};

/**
 * Shells whose canonical must stay inherited. `reports` is deliberately absent:
 * it already declared its own canonical before DEV-586 and that predates this
 * change, so it is left alone — it is still kept out of the sitemap below.
 * `funding-opportunities` graduated in DEV-611: it server-renders the program
 * directory, so it now lives in SELF_CANONICAL_SUBPAGES instead.
 */
const SHELL_SUBPAGES = ["projects", "updates", "impact", "financials"];

/**
 * Sub-pages that server-render their own content: they declare a
 * self-referential canonical AND ship in the communities sitemap. Both halves
 * are asserted below, so an entry can only be added here once the route
 * genuinely carries its own crawlable content.
 */
const SELF_CANONICAL_SUBPAGES = ["funding-opportunities"];

/**
 * Sub-pages that always return a title (financials returns {} when unflagged).
 *
 * `reports` joined this list when it moved into the chrome-free (cover) group:
 * it no longer inherits a title from the community layout, so it names itself.
 * Membership here is orthogonal to canonicals — it says nothing about whether a
 * route is a shell.
 */
const TITLED_SUBPAGES = ["funding-opportunities", "projects", "updates", "impact", "reports"];

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

  describe("the sitemap submits community roots and self-canonical sub-pages only", () => {
    it("emits the root plus each self-canonical sub-page per chosen community", async () => {
      expect(await sitemapUrls()).toEqual([
        `${SITE_URL}/community/celo`,
        `${SITE_URL}/community/celo/funding-opportunities`,
        `${SITE_URL}/community/filecoin`,
        `${SITE_URL}/community/filecoin/funding-opportunities`,
      ]);
    });

    it("submits no sub-page URLs beyond the self-canonical ones", async () => {
      const subPageUrls = (await sitemapUrls()).filter((url) => /\/community\/[^/]+\/.+/.test(url));
      expect(subPageUrls).toEqual([
        `${SITE_URL}/community/celo/funding-opportunities`,
        `${SITE_URL}/community/filecoin/funding-opportunities`,
      ]);
    });

    // Named one by one so re-adding any of them is a deliberate, reviewed act
    // rather than a silent regression.
    it.each(SHELL_SUBPAGES.concat(["reports"]))(
      "does not submit /%s while it is a client-rendered shell",
      async (subPage) => {
        expect(await sitemapUrls()).not.toContain(`${SITE_URL}/community/celo/${subPage}`);
      }
    );

    // The other half of this pair — the self-referential canonical — is
    // asserted in the canonicals block below, so content, canonical and
    // sitemap entry can only move together.
    it.each(SELF_CANONICAL_SUBPAGES)(
      "submits /%s now that it server-renders its content",
      async (subPage) => {
        expect(await sitemapUrls()).toContain(`${SITE_URL}/community/celo/${subPage}`);
      }
    );

    it("still submits the community root, which carries the real content", async () => {
      expect(await sitemapUrls()).toContain(`${SITE_URL}/community/celo`);
    });

    it("falls back to uid when a community has no slug", async () => {
      chosenCommunitiesMock.mockReturnValue([{ name: "X", slug: undefined, uid: "uid-only" }]);
      expect(await sitemapUrls()).toEqual([
        `${SITE_URL}/community/uid-only`,
        `${SITE_URL}/community/uid-only/funding-opportunities`,
      ]);
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

  describe("self-canonical sub-pages declare themselves", () => {
    it.each(SELF_CANONICAL_SUBPAGES)(
      "%s declares a self-referential canonical on the main site",
      async (subPage) => {
        const metadata = await metadataFor(subPage, "celo");
        expect(metadata.alternates?.canonical).toBe(`/community/celo/${subPage}`);
      }
    );

    // On a whitelabel domain the `/community/<slug>` prefix is stripped from
    // URLs, so the canonical must be the bare sub-path.
    it.each(SELF_CANONICAL_SUBPAGES)(
      "%s declares the bare sub-path canonical on a whitelabel domain",
      async (subPage) => {
        getWhitelabelContextMock.mockResolvedValue({ isWhitelabel: true, config: {} });
        const metadata = await metadataFor(subPage, "celo");
        expect(metadata.alternates?.canonical).toBe(`/${subPage}`);
      }
    );

    // `reports` declares its own canonical but stays out of the sitemap (see
    // above), so it is deliberately not in SELF_CANONICAL_SUBPAGES. Pinned
    // explicitly because the (cover) route-group move rewrote its
    // generateMetadata — the canonical had to survive that rewrite.
    it("reports keeps its self-referential canonical after the (cover) move", async () => {
      const metadata = await metadataFor("reports", "celo");
      expect(metadata.alternates?.canonical).toBe("/community/celo/reports");
    });

    it("reports keeps the bare sub-path canonical on a whitelabel domain", async () => {
      getWhitelabelContextMock.mockResolvedValue({ isWhitelabel: true, config: {} });
      const metadata = await metadataFor("reports", "celo");
      expect(metadata.alternates?.canonical).toBe("/reports");
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
  });

  describe("titled sub-pages", () => {
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
