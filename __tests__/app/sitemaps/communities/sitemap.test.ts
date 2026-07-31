import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SITE_URL } from "@/utilities/meta";

const { chosenCommunitiesMock } = vi.hoisted(() => ({
  chosenCommunitiesMock: vi.fn(),
}));

vi.mock("@/utilities/chosenCommunities", () => ({
  chosenCommunities: chosenCommunitiesMock,
}));

vi.mock("@/utilities/community-flags", () => ({
  FINANCIALS_ENABLED_COMMUNITIES: ["filecoin"],
}));

const COMMUNITIES = [
  { name: "Celo", slug: "celo", uid: "0xcelo", imageURL: { light: "", dark: "" } },
  { name: "Filecoin", slug: "filecoin", uid: "0xfilecoin", imageURL: { light: "", dark: "" } },
  // No slug: the sitemap must fall back to the uid rather than emit `/undefined`.
  { name: "Slugless", slug: "", uid: "0xslugless", imageURL: { light: "", dark: "" } },
];

const loadSitemap = async () => {
  const { default: communitiesSitemap } = await import("@/app/sitemaps/communities/sitemap");
  return communitiesSitemap();
};

const urlsFor = (entries: Array<{ url: string }>, identifier: string) =>
  entries
    .map((entry) => entry.url)
    .filter((url) => url.startsWith(`${SITE_URL}/community/${identifier}`));

describe("app/sitemaps/communities/sitemap.ts", () => {
  beforeEach(() => {
    chosenCommunitiesMock.mockReturnValue(COMMUNITIES);
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("emits the community root plus every self-canonical sub-page", async () => {
    const entries = await loadSitemap();

    expect(urlsFor(entries, "celo")).toEqual([
      `${SITE_URL}/community/celo`,
      `${SITE_URL}/community/celo/funding-opportunities`,
      `${SITE_URL}/community/celo/projects`,
      `${SITE_URL}/community/celo/updates`,
      `${SITE_URL}/community/celo/impact`,
      `${SITE_URL}/community/celo/reports`,
    ]);
  });

  it("omits browse-applications — it has no server-rendered content to index", async () => {
    const entries = await loadSitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls.some((url) => url.includes("browse-applications"))).toBe(false);
  });

  it("emits financials only for communities where the feature is enabled", async () => {
    const entries = await loadSitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(`${SITE_URL}/community/filecoin/financials`);
    expect(urls).not.toContain(`${SITE_URL}/community/celo/financials`);
    expect(urls.filter((url) => url.endsWith("/financials"))).toHaveLength(1);
  });

  it("falls back to the uid when a community has no slug", async () => {
    const entries = await loadSitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(`${SITE_URL}/community/0xslugless`);
    expect(urls).toContain(`${SITE_URL}/community/0xslugless/projects`);
    expect(urls.some((url) => url.includes("undefined"))).toBe(false);
  });

  it("keeps every URL on the canonical origin with no query, hash or duplicate", async () => {
    const entries = await loadSitemap();
    const urls = entries.map((entry) => entry.url);

    for (const url of urls) {
      const parsed = new URL(url);
      expect(parsed.origin).toBe(new URL(SITE_URL).origin);
      expect(parsed.search).toBe("");
      expect(parsed.hash).toBe("");
    }
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("ranks the community root above its sub-pages", async () => {
    const entries = await loadSitemap();
    const root = entries.find((entry) => entry.url === `${SITE_URL}/community/celo`);
    const subPage = entries.find((entry) => entry.url === `${SITE_URL}/community/celo/projects`);

    expect(root?.priority).toBe(0.9);
    expect(subPage?.priority).toBe(0.7);
    expect(root?.changeFrequency).toBe("daily");
  });

  it("omits lastModified rather than fabricating one", async () => {
    const entries = await loadSitemap();

    for (const entry of entries) {
      expect(entry.lastModified).toBeUndefined();
    }
  });
});
