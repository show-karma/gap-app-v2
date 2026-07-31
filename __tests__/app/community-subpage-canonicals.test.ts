/**
 * Sitemap-membership <-> canonical consistency gate (DEV-586).
 *
 * A URL only belongs in a sitemap if it is the canonical of its own content.
 * The sub-page path set here is DERIVED from the communities sitemap module, so
 * adding a sub-page to the sitemap without giving it self-canonical, unique
 * metadata fails this test — the two can never drift apart silently.
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
 * Every sub-page the communities sitemap can emit, mapped to the route module
 * that owns its metadata. `assertsCoversSitemap` below proves this registry is
 * exhaustive.
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

type SitemapEntry = { communityId: string; subpath: string; url: string };

async function sitemapSubpageEntries(): Promise<SitemapEntry[]> {
  const { default: communitiesSitemap } = await import("@/app/sitemaps/communities/sitemap");
  const entries = await communitiesSitemap();
  return entries
    .map((entry) => {
      const { pathname } = new URL(entry.url);
      const [, , communityId, ...rest] = pathname.split("/");
      return { communityId, subpath: rest.join("/"), url: entry.url };
    })
    .filter((entry) => entry.subpath !== "");
}

async function metadataFor(subpath: string, communityId: string): Promise<Metadata> {
  const loader = SUBPAGE_METADATA_MODULES[subpath];
  if (!loader) {
    throw new Error(`No metadata module registered for sub-page "${subpath}"`);
  }
  const mod = await loader();
  return mod.generateMetadata({ params: Promise.resolve({ communityId }) });
}

function communityFixture(name: string) {
  return { uid: `0x${name}`, details: { name, slug: name } };
}

describe("community sub-pages listed in the sitemap", () => {
  beforeEach(() => {
    chosenCommunitiesMock.mockReturnValue(COMMUNITIES);
    getWhitelabelContextMock.mockResolvedValue({
      isWhitelabel: false,
      communitySlug: null,
      config: null,
      tenantConfig: null,
    });
    getCommunityDetailsMock.mockImplementation(async (slug: string) => communityFixture(slug));
    apiGetMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("has a metadata module registered for every sub-page the sitemap emits", async () => {
    const entries = await sitemapSubpageEntries();
    const subpaths = [...new Set(entries.map((entry) => entry.subpath))];

    expect(subpaths.length).toBeGreaterThan(0);
    for (const subpath of subpaths) {
      expect(
        Object.keys(SUBPAGE_METADATA_MODULES),
        `sitemap emits /${subpath} but no route owns its metadata`
      ).toContain(subpath);
    }
  });

  it("serves a self-referential canonical for every sitemap URL", async () => {
    const entries = await sitemapSubpageEntries();

    for (const entry of entries) {
      const metadata = await metadataFor(entry.subpath, entry.communityId);
      const expectedPath = new URL(entry.url).pathname;

      expect(metadata.alternates?.canonical, `${entry.url} must declare itself canonical`).toBe(
        expectedPath
      );
    }
  });

  it("never marks a sitemap URL noindex", async () => {
    const entries = await sitemapSubpageEntries();

    for (const entry of entries) {
      const metadata = await metadataFor(entry.subpath, entry.communityId);
      const robots = metadata.robots;
      const directive =
        typeof robots === "string"
          ? robots
          : robots && typeof robots === "object" && robots.index === false
            ? "noindex"
            : "";

      expect(directive, `${entry.url} must stay indexable`).not.toContain("noindex");
    }
  });

  it("gives each crawlable sub-page a title distinct from the community root", async () => {
    const entries = (await sitemapSubpageEntries()).filter((entry) => entry.communityId === "celo");
    const rootTitle = "Celo Community Grants | Karma";
    const titles = new Map<string, string>();

    for (const entry of entries) {
      const metadata = await metadataFor(entry.subpath, entry.communityId);
      // `reports` intentionally inherits the community layout's copy; it only
      // corrects the canonical. Everything else must say what it is.
      if (entry.subpath === "reports") {
        continue;
      }
      const title = metadata.title;
      expect(typeof title, `${entry.url} must set its own title`).toBe("string");
      expect(title).not.toBe(rootTitle);
      titles.set(entry.subpath, title as string);
    }

    expect(new Set(titles.values()).size).toBe(titles.size);
    for (const [subpath, title] of titles) {
      expect(title.toLowerCase(), `${subpath} title should name the community`).toContain("celo");
    }
  });

  it("gives each crawlable sub-page its own description", async () => {
    const entries = (await sitemapSubpageEntries()).filter(
      (entry) => entry.communityId === "celo" && entry.subpath !== "reports"
    );
    const descriptions: string[] = [];

    for (const entry of entries) {
      const metadata = await metadataFor(entry.subpath, entry.communityId);
      expect(typeof metadata.description, `${entry.url} must set a description`).toBe("string");
      descriptions.push(metadata.description as string);
    }

    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("strips the /community/<slug> prefix from the canonical on a whitelabel domain", async () => {
    getWhitelabelContextMock.mockResolvedValue({
      isWhitelabel: true,
      communitySlug: "celo",
      config: { domain: "grants.celo.org", communitySlug: "celo" },
      tenantConfig: null,
    });

    const entries = (await sitemapSubpageEntries()).filter((entry) => entry.communityId === "celo");

    for (const entry of entries) {
      const metadata = await metadataFor(entry.subpath, entry.communityId);
      expect(metadata.alternates?.canonical).toBe(`/${entry.subpath}`);
    }
  });

  it("keeps the canonical self-referential when the community lookup fails", async () => {
    getCommunityDetailsMock.mockResolvedValue(null);

    const metadata = await metadataFor("projects", "celo");

    expect(metadata.alternates?.canonical).toBe("/community/celo/projects");
    expect(metadata.title).toContain("celo");
  });

  it("does not list browse-applications — it has nothing to serve a crawler", async () => {
    const entries = await sitemapSubpageEntries();

    expect(entries.some((entry) => entry.subpath === "browse-applications")).toBe(false);
  });
});

describe("funding-program detail pages listed in the sitemap", () => {
  beforeEach(() => {
    getWhitelabelContextMock.mockResolvedValue({
      isWhitelabel: false,
      communitySlug: null,
      config: null,
      tenantConfig: null,
    });
    apiGetMock.mockResolvedValue({
      programId: "42",
      name: "Public Goods Fund",
      metadata: { title: "Public Goods Fund", shortDescription: "Funding public goods." },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("self-canonicals at the /community/<id>/programs/<programId> sitemap shape", async () => {
    const mod = await import(
      "@/app/community/[communityId]/(whitelabel)/programs/[programId]/page"
    );
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ communityId: "celo", programId: "42" }),
    });

    expect(metadata.alternates?.canonical).toBe("/community/celo/programs/42");
    expect(new URL(`${SITE_URL}/community/celo/programs/42`).pathname).toBe(
      metadata.alternates?.canonical
    );
    expect(metadata.robots).toBeUndefined();
  });
});
