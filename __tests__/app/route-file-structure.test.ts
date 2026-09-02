import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural ratchet for the App Router "route trio" rule.
 *
 * Every `app/**�/page.tsx` directory must also contain `error.tsx`, and
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
 *
 * ## What makes a route dynamic (this file's premise, restated)
 *
 * This ratchet used to rest on a premise that is no longer true: that every
 * route rendered dynamically as a side effect of the root layout awaiting
 * `headers()` to resolve the whitelabel host. That read is gone.
 * `utilities/whitelabel-server.ts` resolves the tenant from the `[tenant]`
 * root param instead, which is URL-derived and costs no dynamic render.
 *
 * Routes are still dynamic, but for a different and deliberately temporary
 * reason: `app/t/[tenant]/layout.tsx` exports `dynamic = "force-dynamic"`,
 * held in place so that removing the host read did not silently start
 * prerendering several hundred pages. That one line is what the Instant
 * Navigations phases delete, one segment at a time.
 *
 * So the hazard below is unchanged today, but its cause is now scheduled for
 * deletion - and when it goes, a crawlable route that is not explicitly
 * cacheable does not become safe, it becomes *streamed*, which is the same
 * hidden-chunk failure arriving by another road.
 *
 * ## The invariant: crawlable means Cache-class, never Stream
 *
 * A route in SITEMAP_NO_LOADING carries two obligations:
 *
 *   1. No `loading.tsx` anywhere on its segment chain. TESTED below.
 *   2. Nothing on its page/layout chain may reach a module that reads URL
 *      state (`useSearchParams()`, `usePathname()`) without a Suspense
 *      boundary between the crawlable content and that read. An unguarded URL
 *      read is what stops a segment being prerendered, and a crawlable route
 *      that cannot prerender streams its content as a hidden chunk.
 *      DOCUMENTED ONLY - deliberately not tested; see below.
 *
 * ### Why obligation 2 is documentation and not a test
 *
 * It was measured before it was rejected. A check that walks each crawlable
 * route's page/layout chain and flags an import of any module calling those
 * hooks flags 53 of the 53 crawlable routes today - and so does a transitive
 * walk. Nearly all of them for one reason: the root layout renders
 * `components/DeferredLayoutComponents.tsx`, which calls `usePathname()` and
 * whose every heavy child is a `dynamic(..., { ssr: false })` import, i.e.
 * exactly the shape the rule is meant to allow. Whether a boundary sits
 * between the crawlable content and the read is a question about JSX
 * structure, not about imports, and no import-graph check can answer it. A
 * ratchet that fires on 100% of its subjects on day one is an allowlist
 * factory, not a gate.
 *
 * What does enforce obligation 2 is the no-JS crawl -
 * `node scripts/crawl-sitemap.mjs --visibility-mode no-js` - which measures
 * rendered HTML instead of guessing from imports, and the route-class triage
 * that precedes any `"use cache"` work.
 *
 * ### What is tested instead: chrome group membership
 *
 * The closest enforceable proxy. Which shell a route gets is decided by which
 * route group holds it, and for a crawlable page that shell IS the internal
 * link graph it contributes to the no-JS HTML. A crawlable route moved from
 * `(chrome)` to `(bare)` silently loses the navbar and footer, and nothing
 * else in this file would notice. SITEMAP_BARE_ROUTES pins the exceptions;
 * every other crawlable route must be in `(chrome)`.
 */

// The route tree lives under the `[tenant]` root param, an internal prefix the
// proxy writes on every page request (browser URLs are unchanged). Route paths
// below are therefore relative to the ROOT LAYOUT directory, not to `app/`,
// which keeps every entry in the sets below reading as the public URL it maps
// to. `ROUTES_ROOT` is also the correct ceiling for the DEV-612 chain walk: a
// `loading.tsx` at the root-layout level would wrap every route.
const ROUTES_ROOT = path.join(process.cwd(), "app", "t", "[tenant]");

// Whether a route gets the app navbar and footer is answered by which of these
// two groups it sits in, not by a `usePathname()` test in a client component.
// Route groups are invisible in URLs, so the sets below stay keyed on the
// public path and a route moving between groups changes nothing here.
const CHROME_GROUPS = ["(chrome)", "(bare)"] as const;

// Sitemap-crawlable routes where loading.tsx is FORBIDDEN along the whole
// segment chain (DEV-612). Any loading.tsx above a page puts the page segment
// behind a Suspense boundary; while the route renders dynamically — which it
// still does today, see "What makes a route dynamic" above — Next then
// streams the page HTML as a hidden late chunk (`<div hidden id="S:n">`) with
// the loading fallback as the visible document. A reader that does not execute
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

// The crawlable routes that legitimately live in `(bare)`: the find-funders
// section brings its own navbar and footer, which is why it sits outside
// `(chrome)`. Every OTHER route in SITEMAP_NO_LOADING must be in `(chrome)`.
// Listing only the exceptions keeps this to one short list instead of a second
// copy of all 53 routes, and it still fails in both directions — a route that
// leaves `(chrome)` fails here, and an entry whose route stops being crawlable
// fails as stale.
const SITEMAP_BARE_ROUTES: ReadonlySet<string> = new Set([
  "nonprofits/find-funders",
  "nonprofits/find-funders/connect",
  "nonprofits/find-funders/connect/chatgpt",
  "nonprofits/find-funders/connect/claude",
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

/**
 * Every directory holding a page.tsx, keyed by its path relative to the group
 * it lives in — i.e. the public route, with the `(chrome)`/`(bare)` segment
 * dropped.
 */
function collectPageDirs(): string[] {
  const dirs: string[] = [];
  for (const group of CHROME_GROUPS) {
    const groupRoot = path.join(ROUTES_ROOT, group);
    if (!fs.existsSync(groupRoot)) continue;
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name === "page.tsx") {
          dirs.push(path.relative(groupRoot, dir).split(path.sep).join("/"));
        }
      }
    };
    walk(groupRoot);
  }
  return dirs.sort();
}

