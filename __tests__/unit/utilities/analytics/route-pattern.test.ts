/**
 * @file Tests for the page-view route redaction (utilities/analytics/route-pattern.ts).
 * The property under test is that no concrete identifier — project uid, wallet
 * address, share token — survives into an analytics property, while the route
 * families stay distinguishable enough to group a report by.
 */

import { toCommunityId, toPageGroup, toRoutePattern } from "@/utilities/analytics/route-pattern";

describe("toRoutePattern", () => {
  it.each([
    ["/", "/"],
    ["/funding-map", "/funding-map"],
    ["/my-projects", "/my-projects"],
    ["/nonprofits", "/nonprofits"],
  ])("leaves the static route %s alone", (pathname, expected) => {
    expect(toRoutePattern(pathname)).toBe(expected);
  });

  it.each([
    ["/project/my-project-slug", "/project/:id"],
    ["/project/my-project-slug/updates", "/project/:id/updates"],
    ["/project/my-project-slug/funding/grant-slug", "/project/:id/funding/grant-slug"],
    ["/community/gitcoin/grants", "/community/:id/grants"],
    ["/communities/gitcoin", "/communities/:id"],
    ["/funders/some-funder", "/funders/:id"],
    ["/scanner/scans/abc123", "/scanner/scans/:id"],
  ])("templates the dynamic segment of %s", (pathname, expected) => {
    expect(toRoutePattern(pathname)).toBe(expected);
  });

  it("templates a share token, which is a bearer credential", () => {
    expect(toRoutePattern("/nonprofit-research/shared/s3cr3t-share-token")).toBe(
      "/nonprofit-research/shared/:id"
    );
  });

  it.each([
    ["an EVM address", "/u/0x1234567890abcdef1234567890abcdef12345678", "/u/:id"],
    [
      "an attestation uid",
      "/attestation/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "/attestation/:id",
    ],
    ["a UUID", "/reports/8f14e45f-ceea-467a-9f30-1b2c3d4e5f60", "/reports/:id"],
    ["a Mongo ObjectId", "/reports/507f1f77bcf86cd799439011", "/reports/:id"],
    ["a long opaque token", "/whatever/aVeryLongOpaqueIdentifier123", "/whatever/:id"],
  ])("redacts %s even on a route family it has not been taught", (_label, pathname, expected) => {
    expect(toRoutePattern(pathname)).toBe(expected);
  });

  it("keeps a trailing slash rather than inventing a segment", () => {
    expect(toRoutePattern("/project/my-slug/")).toBe("/project/:id/");
  });

  it("never leaves a raw 0x address anywhere in the result", () => {
    const pattern = toRoutePattern(
      "/project/0x1234567890abcdef1234567890abcdef12345678/team/0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    );
    expect(pattern).not.toMatch(/0x[0-9a-fA-F]{40}/);
  });
});

describe("toPageGroup", () => {
  it.each([
    ["/", "home"],
    ["/funding-map", "funding-map"],
    ["/project/my-slug/updates", "project"],
    ["/community/gitcoin/grants", "community"],
  ])("reduces %s to its route family", (pathname, expected) => {
    expect(toPageGroup(pathname)).toBe(expected);
  });
});

describe("toCommunityId", () => {
  it("reads the slug off a community route", () => {
    expect(toCommunityId("/community/gitcoin/grants")).toBe("gitcoin");
  });

  it("decodes an escaped slug", () => {
    expect(toCommunityId("/community/my%20community")).toBe("my community");
  });

  it.each([["/communities/gitcoin"], ["/community"], ["/project/gitcoin"], ["/"]])(
    "returns null for %s, which is not a community route",
    (pathname) => {
      expect(toCommunityId(pathname)).toBeNull();
    }
  );
});
