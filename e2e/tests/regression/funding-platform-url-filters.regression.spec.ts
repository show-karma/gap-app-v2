import type { Page } from "@playwright/test";
import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

/**
 * Regression coverage for PR #1620 / issue #1547 — "URL is the single source of
 * truth for funding-platform filters".
 *
 * The bug: the programs list and browse-applications view mirrored their
 * search/status filter state into the URL via a router.push/replace inside a
 * useEffect. That self-navigation (a) raced and cancelled Applications <Link>
 * clicks (the click looked like a no-op) and (b) pushed a history entry per
 * keystroke (Back stepped through stale filter states instead of leaving).
 *
 * The fix moves filter state to nuqs useQueryState (history.replaceState, no
 * App Router navigation). These tests drive the real browser to assert the
 * URL-as-source-of-truth behaviour and, crucially, the original failure modes —
 * not just the happy path.
 */

const COMMUNITY = "optimism";
const PROGRAM_ID = "program-url-001";
const FUNDING_BASE = `/community/${COMMUNITY}/manage/funding-platform`;
const BROWSE_BASE = `/community/${COMMUNITY}/browse-applications`;

// Next.js dev compiles each route on first hit, which can exceed the default
// 5s expect timeout. Wait generously for the first content element, then run
// the (fast) assertions.
const COMPILE_TIMEOUT = 60_000;

const PROGRAM = {
  programId: PROGRAM_ID,
  chainID: 10,
  name: "URL Filter Test Program",
  metadata: { title: "URL Filter Test Program", description: "Program for URL filter tests" },
  applicationConfig: {
    isEnabled: true,
    formSchema: { fields: [], settings: { privateApplications: false } },
  },
  metrics: {
    totalApplications: 4,
    approvedApplications: 1,
    rejectedApplications: 1,
    pendingApplications: 2,
    revisionRequestedApplications: 0,
    underReviewApplications: 0,
  },
};

function programMocks() {
  return {
    // Both the programs list (BY_COMMUNITY) and browse-applications
    // (BY_COMMUNITY_ACTIVE) hit this path with different query strings.
    "**/v2/funding-program-configs/community/optimism**": mockJson([PROGRAM]),
    "**/v2/funding-program-configs/program-url-001": mockJson(PROGRAM),
    "**/v2/funding-applications/program/program-url-001**": mockJson({
      applications: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 1 },
    }),
    "**/v2/user/communities/admin**": mockJson([
      { uid: "community-uid-optimism", slug: "optimism" },
    ]),
  };
}

/** Read a query-string param from the live browser URL. */
function param(page: Page, key: string): string | null {
  return new URL(page.url()).searchParams.get(key);
}

const fundingSearch = (page: Page) =>
  page.getByPlaceholder("Search programs by name or description...");
const browseSearch = (page: Page) => page.getByPlaceholder("Search project or reference…");

test.describe.configure({ timeout: 90_000 });

