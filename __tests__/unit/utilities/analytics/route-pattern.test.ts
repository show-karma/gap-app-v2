/**
 * @file Tests for the page-view route redaction (utilities/analytics/route-pattern.ts).
 *
 * Two properties, pulling against each other. No concrete identifier — project
 * uid, wallet address, share token — may survive into an analytics property;
 * and no real route word may be redacted away, or the report loses the ability
 * to tell screens apart. The completeness test at the bottom is the one that
 * keeps the first property true as `app/` grows.
 */

import { readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import {
  ROUTE_TEMPLATES,
  toCommunityId,
  toPageGroup,
  toRoutePattern,
} from "@/utilities/analytics/route-pattern";

describe("toRoutePattern", () => {
  it.each([
    ["/", "/"],
    ["/funding-map", "/funding-map"],
    ["/my-projects", "/my-projects"],
    ["/nonprofits", "/nonprofits"],
    ["/nonprofits/find-funders", "/nonprofits/find-funders"],
  ])("leaves the static route %s alone", (pathname, expected) => {
    expect(toRoutePattern(pathname)).toBe(expected);
  });

  describe("templates", () => {
    it.each([
      ["/project/my-project-slug", "/project/:projectId"],
      ["/project/my-project-slug/updates", "/project/:projectId/updates"],
      ["/project/my-slug/funding/0x1234567890abcdef", "/project/:projectId/funding/:grantUid"],
      ["/community/gitcoin", "/community/:communityId"],
      ["/community/gitcoin/grants", "/community/:communityId/grants"],
      ["/community/gitcoin/programs/961", "/community/:communityId/programs/:programId"],
      [
        "/community/gitcoin/manage/funding-platform/961/applications/APP-1",
        "/community/:communityId/manage/funding-platform/:programId/applications/:applicationId",
      ],
      ["/community/gitcoin/reports/2026-08-01", "/community/:communityId/reports/:runDate"],
      [
        "/community/gitcoin/reports/2026-08-01/quarterly",
        "/community/:communityId/reports/:runDate/:configSlug",
      ],
      ["/blog/a-post-about-grants", "/blog/:slug"],
      ["/dashboard/payouts", "/dashboard/:module"],
      ["/s/abc123", "/s/:slug"],
      ["/sitemaps/projects/sitemap/3", "/sitemaps/:kind/sitemap/:chunk"],
    ])("templates %s", (pathname, expected) => {
      expect(toRoutePattern(pathname)).toBe(expected);
    });

    it("prefers a literal route over a sibling dynamic one", () => {
      // `/nonprofits/is-ai-ready/scans/[id]` and `/nonprofits/is-ai-ready/[site]`
      // collide at the third segment; the literal has to win or every scan
      // detail page reports as a site page.
      expect(toRoutePattern("/nonprofits/is-ai-ready/scans/abc123")).toBe(
        "/nonprofits/is-ai-ready/scans/:id"
      );
      expect(toRoutePattern("/nonprofits/is-ai-ready/example.org")).toBe(
        "/nonprofits/is-ai-ready/:site"
      );
    });

    it("collapses a catch-all rather than reporting each tool path", () => {
      expect(toRoutePattern("/admin/studio/structure/project")).toBe("/admin/studio/:tool*");
    });

    it("templates a share token, which is a bearer credential", () => {
      expect(toRoutePattern("/nonprofit-research/shared/s3cr3t-share-token")).toBe(
        "/nonprofit-research/shared/:token"
      );
      expect(toRoutePattern("/nonprofit-research/diligence/s3cr3t")).toBe(
        "/nonprofit-research/diligence/:token"
      );
    });

    it("keeps a trailing slash rather than inventing a segment", () => {
      expect(toRoutePattern("/project/my-slug/")).toBe("/project/:projectId/");
    });
  });

  describe("the shape heuristic, for routes no template covers yet", () => {
    it.each([
      ["an EVM address", "/unmapped/0x1234567890abcdef1234567890abcdef12345678", "/unmapped/:id"],
      [
        "an attestation uid",
        "/unmapped/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "/unmapped/:id",
      ],
      ["a UUID", "/unmapped/8f14e45f-ceea-467a-9f30-1b2c3d4e5f60", "/unmapped/:id"],
      ["a Mongo ObjectId", "/unmapped/507f1f77bcf86cd799439011", "/unmapped/:id"],
      ["a generated token", "/unmapped/aVeryLongOpaqueIdentifier123", "/unmapped/:id"],
    ])("redacts %s", (_label, pathname, expected) => {
      expect(toRoutePattern(pathname)).toBe(expected);
    });

    it.each([
      // 21 characters, and a real route word — length alone must not condemn it.
      ["funding-opportunities"],
      ["ai-funding-opportunities-2026"],
      ["internationaldevelopment"],
      ["browse-applications"],
      ["milestones-and-updates"],
    ])("keeps the static slug %s", (slug) => {
      expect(toRoutePattern(`/unmapped/${slug}`)).toBe(`/unmapped/${slug}`);
    });

    it("never leaves a raw 0x address anywhere in the result", () => {
      const pattern = toRoutePattern(
        "/unmapped/0x1234567890abcdef1234567890abcdef12345678/team/0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
      );
      expect(pattern).not.toMatch(/0x[0-9a-fA-F]{40}/);
    });
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

/**
 * The guard that keeps the table honest. A new dynamic route added to `app/`
 * without a template here fails this test, rather than shipping and quietly
 * putting whatever that segment holds — an id, a token — into Mixpanel.
 */
describe("template coverage of app/", () => {
  const APP_DIR = join(process.cwd(), "app");

  /**
   * `app/api` is excluded: those are fetch endpoints, never navigated to, so
   * they never produce a page view. Everything else under `app/` can.
   */
  const EXCLUDED_TOP_LEVEL = new Set(["api"]);

  /** Route groups `(name)` and parallel/intercepting segments are not in the URL. */
  const isUrlSegment = (segment: string): boolean =>
    !segment.startsWith("(") && !segment.startsWith("@") && !segment.startsWith("_");

  const collectDynamicRoutes = (dir: string, urlSegments: string[] = []): string[] => {
    const routes: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      const next = isUrlSegment(entry) ? [...urlSegments, entry] : urlSegments;
      if (entry.startsWith("[")) routes.push(`/${next.join("/")}`);
      routes.push(...collectDynamicRoutes(full, next));
    }
    return routes;
  };

  /** `[communityId]` -> `:communityId`; `[...path]`/`[[...tool]]` -> `:path*`. */
  const toExpectedTemplate = (route: string): string =>
    route.replace(/\[{1,2}(?:\.\.\.)?([^\]]+?)\]{1,2}/g, (_match, name: string) =>
      route.includes(`[...${name}]`) || route.includes(`[[...${name}]]`) ? `:${name}*` : `:${name}`
    );

  /** A value the shape heuristic would NEVER redact, so only a template can. */
  const SAFE_SAMPLE = "sample";

  const dynamicRoutes = readdirSync(APP_DIR)
    .filter((entry) => statSync(join(APP_DIR, entry)).isDirectory())
    .filter((entry) => !EXCLUDED_TOP_LEVEL.has(entry))
    .flatMap((entry) =>
      collectDynamicRoutes(join(APP_DIR, entry), isUrlSegment(entry) ? [entry] : [])
    );

  it("found the dynamic routes to check", () => {
    expect(dynamicRoutes.length).toBeGreaterThan(10);
  });

  it.each(dynamicRoutes.map((route) => [route.split(sep).join("/")]))(
    "has a template for %s",
    (route) => {
      const expected = toExpectedTemplate(route);
      expect(ROUTE_TEMPLATES).toContain(expected);

      // And it actually matches: a template in the list that the trie cannot
      // reach (shadowed by a sibling, say) would still leak.
      const concrete = route.replace(/\[{1,2}(?:\.\.\.)?[^\]]+?\]{1,2}/g, SAFE_SAMPLE);
      expect(toRoutePattern(concrete)).toBe(expected);
    }
  );

  it("lists no template for a route that no longer exists", () => {
    const expectedTemplates = new Set(
      dynamicRoutes.map((route) => toExpectedTemplate(route.split(sep).join("/")))
    );

    for (const template of ROUTE_TEMPLATES) {
      expect(expectedTemplates).toContain(template);
    }
  });
});
