import type { Page, Route } from "@playwright/test";
import { expect, mock404, mockError, mockJson, test } from "../fixtures";

/** A Playwright route handler, mirroring the fixtures' internal signature. */
type RouteHandler = (route: Route) => Promise<void> | void;

import { assertNoJsErrors, collectJsErrors } from "../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../helpers/navigation";

/**
 * Browser-automation coverage for the nonprofit-research onboarding wizard
 * (issue #1587). The wizard's whole point in this PR is that its step state,
 * focus order, and error state are *programmatically determinable*, so these
 * specs assert against the accessibility tree (aria-current, :focus, role=alert,
 * accessible button names) rather than against styling — exactly the signals an
 * automated QA agent reads.
 *
 * The app route was renamed donor-research -> nonprofit-research, but the
 * indexer endpoint is still `/v2/donor-research/me` (GET = load advisor,
 * POST = onboard), so the API mocks below intercept that path and branch on
 * the HTTP method.
 */

const ONBOARDING_URL = "/nonprofit-research/onboarding";
const ME_ENDPOINT = "**/v2/donor-research/me";

// Redirect/error scenarios cross a route boundary (the index route cold-compiles
// on first navigation under `next dev`) and the error path waits out React
// Query's retry backoff before throwing. Both are correct, just slower than the
// default 5s expect timeout — against a production build (CI) they resolve fast.
// The ceiling is generous because the first cross-route navigation under
// `next dev` can spend tens of seconds compiling while parallel workers
// contend for CPU; on a warm/production server these settle near-instantly.
const SLOW_NAV_TIMEOUT = 45_000;

/** A fully-onboarded advisor row, used to exercise the "already onboarded" redirect. */
const EXISTING_ADVISOR = {
  id: "advisor-1",
  displayName: "Avery Boutique",
  orgName: "Boutique Philanthropy LLC",
  timezone: "America/Los_Angeles",
};

/**
 * Builds a single route handler for `/v2/donor-research/me` that dispatches on
 * HTTP method — Playwright matches by URL glob, but GET (load) and POST
 * (onboard) hit the same path. Defaults keep GET = 404 (not onboarded, wizard
 * renders) and leave POST unhandled unless a test opts in.
 */
function meRoute(opts: { get?: RouteHandler; post?: RouteHandler }): RouteHandler {
  return (route: Route) => {
    const method = route.request().method();
    if (method === "POST") {
      return (opts.post ?? mockError(500, "no POST handler"))(route);
    }
    return (opts.get ?? mock404("advisor not onboarded"))(route);
  };
}

/** Reads the label of the stepper item carrying aria-current="step". */
const currentStep = (page: Page) => page.locator('[aria-current="step"]').first();

/** Walks welcome -> sample -> form so a test can start on the final form step. */
async function gotoFormStep(page: Page) {
  await page.getByRole("button", { name: /continue to sample report/i }).click();
  await page.getByRole("button", { name: /continue to setup/i }).click();
  await expect(currentStep(page)).toHaveText(/3\. Get started/i);
}

