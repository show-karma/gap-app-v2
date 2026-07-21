import { MOCK_COMMUNITIES } from "../../data/communities";
import { expect, mockJson, test } from "../../fixtures";
import { collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

/**
 * Regression coverage for PR #1625 — "stop Safe SDK leaking into public bundles".
 *
 * The public community `/updates` and `/financials` routes used to pull the Safe SDK
 * (`@safe-global/*` + ethers v6) into their vendor chunks through the deleted
 * `src/features/payout-disbursement` barrel. In a PRODUCTION build webpack could split those
 * chunks in a broken order and crash on hard navigation with a temporal-dead-zone error:
 *
 *   "Class extends value undefined is not a constructor or null"
 *
 * surfaced to the user as the Next.js client error boundary ("Application error: a client-side
 * exception has occurred"). The crash only reproduces in a production build (`pnpm build` +
 * `pnpm start`) — a dev server hides it — so these tests are written to run against the
 * production server the CI smoke job already boots. `collectJsErrors` captures the exact
 * pageerror class, and we additionally assert the client error boundary never renders.
 *
 * The companion static guardrail lives in
 * `__tests__/architecture/no-safe-sdk-in-public-community-routes.test.ts`; this is the runtime
 * half of the same boundary, plus the non-happy-paths the static test cannot exercise.
 */

const SLUG = MOCK_COMMUNITIES.optimism.slug; // real staging slug so SSR data fetch succeeds

const CHUNK_INIT_ERROR_RE = /Class extends value undefined|is not a constructor/i;
const CLIENT_ERROR_BOUNDARY_RE = /Application error: a client-side exception has occurred/i;

/** Assert neither the chunk-init pageerror nor the Next client error boundary surfaced. */
async function assertNoChunkCrash(page: import("@playwright/test").Page, jsErrors: string[]) {
  const chunkError = jsErrors.find((msg) => CHUNK_INIT_ERROR_RE.test(msg));
  expect(chunkError, `chunk-init crash leaked: ${chunkError}`).toBeUndefined();

  // The production client error boundary renders this copy into the DOM; it must be absent.
  await expect(page.getByText(CLIENT_ERROR_BOUNDARY_RE)).toHaveCount(0);
}

test.describe("Regression #1625 — public community routes never bundle the Safe SDK", () => {
  test("T-1625-01: hard-navigating /updates does not trigger the chunk-order crash", async ({
    page,
    withApiMocks,
  }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks({
      [`**/v2/communities/${SLUG}`]: mockJson(MOCK_COMMUNITIES.optimism),
      [`**/v2/communities/${SLUG}/project-updates**`]: mockJson({
        payload: [],
        pagination: { page: 1, limit: 25, total: 0 },
      }),
      [`**/v2/communities/${SLUG}/projects**`]: mockJson({
        payload: [],
        pagination: { page: 1, limit: 25, total: 0 },
      }),
      [`**/v2/communities/${SLUG}/milestone-allocations**`]: mockJson([]),
    });

    // Hard navigation (full document load) is the exact trigger the crash depended on.
    await page.goto(`/community/${SLUG}/updates`, GOTO_OPTIONS);
    await waitForPageReady(page);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });
    await assertNoChunkCrash(page, jsErrors);

    // A second hard reload re-runs chunk initialization order — the production-only hazard.
    await page.reload(GOTO_OPTIONS);
    await waitForPageReady(page);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });
    await assertNoChunkCrash(page, jsErrors);
  });

  test("T-1625-02: hard-navigating /financials does not trigger the chunk-order crash", async ({
    page,
    withApiMocks,
  }) => {
    const jsErrors = collectJsErrors(page);

    // /financials is the route that imports the payout-disbursement service that used to drag
    // in the Safe SDK — the highest-risk surface for this regression.
    await withApiMocks({
      [`**/v2/communities/${SLUG}`]: mockJson(MOCK_COMMUNITIES.optimism),
    });

    await page.goto(`/community/${SLUG}/financials`, GOTO_OPTIONS);
    await waitForPageReady(page);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });
    await assertNoChunkCrash(page, jsErrors);

    await page.reload(GOTO_OPTIONS);
    await waitForPageReady(page);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });
    await assertNoChunkCrash(page, jsErrors);
  });

  test("T-1625-03: client-side route change into /updates stays crash-free", async ({
    page,
    withApiMocks,
  }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks({
      [`**/v2/communities/${SLUG}`]: mockJson(MOCK_COMMUNITIES.optimism),
      [`**/v2/communities/${SLUG}/project-updates**`]: mockJson({
        payload: [],
        pagination: { page: 1, limit: 25, total: 0 },
      }),
      [`**/v2/communities/${SLUG}/projects**`]: mockJson({
        payload: [],
        pagination: { page: 1, limit: 25, total: 0 },
      }),
      [`**/v2/communities/${SLUG}/milestone-allocations**`]: mockJson([]),
    });

    // Land on a sibling route first, then navigate to /updates within the SPA so the chunk
    // graph is exercised both ways (soft nav can resolve chunks in a different order than a
    // cold load).
    await page.goto(`/community/${SLUG}/projects`, GOTO_OPTIONS);
    await waitForPageReady(page);

    await page.goto(`/community/${SLUG}/updates`, GOTO_OPTIONS);
    await waitForPageReady(page);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });
    await assertNoChunkCrash(page, jsErrors);
  });

  test("T-1625-04: bad community slug degrades gracefully, not a chunk crash", async ({
    page,
    withApiMocks,
  }) => {
    const jsErrors = collectJsErrors(page);

    // No mock for this slug — SSR resolves it as missing. The route must render a handled
    // not-found / error state (body present) and must NOT throw the Safe-SDK init error.
    await withApiMocks();

    await page.goto("/community/__definitely-not-a-real-community__/financials", GOTO_OPTIONS);
    await waitForPageReady(page);

    await expect(page.locator("body")).toBeVisible();
    const chunkError = jsErrors.find((msg) => CHUNK_INIT_ERROR_RE.test(msg));
    expect(chunkError, `chunk-init crash leaked: ${chunkError}`).toBeUndefined();
  });
});

test.describe("Regression #1625 — /community listing redirect", () => {
  test("T-1625-05: bare /community permanently redirects to /communities", async ({
    page,
    withApiMocks,
  }) => {
    await withApiMocks();

    await page.goto("/community", GOTO_OPTIONS);
    await waitForPageReady(page);

    // app/community/page.tsx -> permanentRedirect(PAGES.COMMUNITIES)
    await expect(page).toHaveURL(/\/communities\/?$/);
    await expect(page.locator("body")).toBeVisible();
  });
});
