import type { Page, Route } from "@playwright/test";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { waitForPageReady } from "../../helpers/navigation";

/**
 * Browser-automation coverage for PR #1617 — AIEvaluationButton migrated to
 * `useRunAIEvaluation` (useMutation) + unified `extractApiErrorMessage`.
 *
 * These tests drive the REAL component through the admin Application Detail
 * route and intercept the evaluate endpoints to exercise paths a happy-path
 * test would miss:
 *   - in-flight pending state (disabled / aria-busy / spinner / label)
 *   - double-submit guard while the mutation is pending
 *   - backend domain error surfaced verbatim in the toast (not a generic msg)
 *   - network error fallback
 *   - cache-invalidation refresh (verdict appears without manual reload)
 *   - internal vs external endpoint dispatch (isInternal routing)
 *
 * Locator note: the component intentionally swaps the button's accessible name
 * between idle ("Run AI evaluation") and busy ("AI evaluation in progress"), so
 * pending-state assertions target the busy name, not the idle one.
 */

const COMMUNITY = "optimism";
const PROGRAM_ID = "program-001";
const REF = "APP-2024-001";
const ROUTE = `/community/${COMMUNITY}/manage/funding-platform/${PROGRAM_ID}/applications/${REF}`;

// Regex matchers (anchored) avoid glob ambiguity around the shared
// `…/evaluate` vs `…/evaluate-internal` prefix.
const EVALUATE_URL = /\/v2\/funding-applications\/APP-2024-001\/evaluate(\?|$)/;
const EVALUATE_INTERNAL_URL = /\/v2\/funding-applications\/APP-2024-001\/evaluate-internal(\?|$)/;
const APPLICATION_URL = /\/v2\/funding-applications\/APP-2024-001(\?|$)/;

interface AppOverrides {
  externalEvaluation?: string;
  internalEvaluation?: string;
}