test.describe("Nonprofit research — onboarding wizard (#1587)", () => {
  test("DR-ONB-01: walks welcome -> sample -> form with aria-current tracking the active step", async ({
    page,
    loginAs,
    withApiMocks,
  }) => {
    const jsErrors = collectJsErrors(page);

    await loginAs("applicant");
    await withApiMocks({
      [ME_ENDPOINT]: mock404("advisor not onboarded"),
    });

    await page.goto(ONBOARDING_URL, GOTO_OPTIONS);
    await waitForPageReady(page);

    const progress = page.getByRole("navigation", { name: /onboarding progress/i });
    await expect(progress).toBeVisible();

    // Step 1.
    await expect(currentStep(page)).toHaveText(/1\. Welcome/i);
    await page.getByRole("button", { name: /continue to sample report/i }).click();

    // Step 2 — the dogfood agent reported being "stuck" here; aria-current
    // makes the transition observable.
    await expect(currentStep(page)).toHaveText(/2\. Sample report/i);
    await expect(page.getByRole("heading", { name: /what a report looks like/i })).toBeVisible();
    await page.getByRole("button", { name: /continue to setup/i }).click();

    // Step 3 — aria-current flips to "Get started", proving the Continue
    // click advanced the wizard.
    await expect(currentStep(page)).toHaveText(/3\. Get started/i);
    await expect(page.getByRole("heading", { name: /get started/i })).toBeVisible();

    assertNoJsErrors(jsErrors);
  });

  test("DR-ONB-02: empty required field surfaces an announced validation error and blocks advance", async ({
    page,
    loginAs,
    withApiMocks,
  }) => {
    // If the form ever POSTs while the required field is empty the test fails:
    // validation must short-circuit the mutation entirely.
    let postCount = 0;
    await loginAs("applicant");
    await withApiMocks({
      [ME_ENDPOINT]: meRoute({
        post: (route) => {
          postCount += 1;
          return mockJson(EXISTING_ADVISOR)(route);
        },
      }),
    });

    await page.goto(ONBOARDING_URL, GOTO_OPTIONS);
    await waitForPageReady(page);
    await gotoFormStep(page);

    // Submit with the required Display name empty -> announced error, no advance.
    await page.getByRole("button", { name: /^continue$/i }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: /display name is required/i })
    ).toBeVisible();
    // The invalid input is flagged for assistive tech.
    await expect(page.getByLabel(/display name/i)).toHaveAttribute("aria-invalid", "true");
    // Still on the form step, and the mutation never fired.
    await expect(currentStep(page)).toHaveText(/3\. Get started/i);
    await expect(page).toHaveURL(/\/nonprofit-research\/onboarding/);
    expect(postCount).toBe(0);
  });

  test("DR-ONB-03: an already-onboarded advisor is redirected away from the wizard", async ({
    page,
    loginAs,
    withApiMocks,
  }) => {
    test.slow(); // crosses into the cold-compiled index route under `next dev`
    await loginAs("applicant");
    await withApiMocks({
      // 200 + advisor row -> the effect redirects to the section index.
      [ME_ENDPOINT]: mockJson(EXISTING_ADVISOR),
      "**/v2/donor-research/me/counters": mockJson({ status: "ok", channels: {} }),
      "**/v2/donor-research/reports**": mockJson({ payload: [], pagination: { total: 0 } }),
    });

    await page.goto(ONBOARDING_URL, GOTO_OPTIONS);

    // The wizard must NOT settle on the onboarding URL — it bounces to the index.
    await expect(page).toHaveURL(/\/nonprofit-research(?!\/onboarding)/, {
      timeout: SLOW_NAV_TIMEOUT,
    });
    await expect(page.getByRole("navigation", { name: /onboarding progress/i })).toHaveCount(0);
  });

  test("DR-ONB-04: a failed advisor load renders the error boundary, not the wizard", async ({
    page,
    loginAs,
    withApiMocks,
  }) => {
    test.slow(); // waits out React Query's retry backoff before the throw
    await loginAs("applicant");
    await withApiMocks({
      // A non-404 failure must throw -> caught by the route error boundary.
      [ME_ENDPOINT]: mockError(500, "indexer exploded"),
    });

    await page.goto(ONBOARDING_URL, GOTO_OPTIONS);
    await waitForPageReady(page);

    await expect(page.getByRole("heading", { name: /something went wrong/i })).toBeVisible({
      timeout: SLOW_NAV_TIMEOUT,
    });
    await expect(page.getByRole("navigation", { name: /onboarding progress/i })).toHaveCount(0);
  });

  test("DR-ONB-05: focus moves to the active step heading on every transition (WCAG 2.4.3)", async ({
    page,
    loginAs,
    withApiMocks,
  }) => {
    await loginAs("applicant");
    await withApiMocks({ [ME_ENDPOINT]: mock404("advisor not onboarded") });

    await page.goto(ONBOARDING_URL, GOTO_OPTIONS);
    await waitForPageReady(page);

    // Forward: each Continue should land focus on the next step's heading.
    await page.getByRole("button", { name: /continue to sample report/i }).click();
    await expect(page.locator(":focus")).toHaveText(/what a report looks like/i);

    await page.getByRole("button", { name: /continue to setup/i }).click();
    await expect(page.locator(":focus")).toHaveText(/get started/i);

    // Backward: Back should return focus to the previous step's heading too.
    await page.getByRole("button", { name: /^back$/i }).click();
    await expect(page.locator(":focus")).toHaveText(/what a report looks like/i);
  });

  test("DR-ONB-06: navigating back preserves the data already typed into the form", async ({
    page,
    loginAs,
    withApiMocks,
  }) => {
    await loginAs("applicant");
    await withApiMocks({ [ME_ENDPOINT]: mock404("advisor not onboarded") });

    await page.goto(ONBOARDING_URL, GOTO_OPTIONS);
    await waitForPageReady(page);
    await gotoFormStep(page);

    await page.getByLabel(/display name/i).fill("Avery Boutique");
    await page.getByLabel(/organization/i).fill("Boutique Philanthropy LLC");

    // Back to the sample step, then forward again.
    await page.getByRole("button", { name: /^back$/i }).click();
    await expect(currentStep(page)).toHaveText(/2\. Sample report/i);
    await page.getByRole("button", { name: /continue to setup/i }).click();

    // react-hook-form state lives on the parent, so the values survive the
    // section unmount/remount.
    await expect(page.getByLabel(/display name/i)).toHaveValue("Avery Boutique");
    await expect(page.getByLabel(/organization/i)).toHaveValue("Boutique Philanthropy LLC");
  });

  test("DR-ONB-07: a malformed timezone is rejected with the IANA-format guidance", async ({
    page,
    loginAs,
    withApiMocks,
  }) => {
    let postCount = 0;
    await loginAs("applicant");
    await withApiMocks({
      [ME_ENDPOINT]: meRoute({
        post: (route) => {
          postCount += 1;
          return mockJson(EXISTING_ADVISOR)(route);
        },
      }),
    });

    await page.goto(ONBOARDING_URL, GOTO_OPTIONS);
    await waitForPageReady(page);
    await gotoFormStep(page);

    await page.getByLabel(/display name/i).fill("Avery Boutique");
    await page.getByLabel(/timezone/i).fill("not a timezone!");
    await page.getByRole("button", { name: /^continue$/i }).click();

    await expect(page.getByRole("alert").filter({ hasText: /iana timezone/i })).toBeVisible();
    await expect(page.getByLabel(/timezone/i)).toHaveAttribute("aria-invalid", "true");
    expect(postCount).toBe(0);
  });

  test("DR-ONB-08: a server error on submit is announced and keeps the user on the form", async ({
    page,
    loginAs,
    withApiMocks,
  }) => {
    await loginAs("applicant");
    await withApiMocks({
      [ME_ENDPOINT]: meRoute({
        get: mock404("advisor not onboarded"),
        post: mockError(500, "could not onboard"),
      }),
    });

    await page.goto(ONBOARDING_URL, GOTO_OPTIONS);
    await waitForPageReady(page);
    await gotoFormStep(page);

    await page.getByLabel(/display name/i).fill("Avery Boutique");
    await page.getByRole("button", { name: /^continue$/i }).click();

    // The mutation error block is an announced live region.
    await expect(page.getByRole("alert")).toBeVisible();
    // The failure does not navigate away — the user can retry.
    await expect(page).toHaveURL(/\/nonprofit-research\/onboarding/);
    await expect(currentStep(page)).toHaveText(/3\. Get started/i);
  });

  test("DR-ONB-09: a successful submit onboards the advisor and redirects to the index", async ({
    page,
    loginAs,
    withApiMocks,
  }) => {
    test.slow(); // success redirect lands on the cold-compiled index route
    let onboarded = false;
    await loginAs("applicant");
    await withApiMocks({
      [ME_ENDPOINT]: meRoute({
        get: mock404("advisor not onboarded"),
        post: (route) => {
          onboarded = true;
          return mockJson(EXISTING_ADVISOR)(route);
        },
      }),
      "**/v2/donor-research/me/counters": mockJson({ status: "ok", channels: {} }),
      "**/v2/donor-research/reports**": mockJson({ payload: [], pagination: { total: 0 } }),
    });

    await page.goto(ONBOARDING_URL, GOTO_OPTIONS);
    await waitForPageReady(page);
    await gotoFormStep(page);

    await page.getByLabel(/display name/i).fill("Avery Boutique");
    await page.getByRole("button", { name: /^continue$/i }).click();

    await expect(page).toHaveURL(/\/nonprofit-research(?!\/onboarding)/, {
      timeout: SLOW_NAV_TIMEOUT,
    });
    expect(onboarded).toBe(true);
  });

  test("DR-ONB-10: each step exposes a distinct accessible Continue name (WCAG 2.5.3)", async ({
    page,
    loginAs,
    withApiMocks,
  }) => {
    await loginAs("applicant");
    await withApiMocks({ [ME_ENDPOINT]: mock404("advisor not onboarded") });

    await page.goto(ONBOARDING_URL, GOTO_OPTIONS);
    await waitForPageReady(page);

    // Step 1's advance control is uniquely named.
    await expect(page.getByRole("button", { name: /continue to sample report/i })).toHaveCount(1);
    await page.getByRole("button", { name: /continue to sample report/i }).click();

    // Step 2's advance control has a different accessible name.
    await expect(page.getByRole("button", { name: /continue to setup/i })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /continue to sample report/i })).toHaveCount(0);
  });
});
