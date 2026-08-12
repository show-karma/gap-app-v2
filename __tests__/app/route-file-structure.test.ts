import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural ratchet for the App Router "route trio" rule.
 *
 * Every `app/**​/page.tsx` directory must also contain `error.tsx`, and
 * non-crawlable routes must also contain `loading.tsx` so each route renders
 * loading, empty, AND error states locally (CLAUDE.md route-trio rule).
 *
 * Three sets below shape the loading.tsx rule:
 *   - SITEMAP_NO_LOADING: sitemap-crawlable routes where loading.tsx is
 *     FORBIDDEN along the whole segment chain (DEV-612) — a loading boundary
 *     hides the page HTML from no-JS readers.
 *   - LOADING_LEGACY_ALLOWLIST / ERROR_LEGACY_ALLOWLIST: frozen legacy
 *     offenders that predate this test.
 * The test fails in BOTH directions:
 *   1. A NEW route missing loading/error fails immediately — the rule finally
 *      blocks merges instead of being a non-blocking bot comment.
 *   2. An allowlist entry whose route has been fixed or deleted fails as
 *      "stale" — so the debt can only ever shrink.
 *
 * To clear an entry: add the missing file, then remove the directory from the
 * matching allowlist. Never add new entries — fix the route instead.
 */

const APP_DIR = path.join(process.cwd(), "app");

// Sitemap-crawlable routes where loading.tsx is FORBIDDEN along the whole
// segment chain (DEV-612). Any loading.tsx above a page puts the page segment
// behind a Suspense boundary; because every route renders dynamically (the
// root layout awaits headers() for whitelabel detection), Next then streams
// the page HTML as a hidden late chunk (`<div hidden id="S:n">`) with the
// loading fallback as the visible document. A reader that does not execute
// JavaScript (most AI crawlers/fetchers) sees only the fallback. These routes
// are submitted in the sitemap, so their content must be in the initially
// visible HTML: no loading.tsx in their directory OR any ancestor directory.
// Client-side navigations to them stay on the current page until the server
// responds instead of showing an instant skeleton — an accepted trade for
// crawler-readable content. Verified empirically: see
// `node scripts/crawl-sitemap.mjs --visibility-mode no-js` and the DEV-612 PR.
//
// /nonprofit-research is sitemap-listed but deliberately absent here: it is an
// auth-gated advisor workspace with a documented crawl known-issue (E4,
// PR #1984) and keeps its loading boundary.
const SITEMAP_NO_LOADING: ReadonlySet<string> = new Set([
  "",
  "about",
  "blog",
  "blog/[slug]",
  "communities",
  "community/[communityId]/(whitelabel)/programs/[programId]",
  "community/[communityId]/(with-header)",
  "community/[communityId]/(with-header)/funding-opportunities",
  "contact",
  "create-project-profile",
  "donor-advisors",
  "for-agents",
  "foundations",
  "funders",
  "funding-map",
  "knowledge",
  "knowledge/ai-grant-evaluation",
  "knowledge/dao-grant-milestones",
  "knowledge/funding-distribution-mechanisms",
  "knowledge/grant-accountability",
  "knowledge/grant-document-signing",
  "knowledge/grant-fund-disbursement",
  "knowledge/grant-kyc",
  "knowledge/grant-lifecycle",
  "knowledge/how-funders-use-project-profiles",
  "knowledge/impact-measurement",
  "knowledge/impact-verification",
  "knowledge/manual-vs-platform-grant-tracking",
  "knowledge/milestones-vs-impact",
  "knowledge/nonprofit-due-diligence",
  "knowledge/onchain-project-profiles",
  "knowledge/onchain-reputation",
  "knowledge/project-profiles",
  "knowledge/project-profiles-as-resumes",
  "knowledge/project-profiles-software-vs-nonsoftware",
  "knowledge/project-registry",
  "knowledge/project-reputation",
  "knowledge/project-updates-and-reputation",
  "knowledge/reputation-compounding",
  "knowledge/whitelabel-funding-platforms",
  "knowledge/why-grant-programs-fail",
  "knowledge/why-grantees-need-project-profiles",
  "mcp/connect",
  "nonprofits",
  "nonprofits/find-funders",
  "nonprofits/find-funders/connect",
  "nonprofits/find-funders/connect/chatgpt",
  "nonprofits/find-funders/connect/claude",
  "privacy-policy",
  "project/[projectId]/(profile)",
  "projects",
  "seeds",
  "terms-and-conditions",
]);

