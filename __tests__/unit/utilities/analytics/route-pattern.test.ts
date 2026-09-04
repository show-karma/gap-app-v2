/**
 * @file Tests for the page-view route redaction (utilities/analytics/route-pattern.ts).
 *
 * Two properties, pulling against each other. No concrete identifier — project
 * uid, wallet address, share token — may survive into an analytics property;
 * and no real route word may be redacted away, or the report loses the ability
 * to tell screens apart. The completeness test at the bottom is the one that
 * keeps the first property true as `app/` grows.
 */

import { readdirSync } from "node:fs";
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
      [
        "/community/gitcoin/applications/APP-1/edit",
        "/community/:communityId/applications/:applicationId/edit",
      ],
      [
        "/project/my-slug/funding/0xabc123/milestones-and-updates",
        "/project/:projectId/funding/:grantUid/milestones-and-updates",
      ],
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
      // A base64url token need not contain a digit. Counting character classes
      // rather than requiring "letters AND digits" is what catches these.
      ["a mixed-case token with no digit", "AbCdEfGhIjKlMnOpQrStUvWx"],
      ["a lowercase token with an underscore", "abcdefghijklmnopqrstuvwxyz_"],
      ["a lowercase token with a digit", "abcdefghijklmnopqrst9"],
      ["an all-caps token with a hyphen", "ABCDEFGHIJKLMNOPQRST-U"],
      ["a symbol-mixed token", "aB3-dEfGhIjKlMnOpQrS_tUv"],
    ])("redacts %s", (_label, segment) => {
      expect(toRoutePattern(`/unmapped/${segment}`)).toBe("/unmapped/:id");
    });

    it.each([
      // 21 characters, and a real route word — length alone must not condemn it,
      // and neither must the hyphen it draws a second character class from.
      ["funding-opportunities"],
      ["ai-funding-opportunities-2026"],
      ["internationaldevelopment"],
      ["browse-applications"],
      ["milestones-and-updates"],
      ["access-denied-messages"],
      ["notification-settings"],
    ])("keeps the static slug %s", (slug) => {
      expect(toRoutePattern(`/unmapped/${slug}`)).toBe(`/unmapped/${slug}`);
    });

    it("never redacts a segment a template already claimed", () => {
      // The heuristic only runs past the end of every template, so a real route
      // word inside a known family is safe however it is spelled.
      expect(toRoutePattern("/community/gitcoin/manage/access-denied-messages")).toBe(
        "/community/:communityId/manage/access-denied-messages"
      );
    });

    it("never leaves a raw 0x address anywhere in the result", () => {
      const pattern = toRoutePattern(
        "/unmapped/0x1234567890abcdef1234567890abcdef12345678/team/0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
      );
      expect(pattern).not.toMatch(/0x[0-9a-fA-F]{40}/);
    });
  });
});