test.describe("Regression #1547 — funding-platform URL filters", () => {
  // ---- Programs list page (the page that holds the Applications links) ----

  test("T-URL-01: deep link pre-applies combined search + status filters", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    const jsErrors = collectJsErrors(page);
    await withApiMocks(programMocks());
    await loginAs("communityAdmin", { communityId: COMMUNITY });

    await page.goto(`${FUNDING_BASE}?search=Filter&status=enabled`, GOTO_OPTIONS);
    await waitForPageReady(page);

    const search = fundingSearch(page);
    await search.waitFor({ state: "visible", timeout: COMPILE_TIMEOUT });
    await expect(search).toHaveValue("Filter");
    // URL stays the source of truth and the dropdown trigger reflects the param.
    expect(param(page, "status")).toBe("enabled");
    await expect(page.getByRole("button", { name: "enabled", exact: true }).first()).toBeVisible();

    assertNoJsErrors(jsErrors);
  });

  test("T-URL-02: typing search updates the URL without polluting history", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    await withApiMocks(programMocks());
    await loginAs("communityAdmin", { communityId: COMMUNITY });

    await page.goto(FUNDING_BASE, GOTO_OPTIONS);
    await waitForPageReady(page);

    const search = fundingSearch(page);
    await search.waitFor({ state: "visible", timeout: COMPILE_TIMEOUT });

    const historyBefore = await page.evaluate(() => window.history.length);

    await search.fill("alpha");
    // nuqs throttles the URL write — poll until it lands.
    await expect.poll(() => param(page, "search")).toBe("alpha");

    await search.fill("alpha beta");
    await expect.poll(() => param(page, "search")).toBe("alpha beta");

    const historyAfter = await page.evaluate(() => window.history.length);
    // replaceState (not pushState) ⇒ no new history entries per keystroke.
    expect(historyAfter).toBe(historyBefore);
  });

  test("T-URL-03: Applications link navigates even right after a filter change (the bug)", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    await withApiMocks(programMocks());
    await loginAs("communityAdmin", { communityId: COMMUNITY });

    await page.goto(FUNDING_BASE, GOTO_OPTIONS);
    await waitForPageReady(page);

    // Target the program card's Applications link by href (unambiguous — the
    // manage sidebar also has an "Applications" link).
    const appsLink = page.locator(`a[href$="/${PROGRAM_ID}/applications"]`).first();
    await appsLink.waitFor({ state: "visible", timeout: COMPILE_TIMEOUT });

    // Reproduce the original race: mutate the filter (previously dispatched a
    // self-navigation) and immediately click the Applications link. Use a term
    // that still matches the program so the card — and its link — stay mounted.
    // With the fix there is no navigation to cancel, so the click must land.
    await fundingSearch(page).fill("URL");
    await expect(appsLink).toBeVisible();
    await appsLink.click();

    await page.waitForURL(/\/funding-platform\/program-url-001\/applications/, {
      timeout: COMPILE_TIMEOUT,
    });
    expect(page.url()).toContain(`/${PROGRAM_ID}/applications`);
  });

  test("T-URL-04: invalid status param falls back to 'all' without crashing", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    const jsErrors = collectJsErrors(page);
    await withApiMocks(programMocks());
    await loginAs("communityAdmin", { communityId: COMMUNITY });

    await page.goto(`${FUNDING_BASE}?status=not-a-real-status`, GOTO_OPTIONS);
    await waitForPageReady(page);

    await fundingSearch(page).waitFor({ state: "visible", timeout: COMPILE_TIMEOUT });
    // Garbage status is ignored ⇒ dropdown shows the default and the program
    // card still renders (the bad value did not filter everything out).
    await expect(page.getByText("All Programs", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("URL Filter Test Program").first()).toBeVisible();

    assertNoJsErrors(jsErrors);
  });

  test("T-URL-05: selecting 'All Programs' clears the status param (clearOnDefault)", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    await withApiMocks(programMocks());
    await loginAs("communityAdmin", { communityId: COMMUNITY });

    await page.goto(`${FUNDING_BASE}?status=enabled`, GOTO_OPTIONS);
    await waitForPageReady(page);
    await fundingSearch(page).waitFor({ state: "visible", timeout: COMPILE_TIMEOUT });
    expect(param(page, "status")).toBe("enabled");

    // Open the status dropdown and pick "All Programs".
    await page.getByRole("button", { name: "enabled", exact: true }).first().click();
    await page.getByRole("menuitem").filter({ hasText: "All Programs" }).click();

    await expect.poll(() => param(page, "status")).toBeNull();
  });

  test("T-URL-06: ?create=true opens the create modal; closing strips the param", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    await withApiMocks(programMocks());
    await loginAs("communityAdmin", { communityId: COMMUNITY });

    await page.goto(`${FUNDING_BASE}?create=true`, GOTO_OPTIONS);
    await waitForPageReady(page);

    // Scope to the create-program dialog specifically (the app also mounts an
    // unrelated assistant dialog).
    const createDialog = page.getByRole("dialog").filter({ hasText: "Create New Program" });
    await expect(createDialog).toBeVisible({ timeout: COMPILE_TIMEOUT });

    await page.keyboard.press("Escape");
    await expect.poll(() => param(page, "create")).toBeNull();
  });

  // ---- Browse-applications view (the file refactored in this PR) ----

  test("T-URL-07: browse-applications deep link pre-applies programId + status + search", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    const jsErrors = collectJsErrors(page);
    await withApiMocks(programMocks());
    await loginAs("communityAdmin", { communityId: COMMUNITY });

    await page.goto(
      `${BROWSE_BASE}?programId=${PROGRAM_ID}&status=approved&search=hello`,
      GOTO_OPTIONS
    );
    await waitForPageReady(page);

    // Search input (only rendered once a program is selected) reflects the URL.
    const search = browseSearch(page);
    await search.waitFor({ state: "visible", timeout: COMPILE_TIMEOUT });
    await expect(search).toHaveValue("hello");
    // The "Approved" status pill is active.
    await expect(page.getByRole("button", { name: /approved/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    assertNoJsErrors(jsErrors);
  });

  test("T-URL-08: browse-applications clear-search button strips the search param", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    await withApiMocks(programMocks());
    await loginAs("communityAdmin", { communityId: COMMUNITY });

    await page.goto(`${BROWSE_BASE}?programId=${PROGRAM_ID}&search=hello`, GOTO_OPTIONS);
    await waitForPageReady(page);

    const search = browseSearch(page);
    await search.waitFor({ state: "visible", timeout: COMPILE_TIMEOUT });
    await expect(search).toHaveValue("hello");

    const clearButton = page.getByRole("button", { name: "Clear search" });
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    await expect.poll(() => param(page, "search")).toBeNull();
    await expect(search).toHaveValue("");
  });
});
