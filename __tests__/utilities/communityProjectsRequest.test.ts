import {
  buildCommunityProjectsPageHref,
  parseCommunityProjectsPage,
} from "@/utilities/queries/v2/communityProjectsRequest";

describe("parseCommunityProjectsPage", () => {
  it("defaults to page 1 when the param is absent or the record is missing", () => {
    expect(parseCommunityProjectsPage()).toBe(1);
    expect(parseCommunityProjectsPage({})).toBe(1);
  });

  it("reads a positive integer page", () => {
    expect(parseCommunityProjectsPage({ page: "7" })).toBe(7);
  });

  it("falls back to page 1 for values that are not a positive integer", () => {
    expect(parseCommunityProjectsPage({ page: "0" })).toBe(1);
    expect(parseCommunityProjectsPage({ page: "-2" })).toBe(1);
    expect(parseCommunityProjectsPage({ page: "1.5" })).toBe(1);
    expect(parseCommunityProjectsPage({ page: "abc" })).toBe(1);
    expect(parseCommunityProjectsPage({ page: "" })).toBe(1);
    expect(parseCommunityProjectsPage({ page: "99999999999999999999" })).toBe(1);
    expect(parseCommunityProjectsPage({ page: ["2", "3"] })).toBe(1);
  });
});

describe("buildCommunityProjectsPageHref", () => {
  it("omits the page param for page 1 so the canonical URL stays bare", () => {
    expect(buildCommunityProjectsPageHref("/community/celo", 1)).toBe("/community/celo");
    expect(buildCommunityProjectsPageHref("/community/celo", 0)).toBe("/community/celo");
  });

  it("appends the page param for deeper pages", () => {
    expect(buildCommunityProjectsPageHref("/community/celo/projects", 2)).toBe(
      "/community/celo/projects?page=2"
    );
  });

  it("preserves an existing query string on the base path", () => {
    expect(buildCommunityProjectsPageHref("/community/celo?programId=abc", 3)).toBe(
      "/community/celo?programId=abc&page=3"
    );
  });
});