// Routes known to be missing loading.tsx at the time this ratchet was added.
const LOADING_LEGACY_ALLOWLIST: ReadonlySet<string> = new Set([
  "admin/communities",
  "admin/communities/stats",
  "admin/faucet",
  "admin/projects",
  "admin/sumup",
  "community/[communityId]/(whitelabel)/applications/[applicationId]/success",
  "community/[communityId]/(whitelabel)/programs",
  "community/[communityId]/(with-header)/browse-applications/[referenceNumber]",
]);

// Routes known to be missing error.tsx at the time this ratchet was added.
const ERROR_LEGACY_ALLOWLIST: ReadonlySet<string> = new Set([
  "admin",
  "admin/communities",
  "admin/communities/stats",
  "admin/faucet",
  "admin/projects",
  "admin/sumup",
  "communities",
  "community/[communityId]/(whitelabel)/applications/[applicationId]/success",
  "community/[communityId]/(whitelabel)/programs",
  "community/[communityId]/(whitelabel)/programs/[programId]/apply",
  "community/[communityId]/(with-header)",
  "community/[communityId]/(with-header)/browse-applications/[referenceNumber]",
  "community/[communityId]/(with-header)/impact",
  "community/[communityId]/(with-header)/impact/project-discovery",
  "community/[communityId]/(with-header)/projects",
  "community/[communityId]/admin/kyc-settings",
  "community/[communityId]/donate",
  "community/[communityId]/manage/edit-categories",
  "community/[communityId]/manage/edit-projects",
  "community/[communityId]/manage/funding-platform",
  "community/[communityId]/manage/funding-platform/[programId]",
  "community/[communityId]/manage/funding-platform/[programId]/milestones/[projectId]",
  "community/[communityId]/manage/funding-platform/[programId]/question-builder",
  "community/[communityId]/manage/funding-platform/[programId]/setup",
  "community/[communityId]/manage/impact",
  "community/[communityId]/manage/kyc-settings",
  "community/[communityId]/manage/manage-indicators",
  "community/[communityId]/manage/payouts",
  "community/[communityId]/manage/program-scores",
  "community/[communityId]/manage/tracks",
  "create-project-profile",
  "funders",
  "funding-map/add-program",
  "funding-map/manage-programs",
  "knowledge",
  "knowledge/ai-grant-evaluation",
  "knowledge/dao-grant-milestones",
  "knowledge/funding-distribution-mechanisms",
  "knowledge/grant-accountability",
  "knowledge/grant-document-signing",
  "knowledge/grant-fund-disbursement",
  "knowledge/grant-kyc",
  "knowledge/grant-lifecycle",
  "knowledge/how-funders-use-project-profiles",
  "knowledge/impact-measurement",
  "knowledge/impact-verification",
  "knowledge/manual-vs-platform-grant-tracking",
  "knowledge/milestones-vs-impact",
  "knowledge/onchain-project-profiles",
  "knowledge/onchain-reputation",
  "knowledge/project-profiles",
  "knowledge/project-profiles-as-resumes",
  "knowledge/project-profiles-software-vs-nonsoftware",
  "knowledge/project-registry",
  "knowledge/project-reputation",
  "knowledge/project-updates-and-reputation",
  "knowledge/reputation-compounding",
  "knowledge/whitelabel-funding-platforms",
  "knowledge/why-grant-programs-fail",
  "knowledge/why-grantees-need-project-profiles",
  "my-projects",
  "old-home",
  "privacy-policy",
  "project/[projectId]/(profile)",
  "project/[projectId]/(profile)/contact-info",
  "project/[projectId]/(profile)/funding",
  "project/[projectId]/(profile)/funding/new",
  "project/[projectId]/(profile)/impact",
  "project/[projectId]/(profile)/team",
  "project/[projectId]/updates",
  "seeds",
  "seeds/fund",
  "stats",
  "super-admin",
  "terms-and-conditions",
]);