// A tenant that renames a section renames its URL, and usePathname reports the
// URL the visitor sees. Left alone, one product screen would report under two
// names split by tenant vocabulary, and every saved report on the old one would
// quietly lose that tenant on deploy day.
describe("whitelabel aliases, which name one screen twice", () => {
  it("reports the alias as the route that serves it", () => {
    expect(toRoutePattern("/browse-projects")).toBe("/browse-applications");
  });

  it("reports its sub-paths the same way", () => {
    expect(toRoutePattern("/browse-projects/APP-1AB2CD3E-XY45")).toBe(
      "/browse-applications/APP-1AB2CD3E-XY45"
    );
  });

  it("keeps the trailing-slash form of the served route", () => {
    expect(toRoutePattern("/browse-projects/")).toBe("/browse-applications");
  });

  it("groups the alias with the page it is an alias of", () => {
    expect(toPageGroup("/browse-projects")).toBe("browse-applications");
    expect(toPageGroup("/browse-projects")).toBe(toPageGroup("/browse-applications"));
  });

  it("leaves a path that merely starts the same alone", () => {
    expect(toRoutePattern("/browse-projects-archive")).toBe("/browse-projects-archive");
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
 * The guard that keeps the table honest.
 *
 * It walks `app/` from the ROOT — not from inside each top-level directory —
 * so a future `app/[slug]/page.tsx` is caught, and it collects every FULL page
 * route that contains a dynamic segment anywhere in it, not just the prefix
 * where that segment first appears. A route added to `app/` without a template
 * here fails this test, rather than shipping and quietly putting whatever that
 * segment holds — an id, a token — into Mixpanel.
 */
describe("template coverage of app/", () => {
  const APP_DIR = join(process.cwd(), "app");

  /**
   * `app/api` is excluded: those are fetch endpoints, never navigated to, so
   * they never produce a page view. Everything else under `app/` can.
   */
  const EXCLUDED_TOP_LEVEL = new Set(["api"]);

  /** Route groups `(name)`, parallel `@slot` and private `_dir` are not in the URL. */
  const isUrlSegment = (segment: string): boolean =>
    !segment.startsWith("(") && !segment.startsWith("@") && !segment.startsWith("_");

  const isPageFile = (name: string): boolean => /^page\.(?:t|j)sx?$/.test(name);

  /**
   * Every URL a `page` file answers, as its `app/`-relative route. A directory
   * is a route only when it holds a page — an intermediate directory that only
   * holds a `layout` is not a screen.
   */
  const collectPageRoutes = (dir: string, urlSegments: string[]): string[] => {
    const entries = readdirSync(dir, { withFileTypes: true });
    const routes: string[] = [];

    if (entries.some((entry) => entry.isFile() && isPageFile(entry.name))) {
      routes.push(`/${urlSegments.join("/")}`);
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (urlSegments.length === 0 && EXCLUDED_TOP_LEVEL.has(entry.name)) continue;
      routes.push(
        ...collectPageRoutes(
          join(dir, entry.name),
          isUrlSegment(entry.name) ? [...urlSegments, entry.name] : urlSegments
        )
      );
    }

    return routes;
  };

  /** `[communityId]` -> `:communityId`; `[...path]` and `[[...tool]]` -> `:path*`. */
  const toExpectedTemplate = (route: string): string =>
    route
      .split("/")
      .map((segment) => {
        const catchAll = /^\[{1,2}\.{3}(.+?)\]{1,2}$/.exec(segment);
        if (catchAll) return `:${catchAll[1]}*`;
        const dynamic = /^\[(.+?)\]$/.exec(segment);
        return dynamic ? `:${dynamic[1]}` : segment;
      })
      .join("/");

  /** A value the shape heuristic would NEVER redact, so only a template can. */
  const SAFE_SAMPLE = "sample";

  const pageRoutes = collectPageRoutes(APP_DIR, []).map((route) => route.split(sep).join("/"));
  const dynamicRoutes = pageRoutes.filter((route) => route.includes("["));
  const staticRoutes = pageRoutes.filter((route) => !route.includes("["));

  it("found the dynamic routes to check", () => {
    // A traversal bug that silently found nothing would make every assertion
    // below vacuous.
    expect(dynamicRoutes.length).toBeGreaterThan(50);
  });

  it("walks from the app root, so a top-level dynamic route is reachable", () => {
    // Not an assertion about today's tree — about the traversal. Starting one
    // level in (per top-level directory) would skip `app/[slug]/page.tsx`
    // entirely, which is the shape most likely to be added and least likely to
    // be noticed.
    expect(collectPageRoutes(APP_DIR, []).every((route) => route.startsWith("/"))).toBe(true);
    expect(pageRoutes).toContain("/project/[projectId]/updates");
    expect(pageRoutes).toContain("/community/[communityId]/applications/[applicationId]/edit");
  });

  it.each(dynamicRoutes.map((route) => [route]))("has a template for %s", (route) => {
    const expected = toExpectedTemplate(route);
    expect(ROUTE_TEMPLATES).toContain(expected);

    // And it actually matches: a template in the list that the trie cannot
    // reach (shadowed by a sibling, say) would still leak.
    const concrete = route
      .split("/")
      .map((segment) => (segment.startsWith("[") ? SAFE_SAMPLE : segment))
      .join("/");
    expect(toRoutePattern(concrete)).toBe(expected);
  });

  it.each(staticRoutes.map((route) => [route]))(
    "reports the static route %s as itself",
    (route) => {
      // A static screen that shares a position with a dynamic sibling —
      // `/project/[projectId]/funding/new` next to `[grantUid]` — is reported as
      // that sibling unless it is templated too, merging two different screens.
      expect(toRoutePattern(route)).toBe(route);
    }
  );

  it("lists no template for a route that no longer exists", () => {
    const expectedTemplates = new Set(dynamicRoutes.map(toExpectedTemplate));
    const staticTemplates = new Set(staticRoutes);

    for (const template of ROUTE_TEMPLATES) {
      expect(expectedTemplates.has(template) || staticTemplates.has(template)).toBe(true);
    }
  });
});
