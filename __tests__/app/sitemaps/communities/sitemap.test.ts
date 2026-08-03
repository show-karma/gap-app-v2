import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SITE_URL } from "@/utilities/meta";

const { chosenCommunitiesMock } = vi.hoisted(() => ({
  chosenCommunitiesMock: vi.fn(),
}));

vi.mock("@/utilities/chosenCommunities", () => ({
  chosenCommunities: chosenCommunitiesMock,
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

  // Community roots only: every sub-page is a client-rendered shell, and
  // /projects is a byte-for-byte near-duplicate of the root. See
  // __tests__/app/community-subpage-canonicals.test.ts for the crawl numbers
  // and the canonical half of the contract.
  it("emits the community root and nothing beneath it", async () => {
    const entries = await loadSitemap();

    expect(urlsFor(entries, "celo")).toEqual([`${SITE_URL}/community/celo`]);
  });

  it.each([
    "funding-opportunities",
    "projects",
    "updates",
    "impact",
    "reports",
    "financials",
    "browse-applications",
  ])("omits /%s — no server-rendered content to index", async (subPage) => {
    const entries = await loadSitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls.some((url) => url.endsWith(`/${subPage}`))).toBe(false);
  });

  it("falls back to the uid when a community has no slug", async () => {
    const entries = await loadSitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(`${SITE_URL}/community/0xslugless`);
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

  it("gives every community root the same priority and change frequency", async () => {
    const entries = await loadSitemap();

    expect(entries).toHaveLength(3);
    for (const entry of entries) {
      expect(entry.priority).toBe(0.9);
      expect(entry.changeFrequency).toBe("daily");
    }
  });

  it("omits lastModified rather than fabricating one", async () => {
    const entries = await loadSitemap();

    for (const entry of entries) {
      expect(entry.lastModified).toBeUndefined();
    }
  });
});