/** All directories under app/ that contain a page.tsx, keyed by app-relative POSIX path. */
function collectPageDirs(): string[] {
  const dirs: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === "page.tsx") {
        dirs.push(path.relative(APP_DIR, dir).split(path.sep).join("/"));
      }
    }
  };
  walk(APP_DIR);
  return dirs.sort();
}

const pageDirs = collectPageDirs();

function hasSibling(routeDir: string, file: "loading.tsx" | "error.tsx"): boolean {
  return fs.existsSync(path.join(APP_DIR, routeDir, file));
}

describe("App Router route-file structure ratchet", () => {
  it("discovers page.tsx routes under app/", () => {
    // Sanity check: if this is empty the walk is broken and the ratchet is a no-op.
    expect(pageDirs.length).toBeGreaterThan(0);
  });

  it("every route has loading.tsx (except frozen legacy offenders and crawlable routes)", () => {
    const newViolations = pageDirs.filter(
      (dir) =>
        !hasSibling(dir, "loading.tsx") &&
        !LOADING_LEGACY_ALLOWLIST.has(dir) &&
        !SITEMAP_NO_LOADING.has(dir)
    );
    expect(
      newViolations,
      `These routes are missing loading.tsx. Add it (mirror a sibling loading.tsx) — do NOT add to the allowlist. If the route is sitemap-crawlable, add it to SITEMAP_NO_LOADING instead and do NOT add loading.tsx (DEV-612):\n${newViolations.join("\n")}`
    ).toEqual([]);
  });

  it("sitemap-crawlable routes have NO loading.tsx anywhere on their segment chain (DEV-612)", () => {
    const violations: string[] = [];
    for (const dir of SITEMAP_NO_LOADING) {
      if (!fs.existsSync(path.join(APP_DIR, dir, "page.tsx"))) {
        violations.push(`${dir || "(root)"}: page.tsx missing — update SITEMAP_NO_LOADING`);
        continue;
      }
      // Walk from the page directory up to app/: a loading.tsx at ANY level
      // wraps this page in a Suspense boundary and hides its HTML from no-JS
      // readers, so the whole chain must be clean.
      const segments = dir === "" ? [] : dir.split("/");
      for (let depth = segments.length; depth >= 0; depth -= 1) {
        const ancestor = segments.slice(0, depth).join("/");
        if (fs.existsSync(path.join(APP_DIR, ancestor, "loading.tsx"))) {
          violations.push(
            `${dir || "(root)"}: loading.tsx at app/${ancestor ? `${ancestor}/` : ""}loading.tsx hides this sitemap route's HTML from no-JS readers — remove it (DEV-612)`
          );
        }
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("has no overlap between SITEMAP_NO_LOADING and the legacy allowlist", () => {
    const overlap = [...SITEMAP_NO_LOADING].filter((dir) => LOADING_LEGACY_ALLOWLIST.has(dir));
    expect(overlap).toEqual([]);
  });

  it("every route has error.tsx (except frozen legacy offenders)", () => {
    const newViolations = pageDirs.filter(
      (dir) => !hasSibling(dir, "error.tsx") && !ERROR_LEGACY_ALLOWLIST.has(dir)
    );
    expect(
      newViolations,
      `These routes are missing error.tsx. Add a thin RouteErrorFallback wrapper — do NOT add to the allowlist:\n${newViolations.join("\n")}`
    ).toEqual([]);
  });

  it("has no stale loading.tsx allowlist entries", () => {
    const pageDirSet = new Set(pageDirs);
    const stale = [...LOADING_LEGACY_ALLOWLIST].filter(
      (dir) => !pageDirSet.has(dir) || hasSibling(dir, "loading.tsx")
    );
    expect(
      stale,
      `These loading.tsx allowlist entries are stale (route fixed or removed). Delete them from LOADING_LEGACY_ALLOWLIST:\n${stale.join("\n")}`
    ).toEqual([]);
  });

  it("has no stale error.tsx allowlist entries", () => {
    const pageDirSet = new Set(pageDirs);
    const stale = [...ERROR_LEGACY_ALLOWLIST].filter(
      (dir) => !pageDirSet.has(dir) || hasSibling(dir, "error.tsx")
    );
    expect(
      stale,
      `These error.tsx allowlist entries are stale (route fixed or removed). Delete them from ERROR_LEGACY_ALLOWLIST:\n${stale.join("\n")}`
    ).toEqual([]);
  });
});