const pageDirs = collectPageDirs();

/** The group directory holding a route key, or null if no group does. */
function groupRootFor(routeDir: string): string | null {
  for (const group of CHROME_GROUPS) {
    if (fs.existsSync(path.join(ROUTES_ROOT, group, routeDir))) {
      return path.join(ROUTES_ROOT, group);
    }
  }
  return null;
}

/** The on-disk directory backing a route key, whichever group holds it. */
function routeDirOnDisk(routeDir: string): string | null {
  const groupRoot = groupRootFor(routeDir);
  return groupRoot === null ? null : path.join(groupRoot, routeDir);
}

function hasSibling(routeDir: string, file: "loading.tsx" | "error.tsx"): boolean {
  const dir = routeDirOnDisk(routeDir);
  return dir !== null && fs.existsSync(path.join(dir, file));
}

/**
 * Page routes that escaped the two chrome groups, app-relative — both those
 * outside the root-layout directory entirely and those inside it but in
 * neither group. The second case is the one this file would otherwise go
 * blind to: `collectPageDirs` only walks the groups.
 */
function collectPageDirsOutsideRoutesRoot(): string[] {
  const appDir = path.join(process.cwd(), "app");
  const groupRoots = CHROME_GROUPS.map((group) => path.join(ROUTES_ROOT, group));
  const dirs: string[] = [];
  const walk = (dir: string) => {
    if (groupRoots.includes(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === "page.tsx") {
        dirs.push(path.relative(appDir, dir).split(path.sep).join("/"));
      }
    }
  };
  walk(appDir);
  return dirs.sort();
}

describe("App Router route-file structure ratchet", () => {
  it("discovers page.tsx routes under the root layout", () => {
    // Sanity check: if this is empty the walk is broken and the ratchet is a no-op.
    expect(pageDirs.length).toBeGreaterThan(0);
  });

  it("has no page route outside the (chrome) and (bare) groups", () => {
    // A page.tsx outside `app/t/[tenant]/` has no root layout and no tenant, so
    // it would render without the app shell — and, being reachable at its own
    // public URL, duplicate indexable content. Route handlers and metadata
    // routes (api, sitemaps, .well-known, robots, openapi.json) stay outside on
    // purpose: root params are not available to them and they need no chrome.
    //
    // Inside the root layout, every page belongs to exactly one chrome group:
    // `(chrome)` gets the app navbar and footer, `(bare)` is for the sections
    // that bring their own. A page in neither would render with no chrome at
    // all, and `collectPageDirs` above would not see it.
    expect(collectPageDirsOutsideRoutesRoot()).toEqual([]);
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
      const routeDir = routeDirOnDisk(dir);
      if (routeDir === null || !fs.existsSync(path.join(routeDir, "page.tsx"))) {
        violations.push(`${dir || "(root)"}: page.tsx missing — update SITEMAP_NO_LOADING`);
        continue;
      }
      // Walk from the page directory up to the root layout, through the group
      // the route lives in: a loading.tsx at ANY level wraps this page in a
      // Suspense boundary and hides its HTML from no-JS readers, so the whole
      // chain must be clean. The group directory and the root-layout directory
      // are both on that chain — a loading.tsx in either would wrap every route
      // under it.
      const groupRoot = groupRootFor(dir) as string;
      const segments = dir === "" ? [] : dir.split("/");
      const chain = [ROUTES_ROOT, groupRoot];
      for (let depth = 1; depth <= segments.length; depth += 1) {
        chain.push(path.join(groupRoot, ...segments.slice(0, depth)));
      }
      for (const ancestor of chain) {
        if (fs.existsSync(path.join(ancestor, "loading.tsx"))) {
          const rel = path.relative(process.cwd(), ancestor).split(path.sep).join("/");
          violations.push(
            `${dir || "(root)"}: loading.tsx at ${rel}/loading.tsx hides this sitemap route's HTML from no-JS readers — remove it (DEV-612)`
          );
        }
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("every sitemap-crawlable route sits in the chrome group it is pinned to", () => {
    const violations: string[] = [];
    for (const dir of SITEMAP_NO_LOADING) {
      const expected = SITEMAP_BARE_ROUTES.has(dir) ? "(bare)" : "(chrome)";
      const groupRoot = groupRootFor(dir);
      const actual = groupRoot === null ? "no group" : path.basename(groupRoot);
      if (actual !== expected) {
        violations.push(
          `${dir || "(root)"}: expected ${expected}, found ${actual} — a crawlable route changing group changes whether the navbar and footer render, and that chrome is the page's whole internal link graph without JavaScript. If the move is intended, update SITEMAP_BARE_ROUTES and re-run the no-JS crawl.`
        );
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("has no stale SITEMAP_BARE_ROUTES entries", () => {
    const stale = [...SITEMAP_BARE_ROUTES].filter((dir) => !SITEMAP_NO_LOADING.has(dir));
    expect(
      stale,
      `These SITEMAP_BARE_ROUTES entries are no longer crawlable routes. Delete them from SITEMAP_BARE_ROUTES:\n${stale.join("\n")}`
    ).toEqual([]);
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