/** A funding application detail payload, optionally carrying evaluations. */
function appPayload(overrides: AppOverrides = {}) {
  return {
    _id: "app-001",
    id: REF,
    referenceNumber: REF,
    projectUID: "project-uid-001",
    programId: PROGRAM_ID,
    communitySlug: COMMUNITY,
    status: "pending",
    applicant: { address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc" },
    answers: [{ fieldName: "title", value: "My Project" }],
    aiEvaluation: overrides.externalEvaluation
      ? { evaluation: overrides.externalEvaluation, updatedAt: "2024-02-02T00:00:00.000Z" }
      : undefined,
    internalAIEvaluation: overrides.internalEvaluation
      ? { evaluation: overrides.internalEvaluation, updatedAt: "2024-02-02T00:00:00.000Z" }
      : undefined,
    createdAt: "2024-02-01T00:00:00.000Z",
    updatedAt: "2024-02-01T00:00:00.000Z",
  };
}

/** Navigate to the application detail page and open the AI Analysis tab. */
async function openAIAnalysis(page: Page) {
  await page.goto(ROUTE);
  await waitForPageReady(page);
  const tab = page
    .getByRole("tab", { name: /AI Analysis/i })
    .or(page.getByRole("button", { name: /AI Analysis/i }));
  await tab.first().click();
}

const idleExternal = (page: Page) =>
  page.getByRole("button", { name: "Run AI evaluation", exact: true });
const busyExternal = (page: Page) =>
  page.getByRole("button", { name: "AI evaluation in progress", exact: true });
const idleInternal = (page: Page) =>
  page.getByRole("button", { name: "Run Internal AI evaluation", exact: true });

test.describe("AIEvaluationButton (PR #1617)", () => {
  test.beforeEach(async ({ page, withApiMocks, loginAs }) => {
    // Low-precedence catch-all so no unmocked indexer call escapes to real
    // staging and slows the success-path refetch. Registered first → every
    // later, more specific route wins; anything left returns an empty body fast.
    await page.route(/\/v2\//, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
    );

    // `TokenManager.getToken()` only takes its synchronous E2E-bypass path when
    // `window.Cypress` is set; under Playwright it otherwise falls through to
    // `waitForInstance()`, which never resolves without a real Privy session and
    // wedges the apiClient request interceptor (and thus the mutation's
    // `onSuccess` refetch). Shim both so every authenticated request resolves.
    await page.addInitScript(() => {
      (window as unknown as { Cypress?: boolean }).Cypress = true;
      localStorage.setItem("privy:token", "e2e-test-token");
    });

    // superAdmin → passes FundingPlatformGuard + isAdmin (PROGRAM_ADMIN+),
    // so the AI Analysis tab and its Run button render.
    await withApiMocks({
      [`**/v2/funding-program-configs/${PROGRAM_ID}`]: mockJson(
        createMockProgram({ programId: PROGRAM_ID })
      ),
    });
    await loginAs("superAdmin", { communityId: COMMUNITY });
  });

  test("happy path: pending state, success toast, and cache-refreshed verdict", async ({
    page,
  }) => {
    let evaluated = false;

    // The detail query returns the verdict only AFTER evaluate has run — proving
    // the new verdict surfaces via cache invalidation, not just optimistic copy.
    // `evaluation` is a JSON string (the display JSON-parses it).
    await page.route(APPLICATION_URL, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          evaluated
            ? appPayload({
                externalEvaluation: JSON.stringify({
                  summary: "Strong proposal, recommend funding.",
                }),
              })
            : appPayload()
        ),
      })
    );

    // Delay the evaluate response so the pending state is observable while the
    // assertions below poll.
    await page.route(EVALUATE_URL, async (route: Route) => {
      await new Promise((r) => setTimeout(r, 800));
      evaluated = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, referenceNumber: REF, evaluation: "ok" }),
      });
    });

    await openAIAnalysis(page);

    await expect(idleExternal(page)).toBeVisible();
    await expect(idleExternal(page)).toBeEnabled();

    await idleExternal(page).click();

    // While pending: the busy button is shown, disabled, aria-busy, loading label.
    await expect(busyExternal(page)).toBeVisible();
    await expect(busyExternal(page)).toBeDisabled();
    await expect(busyExternal(page)).toHaveAttribute("aria-busy", "true");
    await expect(page.getByText(/Running AI Evaluation\.\.\./i)).toBeVisible();

    await expect(page.getByText(/AI evaluation completed successfully/i)).toBeVisible();
    // Verdict propagated through the invalidated cache into the display.
    await expect(page.getByText(/Strong proposal, recommend funding/i)).toBeVisible();
    // Button settled back to idle.
    await expect(idleExternal(page)).toBeEnabled();
  });

  test("backend error message is surfaced verbatim in the toast", async ({ page }) => {
    await page.route(APPLICATION_URL, mockJson(appPayload()));

    const backendMessage = "Program has no AI evaluation prompt configured";
    await page.route(EVALUATE_URL, (route: Route) =>
      route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ message: backendMessage }),
      })
    );

    await openAIAnalysis(page);
    await idleExternal(page).click();

    // extractApiErrorMessage must prefer response.data.message over generic copy.
    await expect(page.getByText(backendMessage)).toBeVisible();
    // Button recovers (not stuck disabled) after the error.
    await expect(idleExternal(page)).toBeEnabled();
  });

  test("network failure falls back without leaking a stuck spinner", async ({ page }) => {
    await page.route(APPLICATION_URL, mockJson(appPayload()));
    await page.route(EVALUATE_URL, (route: Route) => route.abort("failed"));

    await openAIAnalysis(page);
    await idleExternal(page).click();

    // Some error toast appears and the button re-enables.
    await expect(page.getByText(/failed|error|network/i).first()).toBeVisible();
    await expect(idleExternal(page)).toBeEnabled();
  });

  test("double-click while pending fires only one evaluate request", async ({ page }) => {
    await page.route(APPLICATION_URL, mockJson(appPayload()));

    let callCount = 0;
    await page.route(EVALUATE_URL, async (route: Route) => {
      callCount += 1;
      // Hold the response ~2s so the second (guarded) click happens while the
      // first mutation is still pending.
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, referenceNumber: REF, evaluation: "ok" }),
      });
    });

    await openAIAnalysis(page);
    await idleExternal(page).click();

    // Now pending — try to fire again. Force-click bypasses pointer-events to
    // prove the handler's own `isPending` guard (not just CSS) blocks re-entry.
    await expect(busyExternal(page)).toBeDisabled();
    await busyExternal(page)
      .click({ force: true })
      .catch(() => {});

    await expect(page.getByText(/completed successfully/i)).toBeVisible();
    expect(callCount).toBe(1);
  });

  test("internal sub-tab dispatches to the internal endpoint, not external", async ({ page }) => {
    await page.route(APPLICATION_URL, mockJson(appPayload()));

    const evaluateRequests: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("evaluate")) evaluateRequests.push(`${req.method()} ${url}`);
    });

    let externalCalled = false;
    let internalCalled = false;
    await page.route(EVALUATE_URL, (route: Route) => {
      externalCalled = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, referenceNumber: REF, evaluation: "ok" }),
      });
    });
    await page.route(EVALUATE_INTERNAL_URL, (route: Route) => {
      internalCalled = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, referenceNumber: REF, evaluation: "ok" }),
      });
    });

    await openAIAnalysis(page);

    // Switch to the Internal sub-tab (no internal eval yet → first-run button).
    await page.getByRole("button", { name: /Internal Evaluation/i }).click();

    await expect(idleInternal(page)).toBeVisible();
    await idleInternal(page).click();

    await expect(page.getByText(/Internal AI evaluation completed successfully/i)).toBeVisible();
    expect(internalCalled, `evaluate requests seen: ${evaluateRequests.join(", ")}`).toBe(true);
    expect(externalCalled).toBe(false);
  });
});
